
var GAT = GAT || {};

GAT.auth = function() {
    var s = {};

    var User = function(id, type, apiToken) {
        this.id = id;
        this.type = type;
        this.apiToken = apiToken;
    };

    var user = null;

    s.onLogin = []; //[function, ...]
    s.onLogout = []; //[function, ...]

    s.isLoggedIn = function() {
        return user !== null;
    };

    s.setUser = function(u) {
        GAT.utils.logger.log("info", "Logging in delegator", u);
        user = u;
        for (var i in s.onLogin)
            s.onLogin[i]();
    };

    s.getLoggedInUser = function() {
        return user;
    };

    s.login = function(type, fbUserId, fbUserToken) {
        return GAT.webapi.login(type, fbUserId, fbUserToken).onSuccess(function(resp) {
            s.setUser(new User(resp.delegator.uuid, type, resp.token));
        });
    };

    s.loginDelegator = function() {
        var future = new GAT.utils.Future();
        FB.getLoginStatus(function(resp) {
            GAT.utils.logger.log("info", "Received fb login status", resp);
            if (resp.status === "connected") {
                var fbUserToken = resp.authResponse.accessToken;
                var fbUserId = resp.authResponse.userID;
                s.login("delegator", fbUserId, fbUserToken).
                  onResponse(function(success, resp) {
                      future.notify(resp, success);
                  });
            } else {
                future.notify(resp, false);
            }
        });
        return future;
    };

    s.logout = function() {
        GAT.utils.logger.log("info", "Logging out delegator", user);
        FB.logout(function(response) {});
        user = null;
        for (var i in s.onLogout)
            s.onLogout[i]();
    };

    return s;
}();

