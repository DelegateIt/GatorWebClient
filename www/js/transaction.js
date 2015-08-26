"use strict";

var GAT = GAT || {};

GAT.transaction = function() {
    var s = {};

    s.states = {
        "STARTED": "started",
        "HELPED": "helped",
        "CONFIRMED": "confirmed",
        "COMPLETED": "completed"
    };

    s.activeTransactions = {}; // {transactionId: Transaction}

    s.myDelegatorId = 0;

    s.onNewTransaction = []; // [function, ...]

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
        this.items = [];
        this.notes = [];

        this.addItem = function(name, cost) {
            this.items.push(new s.ReceiptItem(name, cost));
            return this.items.length - 1;
        };

        this.deleteItem = function(index) {
            this.items.splice(index, 1);
        };

        this.addNote = function(message) {
            this.notes.push(message);
            return this.items.length - 1;
        };

        this.canFinalize = function() {
            return this.items.length != 0;
        };

        this.markFinalized = function() {

        };
    };

    var loadCustomer = function(transaction, customerId, callback) {
        GAT.webapi.getCustomer(customerId).
            onSuccess(function(c) {
                var customer = new s.Customer(c.first_name, c.last_name, c.uuid);
                transaction.customer = customer;
                callback(transaction);
            });
    };

    var onTransactionLoad = function(transResp, callback) {

        var onCustomerLoad = function(transaction) {
            s.activeTransactions[transaction.id] = transaction;
            callback(transaction);
            for (var i = 0; i < s.onNewTransaction.length; i++)
                s.onNewTransaction[i](transaction);
        };

        var transaction = new s.Transaction();
        transaction.state = transResp.status;
        transaction.id = transResp.uuid;
        if (transResp.hasOwnProperty("messages")) {
            for (var i = 0; i < transResp.messages.length; i++) {
                var m = new s.Message(transResp.messages[i].content, transResp.messages[i].from_customer);
                transaction.messages.push(m);
            }
        }
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
                if (resp.transactions.length != 0) {
                    var transResp = resp.transactions[0];
                    GAT.webapi.updateTransaction(transResp.uuid, s.myDelegatorId, s.states.HELPED);
                    onTransactionLoad(transResp, callback);
                }
            });
    };

    return s;
}();
