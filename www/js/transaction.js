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

    s.unhelpedCustomerCount = 0;

    s.activeTransactions = {}; // {transactionId: Transaction}

    s.myDelegatorId = 0;

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

        this.setState = function(state) {
            var _this = this;
            GAT.webapi.updateTransaction(this.id, null, state).
                onSuccess(function() {
                    _this.state = state;
                });
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

    var updateTransacationFromResp = function(transaction, resp) {
        transaction.messages = [];
        transaction.state = resp.status;
        transaction.id = resp.uuid;
        if (resp.hasOwnProperty("messages")) {
            for (var i = 0; i < resp.messages.length; i++) {
                var m = new s.Message(resp.messages[i].content, resp.messages[i].from_customer);
                transaction.messages.push(m);
            }
        }
    };

    var onTransactionLoad = function(transResp, callback) {

        var onCustomerLoad = function(transaction) {
            s.activeTransactions[transaction.id] = transaction;
            callback(transaction);
        };

        var transaction = new s.Transaction();
        updateTransacationFromResp(transaction, transResp);
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
                    s.unhelpedCustomerCount--;
                    var transResp = resp.transactions[0];
                    GAT.webapi.updateTransaction(transResp.uuid, s.myDelegatorId, s.states.HELPED);
                    onTransactionLoad(transResp, callback);
                }
            });
    };

    var onTransactionRefresh = function(resp) {
        var transaction = s.activeTransactions[resp.transaction.uuid];
        updateTransacationFromResp(transaction, resp.transaction);
    };

    var refreshActiveTransactions = function() {
        GAT.webapi.getTransactionsWithStatus(s.states.STARTED).
            onSuccess(function(r) {
                s.unhelpedCustomerCount = r.transactions.length;
            });

        for (var id in s.activeTransactions) {
            GAT.webapi.getTransaction(id).onSuccess(onTransactionRefresh);
        }
    };

    setInterval(function() {
        GAT.view.updateAfter(refreshActiveTransactions);
    }, 5000);


    return s;
}();
