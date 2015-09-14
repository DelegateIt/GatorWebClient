
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
            this._notifyCallbacks();
        return this;
    };

    s.Future.prototype.onError = function(callback) {
        this._errorCallbacks.push(callback);
        if (this._response !== null)
            this._notifyCallbacks();
        return this;
    };

    s.Future.prototype.onResponse = function(callback) {
        this._respCallbacks.push(callback);
        if (this._response !== null)
            this._notifyCallbacks();
        return this;
    };

    s.Future.prototype._notifyCallbacks = function() {
        if (this._response !== null) {
            var success = this._success;
            var callbacks = success ? this._successCallbacks : this._errorCallbacks;
            var respCallbacks = this._respCallbacks;
            var response = this._response;
            GAT.view.updateAfter(function() {
                for (var i in callbacks)
                    callbacks[i](response);
                for (var i in respCallbacks)
                    respCallbacks[i](success, response);
            });
        }
    };

    s.Future.prototype.notify = function(response, success) {
        if (this._response !== null)
            throw "Future has already been fullfilled";
        this._response = response;
        this._success = success;
        this._notifyCallbacks();
    };

    s.Future.prototype.notifyError = function(error) {
        this.notify({"error": error});
    };

    s.BackgroundLoader = function() {
        this._queue = [];
        this._stopLoading = true;
        this._loadInProgress = false;
    };

    s.BackgroundLoader.prototype.add = function(req) {
        this._queue.push(req);
        if (!this._loadInProgress && !this._stopLoading)
            this.start();
    };

    s.BackgroundLoader.prototype.start = function() {
        this._stopLoading = false;
        this._loadInProgress = true;
        var _this = this;
        setTimeout(function() { _this._handleLoads(); }, 0);
    };

    s.BackgroundLoader.prototype.stop = function() {
        this._stopLoading = true;
    };

    s.BackgroundLoader.prototype._handleLoads = function() {
        if (this._queue.length === 0 || this._stopLoading) {
            this._loadInProgress = false;
        } else {
            var func = this._queue.shift();
            var future = func();
            var _this = this;
            future.onResponse(function() {
                _this._handleLoads();
            });
        }
    };

    s.BackgroundLoader.prototype.isLoading = function() {
        return this._loadInProgress;
    };

    return s;
}();
