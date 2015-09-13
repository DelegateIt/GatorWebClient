
var GAT = GAT || {};

GAT.utils = function() {
    var s = {};

    s.extendClass = function(base, subclass) {
        subclass.prototype = Object.create(base.prototype);
        subclass.prototype.constructor = subclass;
    };

    s.Future = function() {
        this._successCallbacks = [];
        this._errorCallbacks = [];
        this._respCallbacks = [];
        this._response = null;
    };

    s.Future.prototype.onSuccess = function(callback) {
        this._successCallbacks.push(callback);
        if (this._response !== null)
            this.notify();
        return this;
    };

    s.Future.prototype.onError = function(callback) {
        this._errorCallbacks.push(callback);
        if (this._response !== null)
            this.notify();
        return this;
    };

    s.Future.prototype.onResponse = function(callback) {
        this._respCallbacks.push(callback);
        if (this._response !== null)
            this.notify();
        return this;
    };

    s.Future.prototype.notify = function(response) {
        if (this._response !== null)
            throw "Future has already been fullfilled";
        this._response = response;
        var success = "result" in response && response.result === 0;
        var callbacks = success ? this._successCallbacks : this._errorCallbacks;
        var respCallbacks = this._respCallbacks;
        GAT.view.updateAfter(function() {
            for (var i in callbacks)
                callbacks[i](response);
            for (var i in respCallbacks)
                respCallbacks[i](success, response);
        });
    };

    s.Future.prototype.notifyError = function(error) {
        this.notify({"error": error});
    };

    return s;
}();
