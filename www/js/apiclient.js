"use strict";

var GAT = GAT || {};

var has = function(obj, property) {
    return obj.hasOwnProperty(property);
};

GAT.webapi = function() {
    var s = {};

    var Customer = function(phoneNumber, firstName, lastName, id) {
        this.phoneNumber = phoneNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.id = id;
    };

    var Message = function(fromCustomer, msg) {
        this.message = msg;
        this.fromCustomer = !!fromCustomer;
    };


    var customerList = [
        new Customer("9339405948", "George", "Bush", 0),
        new Customer("8766666545", "John", "Adams", 1),
        new Customer("1039403940", "Andrew", "Johnson", 2),
        new Customer("4334493844", "Creepy", "Nixon", 3),
        new Customer("3039403941", "Frank", "Roosevelt", 4),
        new Customer("5849408948", "Barack", "Obama", 5),
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
