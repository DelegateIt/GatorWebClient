var GAT = GAT || {};
var namer = namer || {};

GAT.customer = (function() {
  var s = {};

  s.cache = {};

  var loadInProgress = {}; //{customerId: Future}

  var loader = new GAT.utils.BackgroundLoader();

  var Customer = function() {
    this.name = null;
    this.id = null;
    this.phone = null;
    this.email = null;
    this.transactionIds = [];
    this.autoGenName = false;
  };

  var generateName = function(customerId) {
    return namer.make(customerId);
  };

  var updateFromResp = function(fullresp) {
    var resp = ('customer' in fullresp) ? fullresp.customer : fullresp;
    var customer = (resp.uuid in s.cache) ? s.cache[resp.uuid] : new Customer();
    customer.id = resp.uuid;
    if ('first_name' in resp && 'last_name' in resp) {
      customer.name = resp.first_name + ' ' + resp.last_name;
      customer.autoGenName = false;
    } else {
      customer.name = generateName(resp.uuid);
      customer.autoGenName = true;
    }
    customer.phone = null;
    if ('phone_number' in resp) {
      customer.phone = resp.phone_number;
    }
    customer.email = null;
    if ('email' in resp) {
      customer.email = resp.email;
    }
    customer.transactionIds = [];
    if ('active_transaction_uuids' in resp) {
      customer.transactionIds = resp.active_transaction_uuids;
    }
    if ('inactive_transaction_uuids' in resp) {
      customer.transactionIds.push.apply(customer.transactionIds, resp.inactive_transaction_uuids);
    }
    s.cache[customer.id] = customer;
  };

  s.load = function(customerId) {
    if (customerId in loadInProgress) {
      return loadInProgress[customerId];
    }
    var future = new GAT.utils.Future();
    if (customerId in s.cache) {
      future.notify(s.cache[customerId], true);
    } else {
      loadInProgress[customerId] = future;
      loader.add(function() {
        return GAT.webapi.getCustomer(customerId).
        onSuccess(function(resp) {
          updateFromResp(resp);
          delete loadInProgress[customerId];
          future.notify(true, s.cache[customerId]);
        }).
        onError(function(resp) {
          delete loadInProgress[customerId];
          future.notify(false, resp);
        });
      });
    }
    return future;
  };

  s.deepLoad = function(customerId) {
    var load = function() {
      var customer = s.cache[customerId];
      GAT.transaction.loadList(customer.transactionIds);
    };

    if (customerId in s.cache) {
      load();
    } else {
      s.load(customerId).onSuccess(function() {
        load();
      });
    }
  };

  return s;
})();
