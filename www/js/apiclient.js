"use strict";

var GAT = GAT || {};

var has = function(obj, property) {
    return obj.hasOwnProperty(property);
};

GAT.webapi = function() {
    //TODO register bad responses ie. result != 0
    var s = {};

    var debug = true;

    s.getUrl = function() {
        if (GAT.delegator.isInTestMode())
            return "http://localhost:8000/";
        else
            return "http://backend-lb-125133299.us-west-2.elb.amazonaws.com/";
    };

    var notify = function(future, futureData, success, logMsg, logData) {
        var logLevel = success ? "debug" : "warning";
        GAT.utils.logger.log(logLevel, logMsg, logData);
        if (future !== null)
            future.notify(futureData, success);
    };

    var formatUrl = function(components) {
        var custom = s.getUrl();
        for (var i = 0; i < components.length; i++) {
            custom += encodeURIComponent(components[i]) + "/";
        }
        return custom.substring(0, custom.length - 1);
    };

    var sendRestApiReq = function(method, urlComponents, data) {
        var url = formatUrl(urlComponents);
        var future = new GAT.utils.Future();
        var http = new XMLHttpRequest();

        http.open(method, url, true);
        http.setRequestHeader("Content-Type", "application/json");

        http.onreadystatechange = function() {
            if (http.readyState == 4) {
                if (http.status == 200) {
                    try {
                        var rsp = JSON.parse(http.responseText);
                        var success = "result" in rsp && rsp.result === 0;
                        notify(future, rsp, success, "Received API response: " + url, {"url": url, "response": rsp});
                    } catch(e) {
                        var data = {
                            "exception": e,
                            "error_msg": "The server sent a malformed response"
                        };
                        notify(future, data, false, data.error_message, data);
                    }
                } else {
                    var data = {
                        "status": http.status,
                        "response": http.responseText,
                        "error_message": "The server responded with an error"
                    };
                    notify(future, data, false, data.error_message, data);
                }
            }
        };

        notify(null, null, true, "Sent API request: " + url, {"url": url, "req": data});

        if (typeof(data) !== "undefined")
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

    return s;
}();
