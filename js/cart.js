var socket = io.connect('http://localhost:8080');
var app = angular.module("myShoppingList", []); 
app.controller("myCtrl", function($scope) {
    $scope.quantity = 1;
    $scope.totalPrice = "$58";
    $scope.products = [{name: "Hound's Chicken", quantity: 1, price : "$10"},{name: "Fire and Blood spicy pizza", quantity: 1, price : "$12"},{name: "Spices are coming", quantity: 1, price : "$16"},{name: "Winterfell special", quantity: 1, price : "$20"}];
    $scope.logs =  ["Arun Created Group Cart", "Raksha added Veggie pizza", "Raksha is looking at fire and blood pizza"];
  
    $scope.removeItem = function (x) {
        console.log('emit pizza' + x)
        socket.emit('removePizza', { pizza: x });
       }
    $scope.addQuantity = function(x){
       console.log('add quantity' + x)
       socket.emit('addQuantity', { pizza: x }); 
    }

    $scope.reduceQuantity = function(x){
       console.log('reduce quantity' + x)
       if($scope.products[x].quantity>1)
         socket.emit('reduceQuantity', { pizza: x }); 
    }


    socket.on('removePizza', function (data) {
        console.log('message from server' + data.pizza + "price: " + data.totalPrice);
        $scope.products.splice(data.pizza, 1);
        $scope.totalPrice = data.totalPrice;
        $scope.$apply();
       });

    socket.on('addQuantity', function (data) {
        console.log('message from server - addQuantity:' + data.pizza);
        $scope.products[data.pizza].quantity++;
        $scope.totalPrice = data.totalPrice;
        $scope.$apply();
       });

    socket.on('reduceQuantity', function (data) {
        console.log('message from server - reduceQuantity:' + data.pizza);
        $scope.products[data.pizza].quantity--;
        $scope.totalPrice = data.totalPrice;
        $scope.$apply();
       });

    $scope.closeConnection = function () {
        console.log('close connection');
        socket.emit('closeConnection');
    }

});



  