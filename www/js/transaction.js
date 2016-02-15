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

    var cachedTransactionLists = {};

    s.cache = {};

    var loadInProgress = {}; //{transactionId: Future}

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

    s.Message = function(content, fromCustomer, timestamp) {
        this.content = content;
        this.fromCustomer = !!fromCustomer;
        this.timestamp = timestamp;
    };

    s.Receipt = function() {
        this.isSaved =  false;
        this.total = null;
        this.chargeId = null;
        this.notes = "";
        this.items = [];
    };

    s.sendMessage = function(transactionId, message, type) {
        if (transactionId in s.cache)
            s.cache[transactionId].messages.push(new s.Message(message, false, -1));
        return GAT.webapi.sendMessage(transactionId, message, false, type);
    };

    s.reassign = function(transactionId, delegatorId) {
        GAT.webapi.updateTransaction(transactionId, delegatorId, null);
    };

    s.setState = function(transactionId, newState) {
        return GAT.webapi.updateTransaction(transactionId, null, newState).
            onSuccess(function() {
                if (transactionId in s.cache) {
                    s.cache[transactionId].state = newState;
                }
            });
    };

    var calculateTotal = function(receipt) {
        var sum = 0.0;
        for (var i in receipt.items)
            sum += receipt.items[i].cost;

        var fee = 5 + sum * 0.05;

        return Math.floor((sum + fee) * 100);//USD in cents
    };

    s.saveReceipt = function(transactionId, receipt) {
        var rawReceipt = {
            "total": calculateTotal(receipt),
            "notes": receipt.notes,
            "items": []
        };

        if (rawReceipt.notes === "")
            delete rawReceipt["notes"];

        for (var i in receipt.items) {
            var item = receipt.items[i];
            rawReceipt.items.push({
                "name": item.name,
                "cents": Math.round(item.cost * 100)
            });
        }

        return GAT.webapi.updateTransaction(transactionId, null, s.states.PROPOSED, rawReceipt);
    };

    var updateTransaction = function(transResp) {
        if (!(transResp.uuid in s.cache)) {
            GAT.utils.logger.log("warning", "Received update from unwatched transaction", transResp);
            return;
        }
        var transaction = s.cache[transResp.uuid];
        console.log("UPDATING", transaction, transResp);
        updateTransacationFromResp(transaction, transResp);
    };

    var updateTransacationFromResp = function(transaction, resp) {
        transaction.state = resp.status;
        transaction.id = resp.uuid;
        transaction.delegatorId = resp.delegator_uuid;
        transaction.customerId = resp.customer_uuid;
        transaction.startTimestamp = resp.timestamp / 1000;
        if ("payment_url" in resp)
            transaction.paymentUrl = resp.payment_url;
        if ("receipt" in resp) {
            transaction.receipt.isSaved = true;
            if ("stripe_charge_id" in resp.receipt)
                transaction.receipt.chargeId = resp.receipt.stripe_charge_id;
            if ("notes" in resp.receipt)
                transaction.receipt.notes = resp.receipt.notes;
            transaction.receipt.total = resp.receipt.total;
            transaction.receipt.items = [];
            for (var i in resp.receipt.items) {
                var item = resp.receipt.items[i];
                transaction.receipt.items.push(new s.ReceiptItem(item.name, item.cents / 100.0));
            }
        }
        var count = transaction.messages.length;
        if (resp.hasOwnProperty("messages") && (resp.messages.length != count ||
                    transaction.messages[count - 1].timestamp != resp.messages[count - 1].timestamp)) {

            transaction.messages = [];
            for (var i = 0; i < resp.messages.length; i++) {
                var m = new s.Message(
                    resp.messages[i].content,
                    resp.messages[i].from_customer,
                    Math.floor(resp.messages[i].timestamp / 1000));
                transaction.messages.push(m);
            }
        }
    };

    var onTransactionLoad = function(transResp) {
        var transaction = transResp.uuid in s.cache ? s.cache[transResp.uuid] : new s.Transaction();
        updateTransacationFromResp(transaction, transResp);
        if (!(transaction.id in s.cache))
            s.cache[transaction.id] = transaction;
        updater.watch(transaction.id, updateTransaction);
        GAT.customer.load(transaction.customerId);
    };

    var loadUsersTransactions = function(type, userId) {
        var future = new GAT.utils.Future();
        if (userId in cachedTransactionLists) {
            future.notify({}, true);
        } else {
            //Store an empty value. It's never used so it doesn't matter
            cachedTransactionLists[userId] = null;
            GAT.webapi.loadUsersTransactions(type, userId).
                onSuccess(function(resp) {
                    resp.transactions.forEach(onTransactionLoad);
                }).onResponse(function(success) {
                    future.notify({}, success);
                });
        }
        return future;
    };

    s.loadDelegatorsTransactions = function(delegatorId) {
        return loadUsersTransactions("delegator", delegatorId);
    };

    s.loadCustomersTransactions = function(customerId) {
        return loadUsersTransactions("customer", customerId);
    };

    s.load = function(transactionId) {
        if (transactionId in loadInProgress)
            return loadInProgress[transactionId];
        var future = new GAT.utils.Future();
        if (transactionId in s.cache) {
            future.notify(s.cache[transactionId], true);
        } else {
            loadInProgress[transactionId] = future;
            loader.add(function() {
                return GAT.webapi.getTransaction(transactionId).
                    onSuccess(function(t) {
                        onTransactionLoad(t.transaction);
                        delete loadInProgress[transactionId];
                        future.notify(true, s.cache[transactionId]);
                    }).
                    onError(function(resp) {
                        delete loadInProgress[transactionId];
                        future.notify(false, resp);
                    });
            });
        }
        return future;
    };

    s.initialize = function() {
        updater.connect(GAT.config.notifierUrl);
    };

    return s;
}();
