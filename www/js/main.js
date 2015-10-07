"use strict";

angular.module("app", ["ngRoute", "ngCookies"])
.config(["$routeProvider", function($routeProvider) {
    $routeProvider.
        when("/transaction/", {
            "templateUrl": "/routes/transaction.html",
            "controller": "transactionCtrl"
        }).
        when("/transaction/:transactionId/", {
            "templateUrl": "/routes/transaction.html",
            "controller": "transactionCtrl"
        }).
        when("/login/", {
            "templateUrl": "/routes/login.html",
            "controller": "loginCtrl"
        }).
        otherwise({
            redirectTo: "/login/"
        });
}])
.run(["$timeout", "$location", "$cookies", "$window", function($timeout, $location, $cookies, $window) {
    GAT.view.updateAfter = $timeout;
    findSocketioIp(function(socketioIp) {
        GAT.transaction.initialize(socketioIp);
        GAT.delegator.onLogin.push(function(delegatorId) {
            $cookies.put("delegatorId", delegatorId);
            $location.path("/transaction/");
            GAT.delegator.me.checkForNewTransactions();
        });
        GAT.delegator.onLogout.push(function() {
            $cookies.remove("delegatorId");
            $window.location.reload();
        });
        GAT.delegator.loadList().onSuccess(function() {
            if (typeof($cookies.get("delegatorId")) !== "undefined")
                GAT.delegator.login($cookies.get("delegatorId"));
        });
    });
}])
.controller("mainCtrl", ["$scope", "$location", "$cookies",
        function($scope, $location, $cookies) {

    $scope.isTestMode = function() {
        return GAT.isInTestMode;
    };

    $scope.$on('$routeChangeSuccess', function() {

        if (GAT.delegator.isLoggedIn() && $location.path() === "/login/")
            $location.path("/transaction/");

        if (!GAT.delegator.isLoggedIn() && $location.path() !== "/login/") {
            $location.path("/login/");
        }
    });
}])
.controller("navCtrl", ["$scope", "$location", "$cookies",
        function($scope, $location, $cookies) {

    $scope.isActive = function(page) {
        return $location.path().startsWith(page);
    };
}])
.controller("loginCtrl", ["$scope", function($scope) {

    $scope.isLoggedIn = GAT.delegator.isLoggedIn;

    $scope.getDelegatorName = function() {
        if (!GAT.delegator.isLoggedIn())
            return "";
        return GAT.delegator.me.name;
    };

    $scope.getDelegators = function() {
        return GAT.delegator.everybody;
    };

    $scope.login = GAT.delegator.login;
    $scope.logout = GAT.delegator.logout;

}])
.controller("tranStatCtrl", ["$scope",
        function($scope) {

    autosize($("#messageInput"));

    $scope.getStatus = function() {
        return $scope.selected.state;
    };

    $scope.getStates = function() {
        return GAT.transaction.states;
    };

    $scope.getDelegators = function() {
        return GAT.delegator.everybody;
    };

    $scope.getLoggedInDelegator = function() {
        return GAT.delegator.me;
    };

    $scope.setState = function(newState) {
        GAT.transaction.setState($scope.selected.id, newState);
    };

    $scope.reassign = function(delegatorId) {
        GAT.transaction.reassign($scope.selected.id, delegatorId);
    };

    $scope.getDateString = function() {
        if ($scope.selected === null)
            return null;
        return GAT.utils.toDateString($scope.selected.startTimestamp);
    };

    $scope.isPaidFor = function() {
        if ($scope.selected === null)
            return "no";
        return ($scope.selected.receipt.chargeId !== null) ? "yes" : "no";
    };
}])
.controller("transactionCtrl", ["$scope", "$routeParams", "$location",
        function($scope, $routeParams, $location) {

    $scope.selected = null;

    $scope.isCustomerListEmpty = function() {
        for (var i in GAT.transaction.cache)
            if ($scope.isTransactionActive(GAT.transaction.cache[i]))
                return false;
        return true;
    };

    $scope.getCustomerName = function(customerId) {
        if (customerId in GAT.customer.cache)
            return GAT.customer.cache[customerId].name;
        else
            return "Loading...";
    };

    $scope.getCustomer = function() {
        if ($scope.selected !== null && $scope.selected.customerId in GAT.customer.cache)
            return GAT.customer.cache[$scope.selected.customerId];
        else
            return null;
    };

    $scope.isTransactionActive = function(transaction) {
        return transaction.state !== GAT.transaction.states.COMPLETED &&
                transaction.delegatorId == GAT.delegator.me.id;
    };

    $scope.getTransactions = function() {
        return GAT.transaction.cache
    };

    $scope.getReceipt = function() {
        if ($scope.selected === null)
            return null;
        return $scope.selected.receipt;
    };

    $scope.canEdit = function() {
        if ($scope.selected === null)
            return false;
        return $scope.selected.receipt.chargeId === null;
    };

    $scope.switchToTransaction = function(transactionId) {
        $location.path("/transaction/" + transactionId);
    };

    if (typeof($routeParams.transactionId) !== "undefined") {
        var transactionId = $routeParams.transactionId;
        GAT.transaction.load(transactionId).onSuccess(function() {
            $scope.selected = GAT.transaction.cache[transactionId];
            GAT.customer.deepLoad($scope.selected.customerId);
        });
    }

}])
.controller("messageCtrl", ["$scope", function($scope) {

    $scope.sendMessageText = "";

    $scope.tmpMessageText = "";

    var updateTextInputSize = function() {
        //When this function is called, angular has not finished updating the view,
        //So any changes to #messageInput during the update won't be reflected in the
        //DOM at this point in time. So we wait a bit for the DOM to be updated, then
        //resize the input text
        setTimeout(function() {
            autosize.update($("#messageInput"));
        }, 300);
    };

    $scope.sendMessage = function($event) {
        $("#sendMsgBtn").button("loading");
        $scope.tmpMessageText = $scope.sendMessageText;
        GAT.transaction.sendMessage($scope.selected.id, $scope.sendMessageText).
            onResponse(function() {
                $scope.tmpMessageText = "";
                $("#sendMsgBtn").button("reset");
            });
        $scope.sendMessageText = "";
        updateTextInputSize();
    };

    $scope.insertReceipt = function() {
        var text = $scope.sendMessageText === "" ? "" : "\r\n";
        for (var i in $scope.selected.receipt.items)
            text += $scope.selected.receipt.items[i].name + "\r\n";
        text += $scope.selected.paymentUrl;
        $scope.sendMessageText += text;
        updateTextInputSize();
    };

}])
.controller("receiptItemCtrl", ["$scope", function($scope) {

    $scope.onNameChange = function() {
        $scope.item.name = $scope.itemName;
    };

    $scope.onCostChange = function() {
        $scope.item.cost = parseFloat($scope.itemCost);
    };

    $scope.itemName = $scope.item.name;
    $scope.itemCost = $scope.item.cost;

}])
.controller("receiptModCtrl", ["$scope", function($scope) {

    $scope.tempReceipt = null;

    $scope.saveReceipt = function() {
        $("#saveReceiptBtn").button("loading");
        $scope.clearEmpty();
        GAT.transaction.saveReceipt($scope.selected.id, $scope.tempReceipt).onResponse(function() {
            $("#saveReceiptBtn").button("reset");
            $('#EditReceiptModal').modal('hide')
        });
    };

    $scope.canSaveReceipt = function() {
        if ($scope.selected === null)
            return false;
        return $scope.tempReceipt !== null &&
                $scope.tempReceipt.items.length !== 0 &&
                $scope.tempReceipt.items[0].name !== "" &&
                $scope.tempReceipt.items[0].cost !== "0.0" &&
                $scope.selected.state !== GAT.transaction.states.COMPLETED &&
                $scope.selected.receipt.chargeId === null;
    };


    $scope.addItem = function() {
        $scope.tempReceipt.items.push(new GAT.transaction.ReceiptItem("", 0.0));
    };

    $scope.deleteItem = function(index) {
        $scope.tempReceipt.items.splice(index, 1);
    };

    $scope.clearEmpty = function() {
        var size = $scope.tempReceipt.items.length;
        for (var i = size - 1; i >= 0; i--) {
            var item = $scope.tempReceipt.items[i];
            if (item.name.trim() == "" || item.cost === 0.0)
                $scope.deleteItem(i);
        };
    };

    $("#EditReceiptModal").on("show.bs.modal", function (evnt) {
        GAT.view.updateAfter(function() {
            $scope.tempReceipt = JSON.parse(JSON.stringify($scope.selected.receipt));
            $scope.addItem();
        });
    });

    $("#EditReceiptModal").on("hide.bs.modal", function (evnt) {
        //Don't do anything
    });
}])
.controller("alertCtrl", ["$scope", function($scope) {
    $scope.alerts = [];
    $scope.remove = function(index) {
        $scope.alerts.splice(index, 1);
    };

    GAT.utils.logger.handlers["ui-alert"] = new GAT.utils.logger.Handler("warning",
        function(level, message) {
            var alertMsg = "Whoa, something didn't go right. " + message;
            if ($scope.alerts.indexOf(alertMsg) === -1) {
                $scope.alerts.push(alertMsg);
                if ($scope.alerts.length > 2)
                    $scope.alerts.shift();
            }
        }
    );
}])
.controller("addCustomerCtrl", ["$scope", function($scope) {
    $scope.addCustomer = function() {
        $("#addCustomerBtn").button("loading");
        GAT.delegator.me.findUnhelpedTransaction().onResponse(function() {
            $("#addCustomerBtn").button("reset");
        });
    };
}]).
controller("pastTransactionCtrl", ["$scope", function($scope) {
    $scope.getTitle = function(transactionId, index) {
        if (transactionId in GAT.transaction.cache) {
            var transaction = GAT.transaction.cache[transactionId];
            var receiptItem = "";
            if (transaction.receipt.items.length !== 0)
                receiptItem = transaction.receipt.items[0].name + "  -  ";
            return receiptItem + GAT.utils.toDateString(transaction.startTimestamp);
        } else {
            return "#" + index;
        }
    };
}]);

var findSocketioIp = function(callback) {
    var isTestMode = null;
    var socketioIp = null;
    var onResponse = function(test, ip) {
        socketioIp = test ? null : ip;
        if (isTestMode === null) {
            isTestMode = test;
            GAT.isInTestMode = test;
            GAT.utils.logger.log("info", "Setting test mode to " + isTestMode);
            GAT.webapi.setTestMode(test);
        }
        if (socketioIp !== null) {
            GAT.utils.logger.log("info", "Using socketio host: " + socketioIp);
            callback(socketioIp);
        }
    };
    GAT.webapi.setTestMode(true);
    GAT.webapi.getServerIp(true).onSuccess(function(resp) {
        onResponse(true, resp.ip);
    });
    GAT.webapi.setTestMode(false);
    GAT.webapi.getServerIp().onSuccess(function(resp) {
        onResponse(false, resp.ip);
    });
};

var GAT = GAT || {};

GAT.isInTestMode = false;

GAT.view = function() {
    var s = {};

    s.updateAfter = null;

    return s;
}();

