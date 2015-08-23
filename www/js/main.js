"use strict";

var GAT = GAT || {};

angular.module("app", ["ngRoute"])
.config(["$routeProvider", function($routeProvider) {
    $routeProvider.
        when("/customer/", {
            "templateUrl": "/routes/customer.html",
            "controller": "customerCtrl"
        }).
        when("/customer/:customerId/", {
            "templateUrl": "/routes/customer.html",
            "controller": "customerCtrl"
        }).
        otherwise({
            redirectTo: "/customer/0"
        });
}])
.controller("mainCtrl", ["$scope",
        function($scope, $routeParams, contentView) {
    //Nothing for now
}])
.controller("customerCtrl", ["$scope", "$routeParams",
        function($scope, $routeParams, contentView) {

    $scope.customerList = [];

    $scope.selected = null;

    $scope.messageList = [];

    $scope.sendMessageText = "";

    $scope.getReceipt = function() {
        if ($scope.selected == null)
            return null;
        return $scope.selected.getActiveReceipt();
    };

    $scope.sendMessage = function() {
        GAT.webapi.sendMessage($scope.selected.id, $scope.sendMessageText, function() {});
        $scope.sendMessageText = "";
    };

    $scope.finalizeReceipt = function() {
        console.log("Receipt finalized");
    };

    if (typeof($routeParams.customerId) !== "undefined") {
        var customerId = $routeParams.customerId;
        GAT.webapi.getCustomer(customerId, function(success, customer) {
            $scope.selected = customer;
        });
        GAT.webapi.getMessages(customerId, 0, function(success, messageList) {
            $scope.messageList = messageList;
        });
    }

    GAT.webapi.previewCustomers(function(success, customerList) {
        $scope.customerList = customerList;
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

