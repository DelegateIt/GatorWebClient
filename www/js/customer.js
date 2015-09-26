var GAT = GAT || {};

GAT.customer = function() {
    var s = {};

    s.cache = {};

    var loader = new GAT.utils.BackgroundLoader();
    //TODO autostart loader
    loader.start();

    var Customer = function() {
        this.name = null;
        this.id = null;
        this.phone = null;
        this.email = null;
        this.transactionIds = [];
    };

    var updateFromResp = function(resp) {
        var customer = (resp.uuid in s.cache) ? s.cache[resp.uuid] : new Customer();
        customer.id = resp.uuid;
        customer.name = "SMS user #" + resp.uuid.substring(0, 3);
        if ("first_name" in resp && "last_name" in resp)
            customer.name = resp.first_name + " "+ resp.last_name;
        customer.phone = null;
        if ("phone_number" in resp)
            customer.phone = resp.phone_number;
        customer.email = null;
        if ("email" in resp)
            customer.email = resp.email;
        customer.transactionIds = [];
        if ("active_transaction_uuids" in resp)
            customer.transactionIds = resp.active_transaction_uuids;
        if ("inactive_transaction_uuids" in resp)
            customer.transactionIds.push.apply(customer.transactionIds, resp.inactive_transaction_uuids);
        s.cache[customer.id] = customer;
    };

    s.load = function(customerId) {
        var future = new GAT.utils.Future();
        if (customerId in s.cache) {
            future.notify(s.cache[customerId], true);
        } else {
            loader.add(function() {
                return GAT.webapi.getCustomer(customerId).
                    onSuccess(function(resp) {
                        updateFromResp(resp);
                        future.notify(true, s.cache[customerId]);
                    }).
                    onError(function(resp) {
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
}();

