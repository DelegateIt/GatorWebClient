"use strict";

var GAT = GAT || {};

var has = function(obj, property) {
    return obj.hasOwnProperty(property);
};

GAT.webapi = function() {
    //TODO register bad responses ie. result != 0
    var s = {};

    var debug = true;

    var Future = function() {
        this._successCallback = function() { };
        this._errorCallback = function() { };

        this.onSuccess = function(callback) {
            this._successCallback = callback;
            if ("result" in this)
                this._successCallback(this.result);
            return this;
        };

        this.onError = function(callback) {
            this._errorCallback = callback;
            if ("error" in this)
                this._errorCallback(this.error);
            return this;
        };

        this.notify = function(response) {
            this.result = response;
            var callback = this._successCallback;
            GAT.view.updateAfter(function() {
                callback(response);
            });
        };

        this.notifyError = function(error) {
            var callback = this.errorCallback;
            this.error = error;
            GAT.view.updateAfter(function() {
                callback(error);
            });
        };
    };

    var formatUrl = function(components) {
        var url = "http://localhost:8000/";
        for (var i = 0; i < components.length; i++) {
            url += encodeURIComponent(components[i]) + "/";
        }
        return url.substring(0, url.length - 1);
    };

    var sendRestApiReq = function(method, urlComponents, data) {
        var url = formatUrl(urlComponents);
        var future = new Future();
        var http = new XMLHttpRequest();

        http.open(method, url, true);
        http.setRequestHeader("Content-Type", "application/json");

        http.onreadystatechange = function() {
            if (http.readyState == 4) {
                if (http.status == 200) {
                    try {
                        var rsp = JSON.parse(http.responseText);
                        if (debug)
                            console.log("RPC response", rsp);
                        future.notify(rsp);
                    } catch(e) {
                        if (debug)
                            console.log("RPC parse error", e);
                        future.notifyError(e.toString());
                    }
                } else {
                    if (debug)
                        console.log("RPC HTTP error", http.status, http.responseText);
                    future.notifyError("HTTP " + http.status);
                }
            }
        };

        if (debug)
            console.log("RPC request", method, url, data);

        if (typeof(data) !== "undefined")
            http.send(JSON.stringify(data));
        else
            http.send();
        return future;
    };

    s.getTransactionsWithStatus = function(transStatus) {
        var components = ["get_transactions_with_status", transStatus];
        return sendRestApiReq("GET", components);
    };

    s.getTransaction = function(transactionId) {
        var components = ["transaction", transactionId];
        return sendRestApiReq("GET", components);
    };

    s.updateTransaction = function(transactionId, delegatorId, transStatus) {
        var components = ["transaction", transactionId];
        var httpData = {};
        if (delegatorId !== null)
            httpData["delegator_uuid"] = delegatorId;
        if (transStatus !== null)
            httpData["status"] = transStatus;
        return sendRestApiReq("PUT", components, httpData);
    };

    s.getCustomer = function(customerId) {
        var components = ["customer", customerId];
        return sendRestApiReq("GET", components);
    };

    s.sendMessage = function(transactionId, msg) {
        var components = ["send_message", transactionId];
        var httpData = {
            "platform_type": "test",
            "content": msg,
            "from_customer": false
        };
        return sendRestApiReq("POST", components, httpData);
    };

    s.getMessages = function(transactionId) {
        var components = ["get_messages", transactionId];
        return sendRestApiReq("GET", components);
    };

    s.getDelegator = function(delegatorId) {
        var components = ["get_delegator", delegatorId];
        return sendRestApiReq("GET", components);
    };

    return s;
}();
