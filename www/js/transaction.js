"use strict";

var GAT = GAT || {};

GAT.transaction = function() {
    var s = {};

    s.Customer = function(firstName, lastName, phonenumber, id) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.phonenumber = phonenumber;
        this.id = id;
        this.receipts = [];

        this.getActiveReceipt = function() {
            if (this.receipts.length == 0)
                this.receipts.push(new s.Receipt());
            return this.receipts[this.receipts.length - 1];
        };
    };

    s.ReceiptItem = function(name, cost) {
        this.name = name;
        this.cost = cost;
    };

    s.Receipt = function() {
        this.items = [];
        this.notes = [];

        this.addItem = function(name, cost) {
            this.items.push(new s.ReceiptItem(name, cost));
            return this.items.length - 1;
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

    return s;
}();
