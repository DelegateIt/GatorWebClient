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
                        if (debug)
                            console.log("API response", rsp);
                        if (rsp.result !== 0) {
                            console.log("API error", rsp);
                            future.notifyError(rsp);
                        } else {
                            future.notify(rsp);
                        }
                    } catch(e) {
                        console.log("API response parse error", e);
                        future.notifyError(e.toString());
                    }
                } else {
                    console.log("API HTTP error", http.status, http.responseText);
                    future.notifyError("HTTP " + http.status);
                }
            }
        };

        if (debug)
            console.log("API request", method, url, data);

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

    s.sendMessage = function(transactionId, msg) {
        var components = ["core", "send_message", transactionId];
        var httpData = {
            "platform_type": "web_client",
            "content": msg,
            "from_customer": false
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
