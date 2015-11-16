"use strict";

var GAT = GAT || {};

var has = function(obj, property) {
    return obj.hasOwnProperty(property);
};

GAT.webapi = function() {
    var s = {};

    var debug = true;

    var api_url = "";
    var notify_url = "";

    s.setApiMode = function(mode) {
        if (mode == "local") {
            api_url = "http://localhost:8000/";
            notify_url = "http://localhost:8060/";
        } else if (mode == "production"){
            //api_url = "http://backend-lb-125133299.us-west-2.elb.amazonaws.com/";
            api_url = "http://gator-api.elasticbeanstalk.com/";
            notify_url = "http://gator-ntfy.elasticbeanstalk.com/";
        } else if (mode == "test") {
            api_url = "http://test-gator-api.elasticbeanstalk.com/";
            notify_url = "http://test-gator-ntfy.elasticbeanstalk.com/";
        } else {
            throw mode + " - is not a valid mode";
        }
    };

    s.getApiUrl = function() {
        return api_url;
    };

    s.getNotifyUrl = function() {
        return notify_url;
    };

    var notify = function(future, futureData, success, logMsg, logData, noLog) {
        if (!noLog) {
            var logLevel = success ? "debug" : "warning";
            GAT.utils.logger.log(logLevel, logMsg, logData);
        }
        if (future !== null)
            future.notify(futureData, success);
    };

    var formatUrl = function(components) {
        var custom = s.getApiUrl();
        for (var i = 0; i < components.length; i++) {
            custom += encodeURIComponent(components[i]) + "/";
        }
        custom = custom.substring(0, custom.length - 1);
        if (GAT.auth.isLoggedIn())
            custom += "?token=" + encodeURIComponent(GAT.auth.getLoggedInUser().apiToken);
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

    var sendRestApiReq = function(method, urlComponents, data, noLog) {
        noLog = (typeof(noLog) === "undefined") ? false : noLog;
        var url = formatUrl(urlComponents);
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

    s.sendMessage = function(transactionId, msg, platformType, fromCustomer) {
        var components = ["core", "send_message", transactionId];
        var httpData = {
            "platform_type": platformType,
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
        return sendRestApiReq("POST", components, httpData);
    };

    s.setApiMode("local");

    return s;
}();
