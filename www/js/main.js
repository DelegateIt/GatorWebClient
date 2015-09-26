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

    $scope.isPaidFor = function() {
        if ($scope.selected === null)
            return false;
        return $scope.selected.receipt.chargeId !== null;
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
        var c = GAT.transaction.getCustomer(customerId);
        if (typeof(c) === "undefined")
            return "Loading...";
        return c.name;
    };

    $scope.getCustomer = function() {
        if ($scope.selected === null)
            return null;
        return GAT.transaction.getCustomer($scope.selected.customerId);
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

    $scope.finalizeReceipt = function() {
        GAT.transaction.finalize($scope.selected.id);
    };

    $scope.canFinalize = function() {
        if ($scope.selected === null)
            return false;
        return $scope.selected.receipt.items.length !== 0 &&
                $scope.selected.state !== GAT.transaction.states.COMPLETED &&
                $scope.selected.receipt.chargeId === null;
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

    $("#EditReceiptModal").on("show.bs.modal", function (evnt) {
        GAT.view.updateAfter(function() {
            $scope.addItem();
        });
    });

    $("#EditReceiptModal").on("hide.bs.modal", function (evnt) {
        GAT.view.updateAfter(function() {
            var size = $scope.getReceipt().items.length;
            for (var i = size - 1; i >= 0; i--) {
                var item = $scope.getReceipt().items[i];
                if (item.name.trim() == "" || item.cost === 0.0)
                    $scope.deleteItem(i);
            };
        });
    });

    $scope.addItem = function() {
        $scope.getReceipt().addItem("", 0.0);
    };

    $scope.deleteItem = function(index) {
        $scope.getReceipt().deleteItem(index);
    };
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

