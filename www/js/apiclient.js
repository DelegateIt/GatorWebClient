"use strict";

var GAT = GAT || {};

var has = function(obj, property) {
    return obj.hasOwnProperty(property);
};

GAT.webapi = (function() {
    "use strict";
    var s = {};

    var debug = true;

    var notify = function(future, futureData, success, logMsg, logData, noLog) {
        if (!noLog) {
            var logLevel = success ? "debug" : "warning";
            GAT.utils.logger.log(logLevel, logMsg, logData);
        }
        if (future !== null)
            future.notify(futureData, success);
    };

    var formatUrl = function(components, query) {
        var custom = GAT.config.apiUrl + "/";
        for (var i = 0; i < components.length; i++) {
            custom += encodeURIComponent(components[i]) + "/";
        }
        custom = custom.substring(0, custom.length - 1);
        if (GAT.auth.isLoggedIn())
            query["token"] = GAT.auth.getLoggedInUser().apiToken;
        var querystr = "";
        Object.keys(query).forEach(key => {
            if (querystr.length == 0)
                querystr += "?";
            else
                querystr += "&";
            querystr += encodeURIComponent(key) + "=" + encodeURIComponent(query[key]);
        });
        custom += querystr;
        return custom;
    };

    var handleResponse = function(httpStatus, responseText, url, future, noLog) {
        try {
            var rsp = JSON.parse(responseText);
            var success = "result" in rsp && rsp.result === 0;
            var logMsg = success ? "Received API response: " + url : rsp.error_message;
            notify(future, rsp, success, logMsg, {"url": url, "response": rsp}, noLog);
            if (rsp.result === 12)
                GAT.auth.logout();
        } catch(e) {
            var data = {
                "exception": e,
                "error_msg": "The server sent a malformed response"
            };
            notify(future, data, false, data.error_message, data, noLog);
        }
    };

    var sendRestApiReq = function(method, urlComponents, data, query, noLog) {
        noLog = (typeof(noLog) === "undefined") ? false : noLog;
        query = (typeof(query) === "undefined") ? {} : query;
        var url = formatUrl(urlComponents, query);
        var future = new GAT.utils.Future();
        var http = new XMLHttpRequest();

        http.open(method, url, true);
        http.setRequestHeader("Content-Type", "application/json");

        http.onreadystatechange = function() {
            if (http.readyState == 4) {
                handleResponse(http.status, http.responseText, url, future, noLog);
            }
        };

        notify(null, null, true, "Sent API request: " + url, {"url": url, "req": data}, noLog);

        if (typeof(data) !== "undefined" && data !== null)
            http.send(JSON.stringify(data));
        else
            http.send();
        return future;
    };

    s.getTransactionsWithStatus = function(transStatus) {
        var components = ["core", "get_transactions_with_status", transStatus];
        return sendRestApiReq("GET", components);
    };

    s.getTransaction = function(transactionId) {
        var components = ["core", "transaction", transactionId];
        return sendRestApiReq("GET", components);
    };

    s.loadUsersTransactions = function(type, userId) {
        var keyName = (type == "customer") ? "customer_uuid" : "delegator_uuid";
        var query = {};
        query[keyName] = userId;
        var components = ["core", "transaction"];
        return sendRestApiReq("GET", components, null, query);
    };

    s.updateTransaction = function(transactionId, delegatorId, transStatus, receipt) {
        var components = ["core", "transaction", transactionId];
        var httpData = {};
        if (delegatorId !== null)
            httpData["delegator_uuid"] = delegatorId;
        if (transStatus !== null)
            httpData["status"] = transStatus;
        if (receipt !== null)
            httpData["receipt"] = receipt;
        return sendRestApiReq("PUT", components, httpData);
    };

    s.getCustomer = function(customerId) {
        var components = ["core", "customer", customerId];
        return sendRestApiReq("GET", components);
    };

    s.sendMessage = function(transactionId, msg, fromCustomer, type) {
        var components = ["core", "send_message", transactionId];
        var httpData = {
            "type": type,
            "content": msg,
            "from_customer": fromCustomer
        };
        return sendRestApiReq("POST", components, httpData);
    };

    s.getMessages = function(transactionId) {
        var components = ["core", "get_messages", transactionId];
        return sendRestApiReq("GET", components);
    };

    s.getDelegator = function(delegatorId) {
        var components = ["core", "delegator", delegatorId];
        return sendRestApiReq("GET", components);
    };

    s.getDelegatorList = function() {
        var components = ["core", "delegator"];
        return sendRestApiReq("GET", components);
    };

    s.findUnhelpedTransaction = function(delegatorId) {
        var components = ["core", "assign_transaction", delegatorId];
        return sendRestApiReq("GET", components);
    };

    s.login = function(type, fbuser_id, fbuser_token) {
        var components = ["core", "login", type];
        var httpData = {
            "fbuser_id": fbuser_id,
            "fbuser_token": fbuser_token
        };
        return sendRestApiReq("POST", components, httpData, {}, true);
    };

    s.createDelegator = function(firstName, lastName, phone, email, fbuserId, fbuserToken) {
        var components = ["core", "delegator"];
        var httpData = {
            "first_name": firstName,
            "last_name": lastName,
            "phone_number": phone,
            "email": email,
            "fbuser_id": fbuserId,
            "fbuser_token": fbuserToken
        };
        return sendRestApiReq("POST", components, httpData);
    };

    return s;
})();
