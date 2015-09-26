
var GAT = GAT || {};

GAT.utils = function() {
    var s = {};

    s.extendClass = function(base, subclass) {
        subclass.prototype = Object.create(base.prototype);
        subclass.prototype.constructor = subclass;
    };

    s.toDateString = function(seconds) {
        var date = new Date(seconds);
        var str = date.getMonth() + "/" + date.getDate() + "  " + date.getHours() + ":" + date.getMinutes();
        return str;
    };

    s.Future = function() {
        this._callbacks = []; //{type: string, callback: function}
        this._response = null;
        this._success = null;
    };

    s.Future.prototype.onSuccess = function(callback) {
        this._callbacks.push({"type": "success", "callback": callback});
        if (this._response !== null)
            this._notifyCallbacks();
        return this;
    };

    s.Future.prototype.onError = function(callback) {
        this._callbacks.push({"type": "error", "callback": callback});
        if (this._response !== null)
            this._notifyCallbacks();
        return this;
    };

    s.Future.prototype.onResponse = function(callback) {
        this._callbacks.push({"type": "all", "callback": callback});
        if (this._response !== null)
            this._notifyCallbacks();
        return this;
    };

    s.Future.prototype._notifyCallbacks = function() {
        if (this._response !== null) {
            var _this = this;
            var type = this._success ? "success" : "error";
            GAT.view.updateAfter(function() {
                while (_this._callbacks.length > 0) {
                    var cb = _this._callbacks.shift();
                    if (cb.type === "all")
                        cb.callback(_this._success, _this._response);
                    else if (cb.type === type)
                        cb.callback(_this._response);
                }
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

    s.logger = function() {
        var logger = {};

        logger.levels = Object.freeze({
            "debug": 0,
            "info": 1,
            "warning": 2,
            "error": 3
        });

        logger.minLevel = "info";

        logger.Handler = function(level, callback) {
            this.levelIndex = logger.levels[level];
            this.callback = callback;
        };

        logger.handlers = {};

        logger.log = function(level, message, data) {
            var levelIndex = logger.levels[level];
            if (levelIndex < logger.levels[logger.minLevel])
                return;
            for (var key in logger.handlers) {
                var handler = logger.handlers[key];
                if (levelIndex >= handler.levelIndex) {
                    handler.callback(level, message, data);
                }
            }
        };

        logger.handlers["browser-console"] = new logger.Handler("debug",
            function(level, message, data) {
                var date = new Date();
                var time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
                console.log(time, level, message, data);
            }
        );

        return logger;
    }();

    return s;
}();

GAT.Updater = function() {
    this._socketio = null;
    this._events = {}; //{eventName : {registered: bool, callback: function}}
};

GAT.Updater.prototype._register = function(eventName, eventObj) {
    if (this._socketio === null || eventObj.registered)
        return;
    eventObj.registered = true;
    this._socketio.on(eventName, function(resp) {
        GAT.view.updateAfter(function() {
            try {
                var obj = JSON.parse(resp);
                eventObj.callback(obj);
            } catch (e) {
                var error = {
                    "exception": e,
                    "response": resp
                };
                GAT.utils.logger.log("error", "An error occured while updating the transaction", error);
            }
        });
    });
    console.log("EMIT", eventName);
    this._socketio.emit("register_transaction", {"transaction_uuid": eventName});
};

GAT.Updater.prototype.watch = function(eventName, callback) {
    if (eventName in this._events)
        return false;
    var eventObj = {
        "registered": false,
        "callback": callback
    };
    this._events[eventName] = eventObj
    this._register(eventName, eventObj);
};

GAT.Updater.prototype.connect = function(url) {
    this._socketio = io(url);
    this._socketio.on("connect", function() {
        GAT.utils.logger.log("info", "connected to socketio", url);
    });
    var keys = Object.keys(this._events);
    for (var i in keys)
        this._register(keys[i], this._events[keys[i]]);
};

