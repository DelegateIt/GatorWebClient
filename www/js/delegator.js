var GAT = GAT || {};

GAT.delegator = function() {
    var s = {};

    s.cache = {};

    var Delegator = function(name, id, phone, email) {
        this.name = name;
        this.id = id;
        this.phone = phone;
        this.email = email;
    };

    s.loadAssignedTransactions = function(delegatorId) {
        return GAT.webapi.getDelegator(delegatorId).
            onSuccess(function(resp) {
                var transactionIds = [];
                if ("active_transaction_uuids" in resp)
                    transactionIds = resp.active_transaction_uuids;
                if ("inactive_transaction_uuids" in resp)
                    transactionIds.push.apply(transactionIds, resp.inactive_transaction_uuids);
                for (var i in transactionIds) {
                    if (transactionIds[i] in GAT.transaction.cache)
                        continue;
                    GAT.transaction.load(transactionIds[i]);
                }
            });
    };

    s.assignUnhelpedTransaction = function(delegatorId) {
        var future = new GAT.utils.Future();
        GAT.webapi.findUnhelpedTransaction(delegatorId).
            onSuccess(function(resp) {
                GAT.transaction.load(resp.transaction_uuid).
                    onResponse(function(success, resp) {
                        future.notify(success, resp);
                    });
            }).
            onError(function(resp) {
                future.notify(false, {});
            });
        return future;
    };

    s.loadList = function() {
        return GAT.webapi.getDelegatorList().
            onSuccess(function(resp) {
                for (var i in resp.delegators) {
                    var dlg = resp.delegators[i];
                    s.cache[dlg.uuid] = parseDlgtResp(dlg);
                }
            });
    };

    var parseDlgtResp = function(resp) {
        return new Delegator(
            resp.first_name + " " + resp.last_name,
            resp.uuid,
            resp.phone_number,
            resp.email
        );
    };

    return s;
}();
