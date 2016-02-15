var GAT = GAT || {};

GAT.delegator = function() {
    var s = {};

    s.cache = {};

    var loadListFuture = null;

    var Delegator = function(name, id, phone, email) {
        this.name = name;
        this.id = id;
        this.phone = phone;
        this.email = email;
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
        loadListFuture = GAT.webapi.getDelegatorList().
            onSuccess(function(resp) {
                for (var i in resp.delegators) {
                    var dlg = resp.delegators[i];
                    parseDlgtResp(dlg);
                }
            });
        return loadListFuture;
    };

    s.getLoadListFuture = function() {
        return loadListFuture;
    };

    var parseDlgtResp = function(resp) {
        if (!(resp.uuid in s.cache))
            s.cache[resp.uuid] = new Delegator();
        resp = ("delegator" in resp) ? resp["delegator"] : resp;
        var delegator = s.cache[resp.uuid];
        delegator.name = resp.first_name + " " + resp.last_name;
        delegator.id = resp.uuid,
        delegator.phone = resp.phone_number,
        delegator.email = resp.email
    };

    return s;
}();
