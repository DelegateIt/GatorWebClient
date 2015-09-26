var GAT = GAT || {};

GAT.delegator = function() {
    var s = {};

    var Delegator = function(name, id, phone, email) {
        this.name = name;
        this.id = id;
        this.phone = phone;
        this.email = email;
        this.active = [];
        this.inactive = [];
    };

    s.onLogin = [];

    s.onLogout = [];

    s.everybody = {};

    s.me = null;

    s.isLoggedIn = function() {
        return s.me !== null;
    };

    s.login = function(delegatorId) {
        GAT.utils.logger.log("info", "Logging in delegator", delegatorId);
        if (delegatorId in s.everybody) {
            s.me = s.everybody[delegatorId];
            for (var i in s.onLogin)
                s.onLogin[i](delegatorId);
        } else {
            s.logout();
        }
    };

    s.logout = function() {
        GAT.utils.logger.log("info", "Logging out delegator", s.me);
        s.me = null;
        for (var i in s.onLogout)
            s.onLogout[i]();
    };

    s.loadList = function(callback) {
        return GAT.webapi.getDelegatorList().
            onSuccess(function(resp) {
                for (var i in resp.delegators) {
                    var dlg = resp.delegators[i];
                    s.everybody[dlg.uuid] = new Delegator(dlg.first_name + " " + dlg.last_name,
                            dlg.uuid, dlg.phone_number, dlg.email)
                }
            });
    };

    return s;
}();
