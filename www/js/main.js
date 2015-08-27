"use strict";

var GAT = GAT || {};

GAT.view = function() {
    var s = {};

    s.updateAfter = null;

    return s;
}();

angular.module("app", ["ngRoute"])
.config(["$routeProvider", function($routeProvider) {
    $routeProvider.
        when("/transaction/", {
            "templateUrl": "/routes/transaction.html",
            "controller": "transactionCtl"
        }).
        when("/transaction/:transactionId/", {
            "templateUrl": "/routes/transaction.html",
            "controller": "transactionCtl"
        }).
        otherwise({
            redirectTo: "/transaction/"
        });
}])
.run(["$timeout", function($timeout) {
    GAT.view.updateAfter = $timeout;
    GAT.transaction.initialize();
}])
.controller("mainCtrl", ["$scope", "$timeout",
        function($scope, $timeout) {
    //Nothing here yet
}])
.controller("transactionCtl", ["$scope", "$routeParams", "$location",
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
        $scope.selected.setState(GAT.transaction.states.CONFIRMED);
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

    $scope.addItem = function() {
        $scope.getReceipt().addItem("", 0.0);
    };

    $scope.deleteItem = function(index) {
        $scope.getReceipt().deleteItem(index);
    };
}]);

