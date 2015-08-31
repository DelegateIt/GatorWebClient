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
    if (typeof($cookies.get("delegatorId")) !== "undefined")
        GAT.delegator.login($cookies.get("delegatorId"));
    GAT.view.updateAfter = $timeout;
    GAT.transaction.initialize();

}])
.controller("mainCtrl", ["$scope", "$location", "$cookies",
        function($scope, $location, $cookies) {
    $scope.$on('$routeChangeSuccess', function() {

        if (GAT.delegator.isLoggedIn() && $location.path() === "/login/")
            $location.path("/transaction/");

        if (GAT.delegator.isLoggedIn() === false) {
            if (typeof($cookies.get("delegatorId")) !== "undefined")
                GAT.delegator.login($cookies.get("delegatorId"));
            else if ($location.path() != "/login/")
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
.controller("loginCtrl", ["$scope", "$location", "$cookies",
        function($scope, $location, $cookies) {

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
        $location.path("/login/");
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
}])
.controller("transactionCtrl", ["$scope", "$routeParams", "$location",
        function($scope, $routeParams, $location) {

    $scope.selected = null;

    $scope.getUnhelpedCustomerCount = function() {
        return GAT.transaction.unhelpedCustomerCount;
    };

    $scope.sendMessageText = "";

    $scope.getTransactions = function() {
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
        GAT.transaction.setState($scope.selected.id, GAT.transaction.states.CONFIRMED);
        $scope.sendMessageText = "Thank you for using DelegateIt!\n";
        $scope.sendMessageText += "Here is your transaction list\n";
        $scope.sendMessageText += "Please accept or deny the charges\n";
        var items = $scope.selected.receipt.items;
        for (var i = 0; i < items.length; i++) {
            $scope.sendMessageText += items[i].name + "  $" + items[i].cost + "\n";
        }
        $scope.sendMessage();
    };

    $scope.addCustomer = function() {
        GAT.transaction.retreiveNewCustomer(function(transaction) {
            $location.path("/transaction/" + transaction.id);
        });
    };

    if (typeof($routeParams.transactionId) !== "undefined") {
        var transactionId = $routeParams.transactionId;
        GAT.transaction.loadTransaction(transactionId, function(transaction) {
            $scope.selected = transaction;
        });
    }

}])
.controller("receiptItemCtrl", ["$scope", function($scope) {

    $scope.onNameChange = function() {
        $scope.item.name = $scope.itemName;
    };

    $scope.onCostChange = function() {
        $scope.item.cost = $scope.itemCost;
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
                if (item.name.trim() == "" || item.cost.trim() == "")
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

    var Delegator = function(name, id) {
        this.name = name;
        this.id = id;
    };

    s.everybody = {
        "0": new Delegator("Jon Doe", 0),
        "1": new Delegator("Jane Doe", 1),
        "7581433783743299856": new Delegator("George Farcasiu", "7581433783743299856")
    };

    s.me = null;

    s.isLoggedIn = function() {
        return s.me !== null;
    };

    s.login = function(delegatorId) {
        s.me = s.everybody[delegatorId];
        s.saveLogin(delegatorId);
    };

    s.logout = function() {
        s.me = null;
        s.deleteSavedLogin();
    };

    //overwritten by angular code
    s.saveLogin = function() { };
    //overwritten by angular code
    s.deleteSavedLogin = function() { };

    return s;
}();

