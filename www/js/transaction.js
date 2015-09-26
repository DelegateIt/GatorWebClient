"use strict";

var GAT = GAT || {};

GAT.transaction = function() {
    var s = {};

    var updater = new GAT.Updater();

    s.states = Object.freeze({
        "STARTED": "started",
        "HELPED": "helped",
        "PROPOSED": "proposed",
        "CONFIRMED": "confirmed",
        "PENDING": "pending",
        "COMPLETED": "completed"
    });

    s.cache = {};

    var loader = new GAT.utils.BackgroundLoader(true);

    s.Transaction = function() {
        this.customerId = null;
        this.receipt = new s.Receipt();
        this.messages = [];
        this.state = s.states.STARTED;
        this.id = null;
        this.delegatorId = null;
        this.startTimestamp = 0;
        this.paymentUrl = "";
    };

    s.ReceiptItem = function(name, cost) {
        this.name = name;
        this.cost = cost;
    };

    s.Message = function(content, fromCustomer) {
        this.content = content;
        this.fromCustomer = !!fromCustomer;
    };

    s.Receipt = function() {
        this.chargeId = null;
        this.notes = "";
        this.items = [];

        this.addItem = function(name, cost) {
            this.items.push(new s.ReceiptItem(name, cost));
            return this.items.length - 1;
        };

        this.deleteItem = function(index) {
            this.items.splice(index, 1);
        };

        this.getCostSum = function() {
            var sum = 0.0;
            for (var i in this.items) {
                sum += this.items[i].cost;
            }
            return sum;
        };

        this.getFee = function() {
            var sum = this.getCostSum();
            var extra = 0.0;
            if (sum < 20.0)
                extra = sum * 0.18;
            else if (sum < 50.0)
                extra = sum * 0.15;
            else if (sum < 100.0)
                extra = sum * 0.125;
            else if (sum < 250.0)
                extra = sum * 0.10;
            else
                extra = sum * 0.08;
            return extra;
        };

        this.getTotal = function() {
            var sum = this.getCostSum();
            var fee = this.getFee();
            return sum + fee;
        };

    };

    s.sendMessage = function(transactionId, message) {
        return GAT.webapi.sendMessage(transactionId, message, "web_client", false).
            onSuccess(function() {
                if (transactionId in s.cache)
                    s.cache[transactionId].messages.push(new s.Message(message, false));
            });
    };

    s.reassign = function(transactionId, delegatorId) {
        //TODO reassign
        /*GAT.webapi.updateTransaction(transactionId, delegatorId, null).
            onSuccess(function(resp) {
                if (transactionId in s.cache)
                    delete s.cache[transactionId];
            });*/
    };

    s.setState = function(transactionId, newState) {
        return GAT.webapi.updateTransaction(transactionId, null, newState).
            onSuccess(function() {
                if (transactionId in s.cache) {
                    s.cache[transactionId].state = newState;
                }
            });
    };

    s.finalize = function(transactionId) {
        if (!(transactionId in s.cache))
            throw "Cannot finalize transaction. The transaction is not cached";
        var transaction = s.cache[transactionId];
        var rawReceipt = {
            "total": Math.floor(transaction.receipt.getTotal() * 100),
            "notes": transaction.receipt.notes === "" ? " ": transaction.receipt.notes,
            "items": []
        };

        for (var i in transaction.receipt.items) {
            var item = transaction.receipt.items[i];
            rawReceipt.items.push({
                "name": item.name,
                "cents": Math.round(item.cost * 100)
            });
        }

        return GAT.webapi.updateTransaction(transactionId, null, s.states.PROPOSED, rawReceipt).
            onSuccess(function() {
                transaction.state = s.states.PROPOSED;
            });
    };

    var updateTransaction = function(transResp) {
        if (!(transResp.uuid in s.cache)) {
            GAT.utils.logger.log("warning", "Received update from unwatched transaction", transResp);
            return;
        }
        var transaction = s.cache[transResp.uuid];
        console.log("UPDATING", transaction, transResp);
        updateTransacationFromResp(transaction, transResp, false);
    };

    var updateTransacationFromResp = function(transaction, resp, updateReceipt) {
        transaction.state = resp.status;
        transaction.id = resp.uuid;
        transaction.delegatorId = resp.delegator_uuid;
        transaction.customerId = resp.customer_uuid;
        transaction.startTimestamp = resp.timestamp;
        if ("payment_url" in resp)
            transaction.paymentUrl = resp.payment_url;
        if ("receipt" in resp) {
            if ("stripe_charge_id" in resp.receipt)
                transaction.receipt.chargeId = resp.receipt.stripe_charge_id;
            if (updateReceipt) {
                transaction.receipt.notes = resp.receipt.notes;
                for (var i in resp.receipt.items) {
                    var item = resp.receipt.items[i];
                    transaction.receipt.items.push(new s.ReceiptItem(item.name, item.cents / 100.0));
                }
            }
        }
        var count = transaction.messages.length;
        if (resp.hasOwnProperty("messages") && (resp.messages.length != count ||
                    transaction.messages[count - 1].content != resp.messages[count - 1].content)) {

            transaction.messages = [];
            for (var i = 0; i < resp.messages.length; i++) {
                var m = new s.Message(resp.messages[i].content, resp.messages[i].from_customer);
                transaction.messages.push(m);
            }
        }
    };

    var onTransactionLoad = function(transResp) {
        var transaction = transResp.uuid in s.cache ? s.cache[transResp.uuid] : new s.Transaction();
        updateTransacationFromResp(transaction, transResp, true);
        if (!(transaction.id in s.cache))
            s.cache[transaction.id] = transaction;
        updater.watch(transaction.id, updateTransaction);
        GAT.customer.load(transaction.customerId);
    };

    s.load = function(transactionId) {
        var future = new GAT.utils.Future();
        if (transactionId in s.cache) {
            future.notify(s.cache[transactionId], true);
        } else {
            loader.add(function() {
                return GAT.webapi.getTransaction(transactionId).
                    onSuccess(function(t) {
                        onTransactionLoad(t.transaction);
                        future.notify(true, s.cache[transactionId]);
                    }).
                    onError(function(resp) {
                        future.notify(false, resp);
                    });
            });
        }
        return future;
    };

    s.loadList = function(transactionIds) {
        for (var i in transactionIds) {
            var id = transactionIds[i];
            if (id in s.cache)
                continue;
            s.load(id);
        }
    };

    s.initialize = function(socketIoHost) {
        updater.connect(socketIoHost);
        loader.start();
    };

    return s;
}();
