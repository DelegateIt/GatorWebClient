"use strict";

var GAT = GAT || {};

var has = function(obj, property) {
    return obj.hasOwnProperty(property);
};

GAT.webapi = function() {
    var s = {};

    var Message = function(fromCustomer, msg) {
        this.message = msg;
        this.fromCustomer = !!fromCustomer;
    };

    var customerList = [
        new GAT.transaction.Customer("George", "Bush", "9339405948", 0),
        new GAT.transaction.Customer("John", "Adams", "8766666545", 1),
        new GAT.transaction.Customer("Andrew", "Johnson", "1039403940", 2),
        new GAT.transaction.Customer("Creepy", "Nixon", "4334493844", 3),
        new GAT.transaction.Customer("Frank", "Roosevelt", "3039403941", 4),
        new GAT.transaction.Customer("Barack", "Obama", "5849408948", 5),
    ];

    var msgLog = {
        0: [new Message(true, "I need pizza"), new Message(false, "sure thing, it's on the way")],
        1: [new Message(true, "How's it going?"), new Message(false, "I'm having trouble making fake converstion")],
        2: [new Message(true, "Bring me a copy of the declaration of independence")],
        3: [new Message(true, "skfjsd"), new Message(false, "slfjds"), new Message(true, "sldkfjsdfk"),
                new Message(false, "kdkdkddksklf")],
        4: [new Message(true, "I need my lawn mowed pronto")],
        5: [new Message(true, "you.. uh.. got anymore of that dank bud"), new Message(false, "420 blaze it")],
    };

    customerList[0].receipts.push(new GAT.transaction.Receipt());
    customerList[0].receipts[0].addItem("Pizza", 12.45);
    customerList[2].receipts.push(new GAT.transaction.Receipt());
    customerList[2].receipts[0].addItem("Declaration of independence", 12003495.45);
    customerList[5].receipts.push(new GAT.transaction.Receipt());
    customerList[5].receipts[0].addItem("Dank Bud", 4.20);

    s.previewCustomers = function(callback) {
        callback(true, customerList);
    };

    s.getCustomer = function(customerId, callback) {
        var found = null;
        for (var i = 0; found == null && i < customerList.length; i++) {
            var c = customerList[i];
            if (c.id == customerId)
                found = c;
        }
        if (found !== null)
            callback(true, found);
        else
            callback(false);
    };

    s.sendMessage = function(customerId, msg, callback) {
        if (!has(msgLog, customerId)) {
            callback(false);
        } else {
            msgLog[customerId].push(new Message(false, msg));
            callback(true);
        }
    };

    s.getMessages = function(customerId, timestamp, callback) {
        if (!has(msgLog, customerId)) {
            callback(false);
        } else {
            callback(true, msgLog[customerId]);
        }
    };

    return s;
}();
