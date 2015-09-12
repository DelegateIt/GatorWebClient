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
.run(["$timeout", "$cookies", function($timeout, $cookies) {
    GAT.view.updateAfter = $timeout;
    GAT.delegator.loadList(function() {
        if (typeof($cookies.get("delegatorId")) !== "undefined")
            GAT.delegator.login($cookies.get("delegatorId"));
    });
}])
.controller("mainCtrl", ["$scope", "$location", "$cookies",
        function($scope, $location, $cookies) {

    $scope.isTestMode = GAT.delegator.isInTestMode;

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
.controller("loginCtrl", ["$scope", "$location", "$cookies", "$window",
        function($scope, $location, $cookies, $window) {

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

    GAT.delegator.saveLogin = function(delegatorId) {
        $cookies.put("delegatorId", delegatorId);
        $location.path("/transaction/");
    };

    GAT.delegator.deleteSavedLogin = function() {
        $cookies.remove("delegatorId");
        $window.location.reload();
    };

}])
.controller("tranStatCtrl", ["$scope",
        function($scope) {

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

    $scope.isPrompted = function() {
        if ($scope.selected === null)
            return false;
        var state = $scope.selected.state;
        return (state == GAT.transaction.states.PROPOSED || state == GAT.transaction.states.CONFIRMED ||
                state == GAT.transaction.states.PENDING || state == GAT.transaction.states.COMPLETED);
    };

    $scope.getPaymentUrl = function() {
        if ($scope.selected === null)
            return "";
        return GAT.transaction.generatePaymentUrl($scope.selected.id);
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

    $scope.getUnhelpedCustomerCount = function() {
        return GAT.transaction.unhelpedCustomerCount;
    };

    $scope.sendMessageText = "";

    $scope.isCustomerListEmpty = function() {
        var state = GAT.transaction.states.COMPLETED
        if ($scope.selected !== null && $scope.selected.state !== state)
            return false;
        for (var i in GAT.transaction.activeTransactions) {
            if (GAT.transaction.activeTransactions[i].state !== state)
                return false;
        }
        return true;
    };

    $scope.getTransactions = function() {
        if ($scope.selected === null) {
            var keys = Object.keys(GAT.transaction.activeTransactions);
            var transactionId = null;
            for (var i in keys) {
                var t = GAT.transaction.activeTransactions[keys[i]];
                if (t.state !== GAT.transaction.states.COMPLETED)
                    transactionId = keys[i];
            }
            if (transactionId !== null) {
                $location.path("/transaction/" + transactionId);
            }
        }
        return GAT.transaction.activeTransactions;
    };

    $scope.getReceipt = function() {
        if ($scope.selected === null)
            return null;
        return $scope.selected.receipt;
    };

    $scope.sendMessage = function() {
        $scope.selected.sendMessage($scope.sendMessageText);
        $scope.sendMessageText = "";
    };

    $scope.finalizeReceipt = function() {
        GAT.transaction.finalize($scope.selected.id);
        $scope.sendMessageText = GAT.transaction.generatePaymentUrl($scope.selected.id);
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

    $scope.addCustomer = function() {
        GAT.transaction.retreiveNewCustomer(function(transaction) {
            $scope.switchToTransaction(transaction.id);
        });
    };

    $scope.switchToTransaction = function(transactionId) {
        $location.path("/transaction/" + transactionId);
    };

    if (typeof($routeParams.transactionId) !== "undefined") {
        var transactionId = $routeParams.transactionId;
        GAT.transaction.loadTransaction(transactionId, function(transaction) {
            $scope.selected = GAT.transaction.activeTransactions[transactionId];
        });
    }

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
}]);

var GAT = GAT || {};

GAT.view = function() {
    var s = {};

    s.updateAfter = null;

    return s;
}();

GAT.delegator = function() {
    var s = {};

    var Delegator = function(name, id, phone, email) {
        this.name = name;
        this.id = id;
        this.phone = phone;
        this.email = email;
        this.test = name === "Test Delegator";
    };

    s.everybody = {};

    s.me = null;

    s.isInTestMode = function() {
        return s.me !== null && s.me.test;
    };

    s.isLoggedIn = function() {
        return s.me !== null;
    };

    s.login = function(delegatorId) {
        if (delegatorId in s.everybody) {
            s.me = s.everybody[delegatorId];
            s.saveLogin(delegatorId);
            GAT.transaction.initialize();
        } else {
            s.logout();
        }
    };

    s.logout = function() {
        s.me = null;
        s.deleteSavedLogin();
    };

    //overwritten by angular code
    s.saveLogin = function() { };
    //overwritten by angular code
    s.deleteSavedLogin = function() { };

    s.loadList = function(callback) {
        GAT.webapi.getDelegatorList().
            onSuccess(function(resp) {
                for (var i in resp.delegators) {
                    var dlg = resp.delegators[i];
                    s.everybody[dlg.uuid] = new Delegator(dlg.first_name + " " + dlg.last_name,
                            dlg.uuid, dlg.phone_number, dlg.email)
                }
                callback();
            });
    };

    return s;
}();

