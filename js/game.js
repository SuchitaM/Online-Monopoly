var socket = io.connect('http://localhost:8080');
var app = angular.module("westeros", []); 
var dbResponse;

app.controller("myCtrl", function($scope) {
      $scope.message = "";
      $scope.balance = 0;
      $scope.networth = 0;
      
      $scope.rollDice = function(){
         console.log('rolling the dice');
         socket.emit('rollDice', { playerId: sessionStorage.playerId }); 
    }
    //Game cannot start. Have to wait until server tells me to start.
    //disable roll button
    socket.on('wait',function(data){
        console.log('waiting for more players to join');
        $scope.message = "waiting for more players to join";
        $scope.disableButton = true;
        $scope.$apply();
    });

    socket.on('gameStart',function(data){
        console.log('Starting game. My player id is '+data.playerId);
        sessionStorage.playerId = data.playerId;
        sessionStorage.gameId = data.gameId;
        dbResponse = data.dbResponse;
        $scope.balance = dbResponse.players[Number(sessionStorage.playerId)-1].balance;
        $scope.networth = dbResponse.players[Number(sessionStorage.playerId)-1].networth;
        $scope.disableButton = toggleRollButton();
        if($scope.disableButton)
          rotateBoard(document.getElementById('gameboard'),180);
        $scope.message = "Game Started! "+getNextTurn($scope.disableButton)+" turn";        
        $scope.$apply();
    });
    
    socket.on('move',function(data){
      console.log('move player'+data.playerId+' : ' + data.diceNumber);
      //animateMovement(data.playerId,data.diceNumber);
      movePlayerInUi(data.playerId,data.diceNumber);
  });

});

