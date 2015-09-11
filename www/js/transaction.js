"use strict";

var GAT = GAT || {};

GAT.transaction = function() {
    var s = {};

    s.states = Object.freeze({
        "STARTED": "started",
        "HELPED": "helped",
        "PROPOSED": "proposed",
        "CONFIRMED": "confirmed",
        "PENDING": "pending",
        "COMPLETED": "completed"
    });

    s.unhelpedCustomerCount = 0;

    s.activeTransactions = {}; // {transactionId: Transaction}

    s.Customer = function(firstName, lastName, id) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.id = id;
    };

    s.Transaction = function() {
        this.customer = null;
        this.receipt = new s.Receipt();
        this.messages = [];
        this.state = s.states.STARTED;
        this.id = null;
        this.delegatorId = null;

        this.sendMessage = function(content) {
            this.messages.push(new s.Message(content, false));
            GAT.webapi.sendMessage(this.id, content);
        };
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

        this.getTotal = function() {
            var sum = 0.0;
            for (var i in this.items) {
                sum += this.items[i].cost;
            }
            return sum;
        };

    };

    s.generatePaymentUrl = function(transactionId) {
        return GAT.webapi.getUrl + "core/payment/uiform/" + transactionId;
    };

    s.reassign = function(transactionId, delegatorId) {
        //TODO reassign
        /*GAT.webapi.updateTransaction(transactionId, delegatorId, null).
            onSuccess(function(resp) {
                if (transactionId in s.activeTransactions)
                    delete s.activeTransactions[transactionId];
            });*/
    };

    s.setState = function(transactionId, newState) {
        if (!(transactionId in s.activeTransactions))
            return;
        GAT.webapi.updateTransaction(transactionId, null, newState).
            onSuccess(function() {
                s.activeTransactions[transactionId].state = newState;
            });
    };

    s.finalize = function(transactionId) {
        var transaction = s.activeTransactions[transactionId];
        var rawReceipt = {
            "notes": transaction.receipt.notes,
            "items": []
        };

        for (var i in transaction.receipt.items) {
            var item = transaction.receipt.items[i];
            rawReceipt.items.push({
                "name": item.name,
                "cents": Math.round(item.cost * 100)
            });
        }

        GAT.webapi.updateTransaction(transactionId, null, s.states.PROPOSED, rawReceipt);
    };

    var loadCustomer = function(transaction, customerId, callback) {
        GAT.webapi.getCustomer(customerId).
            onSuccess(function(c) {
                if (typeof(c.first_name) === "undefined")
                    c.first_name = "SMS user #" + customerId.substring(0, 3);
                var customer = new s.Customer(c.first_name, c.last_name, c.uuid);
                transaction.customer = customer;
                callback(transaction);
            });
    };

    var updateTransacationFromResp = function(transaction, resp, updateReceipt) {
        transaction.state = resp.status;
        transaction.id = resp.uuid;
        transaction.delegatorId = resp.delegator_uuid;
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

    var onTransactionLoad = function(transResp, callback) {

        var onCustomerLoad = function(transaction) {
            if (!(transaction.id in s.activeTransactions))
                s.activeTransactions[transaction.id] = transaction;
            callback(s.activeTransactions[transaction.id]);
        };

        var transaction = s.activeTransactions[transResp.uuid];
        if (typeof(transaction) === "undefined")
            transaction = new s.Transaction();
        updateTransacationFromResp(transaction, transResp, true);
        if (transaction.state === s.states.COMPLETED)
            onCustomerLoad(transaction);
        else
            loadCustomer(transaction, transResp.customer_uuid, onCustomerLoad);
    };

    s.loadTransaction = function(transactionId, callback) {
        if (s.activeTransactions.hasOwnProperty(transactionId)) {
            callback(s.activeTransactions[transactionId]);
            return;
        }

        GAT.webapi.getTransaction(transactionId).
            onSuccess(function(t) {
                onTransactionLoad(t.transaction, callback);
            });
    };

    s.retreiveNewCustomer = function(callback) {
        GAT.webapi.getTransactionsWithStatus(s.states.STARTED).
            onSuccess(function(resp) {
                s.unhelpedCustomerCount = resp.transactions.length;
                if (resp.transactions.length != 0) {
                    s.unhelpedCustomerCount--;
                    var transResp = resp.transactions[0];
                    GAT.webapi.updateTransaction(transResp.uuid, GAT.delegator.me.id, s.states.HELPED);
                    onTransactionLoad(transResp, callback);
                }
            });
    };

    var refresherThread = function() {
        var waitTime = 3000;
        var count = 0;

        var load = function() {
            var keys = Object.keys(s.activeTransactions);
            if (keys.length == 0) {
                setTimeout(load, waitTime);
            } else {
                var transactionId = keys[count % keys.length];
                if (s.activeTransactions[transactionId].state === s.states.COMPLETED) {
                    //This will skip updating transactions in the 'confirmed' state which
                    //saves a lot of cpu and bandwidth, but prevents us from learning about
                    //changes made to those transactions
                    count++;
                    setTimeout(load, 100);
                } else {
                    GAT.webapi.getTransaction(transactionId).
                        onSuccess(function(resp) {
                            var transaction = s.activeTransactions[resp.transaction.uuid];
                            updateTransacationFromResp(transaction, resp.transaction, false);
                            count++;
                            setTimeout(load, waitTime);
                        });
                }
            }
        };

        load();
    };


    s.initialize = function() {
        refresherThread();

        var updateDelegatorInfo = function() {
            if (GAT.delegator.isLoggedIn()) {
                GAT.webapi.getDelegator(GAT.delegator.me.id).onSuccess(function(r) {
                    var transactionIds = [];
                    if (r.hasOwnProperty("transaction_uuids"))
                        transactionIds = r["transaction_uuids"];
                    for (var i in transactionIds) {
                        s.loadTransaction(transactionIds[i], function() {});
                    }
                });
            }
        };

        /*var updateCustomerCount = function() {
            GAT.webapi.getTransactionsWithStatus(s.states.STARTED).
                onSuccess(function(r) {
                    s.unhelpedCustomerCount = r.transactions.length;
                });
        };*/

        //updateCustomerCount();
        //setInterval(updateCustomerCount, 10000);
        updateDelegatorInfo()
        setInterval(updateDelegatorInfo, 5000);
    };

    return s;
}();
