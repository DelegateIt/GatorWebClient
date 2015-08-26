"use strict";

var GAT = GAT || {};

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
.controller("mainCtrl", ["$scope",
        function($scope, $routeParams, contentView) {
    //Nothing for now
}])
.controller("transactionCtl", ["$scope", "$routeParams",
        function($scope, $routeParams, contentView) {

    $scope.selected = null;

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
    };

    $scope.finalizeReceipt = function() {
        console.log("Receipt finalized");
    };

    $scope.addCustomer = function() {
        GAT.transaction.retreiveNewCustomer(function(transaction) {
            $scope.selected = transaction;
        });
    };

    if (typeof($routeParams.transactionId) !== "undefined") {
        var transactionId = $routeParams.transactionId;
        GAT.transaction.loadTransaction(transactionId, function(transaction) {
            $scope.selected = transaction;
        });
    }

    GAT.transaction.onNewTransaction.push(function() {
        $scope.$apply();
    });

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

