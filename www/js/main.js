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

    $scope.sendMessage = function() {
        GAT.webapi.sendMessage($scope.selected.id, $scope.sendMessageText, function() {});
        $scope.sendMessageText = "";
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
}]);

