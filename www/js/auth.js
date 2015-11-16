
var GAT = GAT || {};

GAT.auth = function() {
    var s = {};

    var User = function(id, type, apiToken) {
        this.id = id;
        this.type = type;
        this.apiToken = apiToken;
    };

    var user = null;

    var FB = null;

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
        GAT.webapi.login(type, fbUserId, fbUserToken).onSuccess(function(resp) {
            s.setUser(new User(resp.delegator.uuid, type, resp.token));
        });
    };

    s.loginDelegator = function() {
        window.FB.getLoginStatus(function(resp) {
            GAT.utils.logger.log("info", "Received fb login status", resp);
            if (resp.status === "connected") {
                var fbUserToken = resp.authResponse.accessToken;
                var fbUserId = resp.authResponse.userID;
                s.login("delegator", fbUserId, fbUserToken);
            }
        });
    };

    s.logout = function() {
        GAT.utils.logger.log("info", "Logging out delegator", user);
        window.FB.logout(function(response) {});
        user = null;
        for (var i in s.onLogout)
            s.onLogout[i]();
    };

    return s;
}();

window.fbAsyncInit = function() {
    FB.init({
        appId          : '922040531214507',
        cookie         : true,
        xfbml          : true,
        version        : 'v2.5'
    });

    if (!GAT.auth.isLoggedIn())
        GAT.auth.loginDelegator();

};

//async load the fb sdk
(function(d) {
    var js = d.getElementById("fb-auth-inject");
    js.src = "//connect.facebook.net/en_US/sdk.js";
}(document));

