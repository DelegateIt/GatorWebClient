"use strict";

//gets overwritten in run
var loginDelegator = function() {};

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
        when("/register/", {
            "templateUrl": "/routes/register.html",
            "controller": "registerCtrl"
        }).
        when("/delegator/:delegatorId", {
            "templateUrl": "/routes/delegator.html",
            "controller": "delegatorCtrl"
        }).
        when("/delegator/", {
            "templateUrl": "/routes/delegator.html",
            "controller": "delegatorCtrl"
        }).
        otherwise({
            redirectTo: "/login/"
        });
}])
.run(["$timeout", "$location", "$cookies", "$window", function($timeout, $location, $cookies, $window) {
    GAT.view.updateAfter = $timeout;
    GAT.utils.logger.log("info", "Setting api mode to " + GAT.apiMode);
    GAT.webapi.setApiMode(GAT.apiMode);
    GAT.transaction.initialize();
    GAT.auth.onLogout.push(function() {
        $cookies.remove("userlogin");
        $window.location.reload("/login/");
    });
    GAT.auth.onLogin.push(function() {
        var user = GAT.auth.getLoggedInUser();
        $cookies.putObject("userlogin", user);
        GAT.delegator.loadList();
        GAT.delegator.loadAssignedTransactions(user.id);
        if($location.path() === "/login/")
            $location.path("/transaction/");
    });
    loginDelegator =  function() {
        if (GAT.auth.isLoggedIn())
            return;
        GAT.auth.loginDelegator().onError(function(resp) {
            if ("result" in resp && resp.result === 9) {
                GAT.utils.logger.log("info", "Delegator account does not exist. Redirecting to register page");
                $location.path("/register/");
            }
        });
    };
    if (typeof($cookies.getObject("userlogin")) !== "undefined") {
        GAT.utils.logger.log("info", "Logging in with stored token cookie");
        GAT.auth.setUser($cookies.getObject("userlogin"));
    } else {
        authLoad.loadedAuth();
    }
}])
.controller("mainCtrl", ["$scope", "$location", "$cookies",
        function($scope, $location, $cookies) {

    $scope.getApiMode = function() {
        return GAT.apiMode;
    };

    $scope.$on('$routeChangeSuccess', function() {

        if (GAT.auth.isLoggedIn() && $location.path() === "/login/")
            $location.path("/transaction/");

        if (!GAT.auth.isLoggedIn() && ($location.path() !== "/login/" &&
                $location.path() !== "/register/")) {
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

    $scope.isLoggedIn = GAT.auth.isLoggedIn;

    $scope.getDelegatorName = function() {
        var user = GAT.auth.getLoggedInUser();
        if (user === null || !(user.id in GAT.delegator.cache))
            return "Loading..";

        return GAT.delegator.cache[user.id].name;
    };

    $scope.login = function() {
        $("#LoginBtn").button("loading");
        FB.login(function(resp) {
            loginDelegator()
            $("#LoginBtn").button("reset");
        });
    };

    $scope.logout = GAT.auth.logout;

}])
.controller("delegatorCtrl", ["$scope", "$routeParams", function($scope, $routeParams) {

    $scope.selectedDelegator = null;

    $scope.isActiveOrder = function(transactionId) {
        return transactionId in GAT.transaction.cache &&
                GAT.transaction.cache[transactionId].state !==
                GAT.transaction.states.COMPLETED;
    };
    $scope.getDelegators = function() {
        return GAT.delegator.cache;
    };

    $scope.getDate = function(transactionId) {
        if (transactionId in GAT.transaction.cache)
            return GAT.utils.toDateString(GAT.transaction.cache[transactionId].startTimestamp);
        return "";
    };

    $scope.getCustomerName = function(transactionId) {
        if (transactionId in GAT.transaction.cache) {
            var transaction = GAT.transaction.cache[transactionId];
            if (transaction.customerId in GAT.customer.cache)
                return GAT.customer.cache[transaction.customerId].name;
            else
                GAT.customer.load(transaction.customerId);
        }
        return "";
    };

    $scope.getTitle = function(transactionId) {
        if (transactionId in GAT.transaction.cache) {
            var transaction = GAT.transaction.cache[transactionId];
            if (transaction.receipt.items.length === 0)
                return "Nothing purchased";
            else
                return transaction.receipt.items[0].name + "  -  ";
        } else {
            return "Loading...";
        }
    };

    if (typeof($routeParams.delegatorId) !== "undefined") {
        var delegatorId = $routeParams.delegatorId;
        var loaded = function() {
            GAT.transaction.loadList(GAT.delegator.cache[delegatorId].transactionIds);
            $scope.selectedDelegator = GAT.delegator.cache[delegatorId];
        };
        if (delegatorId in GAT.delegator.cache) {
            loaded();
        } else {
            GAT.delegator.getLoadListFuture().onSuccess(function() {
                loaded();
            });
        }
    }
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
        return GAT.delegator.cache;
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

    $scope.getLoggedInDelegator = function() {
        if (!GAT.auth.isLoggedIn())
            return null;
        return GAT.delegator.cache[GAT.auth.getLoggedInUser().id];
    };

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
                transaction.delegatorId == GAT.auth.getLoggedInUser().id;
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

    $scope.toDateString = function(timestamp) {
        if (timestamp == -1)
            return "Sending...";
        return GAT.utils.toDateString(timestamp);
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
        var delegatorId = GAT.auth.getLoggedInUser().id;
        GAT.delegator.assignUnhelpedTransaction(delegatorId).onResponse(function() {
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
}]).
controller("registerCtrl", ["$scope", "$location", function($scope, $location) {
    $scope.firstName = "";
    $scope.lastName = "";
    $scope.phoneNumber = "";
    $scope.email = "";

    $scope.onSubmit = function() {

        FB.getLoginStatus(function(resp) {
            if (resp.status !== "connected") {
                GAT.utils.logger.log("warning", "You are not logged into facebook");
                return;
            }
            var fbToken = resp.authResponse.accessToken;
            var fbId = resp.authResponse.userID;
            GAT.webapi.createDelegator($scope.firstName, $scope.lastName, $scope.phoneNumber,
                    $scope.email, fbId, fbToken).onSuccess(function() {
                        GAT.utils.logger.log("info", "Created delegator");
                        GAT.auth.loginDelegator().onSuccess(function() {
                            $location.path("/transaction/");
                        });
                    });
        });
    };
}]);

var GAT = GAT || {};

//apiMode can be 'local', 'test', and 'production
GAT.apiMode = "local";

GAT.view = function() {
    var s = {};

    s.updateAfter = null;

    return s;
}();
