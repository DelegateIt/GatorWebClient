"use strict";

angular.module("app", ["ngRoute"])
.config(["$routeProvider", function($routeProvider) {
    $routeProvider.
        when("/customer/", {
            "templateUrl": "/routes/customer.html",
            "controller": "customerCtrl"
        }).
        when("/customer/:phoneNumber/", {
            "templateUrl": "/routes/customer.html",
            "controller": "customerCtrl"
        }).
        otherwise({
            redirectTo: "/customer"
        });
}])
.controller("mainCtrl", ["$scope",
        function($scope, $routeParams, contentView) {
    
    console.log("ENTERED MAIN");
}])
.controller("customerCtrl", ["$scope", "$routeParams",
        function($scope, $routeParams, contentView) {
    
    var phoneNumber = $routeParams.phoneNumber;
    console.log("PHONENUMBER", phoneNumber);
}]);

