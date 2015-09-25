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

    var myDelegatorId = null;

    var customerCache = {};

    var transactionCache = {};

    var loader = new GAT.utils.BackgroundLoader(true);

    s.active = {};

    s.Customer = function(name, id, phone, email, transactionIds) {
        this.name = name;
        this.id = id;
        this.phone = phone;
        this.email = email;
        this.transactionIds = transactionIds;
    };

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
                if (transactionId in transactionCache)
                    transactionCache[transactionId].messages.push(new s.Message(message, false));
            });
    };

    s.reassign = function(transactionId, delegatorId) {
        //TODO reassign
        /*GAT.webapi.updateTransaction(transactionId, delegatorId, null).
            onSuccess(function(resp) {
                if (transactionId in transactionCache)
                    delete transactionCache[transactionId];
            });*/
    };

    s.setState = function(transactionId, newState) {
        return GAT.webapi.updateTransaction(transactionId, null, newState).
            onSuccess(function() {
                if (transactionId in transactionCache) {
                    transactionCache[transactionId].state = newState;
                }
                if (newState === s.states.COMPLETED && transactionId in s.active)
                    delete s.active[transactionId];
                if (newState != s.states.COMPLETED && !(transactionId in s.active))
                    s.active[transactionId] = transactionCache[transactionId];
            });
    };

    s.finalize = function(transactionId) {
        if (!(transactionId in transactionCache))
            throw "Cannot finalize transaction. The transaction is not cached";
        var transaction = transactionCache[transactionId];
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

    s.getCustomer = function(customerId) {
        return customerCache[customerId];
    };

    var loadCustomer = function(transaction, customerId) {
        if (customerId in customerCache) {
            var future = new GAT.utils.Future();
            future.notify({}, true);
            return future;
        }

        return GAT.webapi.getCustomer(customerId).
            onSuccess(function(c) {
                var name = "SMS user #" + customerId.substring(0, 3);
                if ("first_name" in c && "last_name" in c)
                    name = c.first_name + " "+ c.last_name;
                var phone = null;
                if ("phone_number" in c)
                    phone = c.phone_number;
                var email = null;
                if ("email" in c)
                    email = c.email;
                var transactionIds = [];
                if ("active_transaction_uuids" in c)
                    transactionIds = c.active_transaction_uuids;
                if ("inactive_transaction_uuids" in c)
                    transactionIds.push.apply(transactionIds, c.inactive_transaction_uuids);
                var customer = new s.Customer(name, c.uuid, phone, email, transactionIds);
                customerCache[customerId] = customer;
            });
    };

    var updateTransaction = function(transResp) {
        if (!(transResp.uuid in transactionCache)) {
            GAT.utils.logger.log("warning", "Received update from unwatched transaction", transResp);
            return;
        }
        var transaction = transactionCache[transResp.uuid];
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
        var transaction = transResp.uuid in transactionCache ? transactionCache[transResp.uuid] : new s.Transaction();
        updateTransacationFromResp(transaction, transResp, true);
        if (!(transaction.id in transactionCache))
            transactionCache[transaction.id] = transaction;
        if (transaction.state != s.states.COMPLETED && !(transaction.id in s.active))
            s.active[transaction.id] = transaction;
        updater.watch(transaction.id, updateTransaction);

        loader.add(function() {
            return loadCustomer(transaction, transResp.customer_uuid);
        });
    };

    s.getTransaction = function(transactionId) {
        return transactionCache[transactionId];
    };

    s.loadTransaction = function(transactionId) {
        if (transactionId in transactionCache) {
            var future = new GAT.utils.Future();
            future.notify({}, true);
            return future;
        }

        return GAT.webapi.getTransaction(transactionId).
            onSuccess(function(t) {
                onTransactionLoad(t.transaction);
            });
    };

    s.findUnhelped = function() {
        var future = new GAT.utils.Future();
        GAT.webapi.findUnhelpedTransaction(myDelegatorId).
            onSuccess(function(resp) {
                s.loadTransaction(resp.transaction_uuid).
                    onResponse(function(success) {
                        future.notify(success, {});
                    });
            }).
            onError(function(resp) {
                future.notify(false, {});
            });
        return future;
    };

    var backgroundLoadTransaction = function(transactionId) {
        loader.add(function() {
            return s.loadTransaction(transactionId);
        });
    };

    var checkForNewTransactions = function(delegatorId) {
        return GAT.webapi.getDelegator(delegatorId).
            onSuccess(function(resp) {
                var transactionIds = [];
                if ("active_transaction_uuids" in resp)
                    transactionIds = resp.active_transaction_uuids;
                if ("inactive_transaction_uuids" in resp)
                    transactionIds.push.apply(transactionIds, resp.inactive_transaction_uuids);
                for (var i in transactionIds) {
                    if (transactionIds[i] in transactionCache)
                        continue;
                    backgroundLoadTransaction(transactionIds[i]);
                }
            });
    };

    s.initialize = function(delegatorId, socketIoHost) {
        updater.connect(socketIoHost);
        myDelegatorId = delegatorId;
        checkForNewTransactions(delegatorId);
        loader.start();
    };

    return s;
}();
