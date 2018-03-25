var socket = io.connect('http://localhost:8080');
var app = angular.module("westeros", []); 
var dbResponse;
var chatMsg;

function send(text) {
  playerId = Number(sessionStorage.playerId);
  socket.emit('chat message',{text: text, playerId:playerId});
}

function appendChatLeft(text,playerId) {
  const chatLogs = document.querySelector('.chatlogs');
  const chat1 = document.createElement('div');
  chat1.className = "chat friend";
  chat1.innerHTML = '<img src="images/dragon'+playerId+'.png" height="25" width = "25"/><p class="chat-message">'+text+'</p>';
  chatLogs.appendChild(chat1); 
}

// function appendChatRight(text, chatMsg) {
//   const chatLogs = document.querySelector('.chatlogs');
//   const chat1 = document.createElement('div');
//   chat1.className = "chat friend right";
//    if(chatMsg == 1) {
//    chat1.innerHTML = `<p class=\'chat-message\'>${text}</p><img src=\'images/dragon1.png\'>`;
//    } else {
//    chat1.innerHTML = `<p class=\'chat-message\'>${text}</p><img src=\'images/dragon2.png\'>`;
//    }   
//   chatLogs.appendChild(chat1); 
// }

socket.on('chat message', function(msg){
  appendChatLeft(msg.msg,msg.playerId);
});

app.controller("myCtrl", function($scope) {
      $scope.message = "";
      $scope.commentary = "";
      $scope.balance = 0;
      $scope.networth = 0;
      $scope.properties = 0;
      

      $scope.rollDice = function(){
         console.log('rolling the dice');

         socket.emit('rollDice', { playerId: sessionStorage.playerId, rollNumber: document.getElementById("textbox").value});  

       }

    $scope.showProperties = function()
    {      
          showPropertiesPopup();
    }
    //Game cannot start. Have to wait until server tells me to start.
    //disable roll button
    socket.on('wait',function(data){
        console.log('Waiting for more players to join');
        $scope.message = "Waiting for more players to join";
        $scope.disableButton = true;
        $scope.$apply();
    });

    socket.on('gameStart',function(data){
        console.log('Starting game. My player id is '+data.playerId);
        sessionStorage.playerId = data.playerId;
        sessionStorage.gameId = data.gameId;
        dbResponse = data.dbResponse;
        updateBoard(dbResponse);
        
        
	      //initialize();
        /*if($scope.disableButton)
        {
          rotateBoard(document.getElementById('gameboard'),180);
          rotateBoard(document.getElementById('dialogdiv'),180);
        }*/
       });
    
    socket.on('move',function(data){
      console.log(data);
      //animateMovement(data.playerId,data.diceNumber);
      dbResponse = data.dbResponse;
      var dices = ['&#9856;', '&#9857;', '&#9858;', '&#9859;', '&#9860;' ];
      clearInterval(t);
      $scope.commentary = data.message;
      document.getElementById("dice").innerHTML = dices[data.diceNumber-1];
      animateMovement(data.playerId,data.from,data.to,data.diceNumber,dbResponse,data.requestAction, data.buildAction);
      //processPlayerLanding(data.playerId,data.from,data.to,dbResponse,data.requestAction);
      
    });

    socket.on('nextPlayerTurn',function(data){
      console.log(data);
      //animateMovement(data.playerId,data.diceNumber);
      $scope.commentary = data.message;
      dbResponse = data.dbResponse;
      updateBoard(dbResponse);
    });

    socket.on('updateLocation',function(data){
      console.log(data);
      initialize(data);
      //animateMovement(data.playerId,data.diceNumber);
      
    });

    updateBoard = function(dbResponse){
        if(sessionStorage.playerId == "1") {
          document.getElementById("playerId").innerHTML = "Player 1";
          document.getElementById("dragonImage").src = "images/dragon1.png";
        } else {
          document.getElementById("playerId").innerHTML = "Player 2";
          document.getElementById("dragonImage").src = "images/dragon2.png";
        }
        $scope.balance = dbResponse.players[Number(sessionStorage.playerId)-1].balance;
        $scope.networth = dbResponse.players[Number(sessionStorage.playerId)-1].networth;
        $scope.disableButton = toggleRollButton(dbResponse);
        if(!$scope.disableButton){
          stopstart();
        }
        else
        {
          document.getElementById("dice").innerHTML = "";
        }
        if(dbResponse.nextTurn == "noone") {
        }else {
        $scope.message = getNextTurn($scope.disableButton)+" turn"; }
        $scope.properties = getProperties(dbResponse);       
	      google.charts.setOnLoadCallback(drawChart1);
        google.charts.setOnLoadCallback(drawChart2);
        google.charts.setOnLoadCallback(drawAxisTickColors);
        $scope.$apply();
    }

});

 google.charts.load('current', {'packages':['corechart']});
 

function drawChart1() {

var array1 =[ ['Owner', 'Properties']];
for(i=1;i<26;i++)
{

if("1" == dbResponse.properties[i-1].owner)
{
  //propertyName = "winterfell";
  array1.push([dbResponse.properties[i-1].name,1]);
}
}
var data = google.visualization.arrayToDataTable(array1);

   var options = {
     title: 'Player 1\'s Properties',pieSliceText: "none",colors: ['#FF7F50', '#DC143C', '#E9967A', '#8B0000']
   };
   var chart = new google.visualization.PieChart(document.getElementById('piechart1'));
 chart.draw(data, options);
 }  

 function drawChart2() {
  
  var array1 =[ ['Owner', 'Properties']];
  for(i=1;i<26;i++)
  {
  
  if("2" == dbResponse.properties[i-1].owner)
  {
    //propertyName = "winterfell";
    array1.push([dbResponse.properties[i-1].name,1]);
  }
  }
  var data = google.visualization.arrayToDataTable(array1);
  
     var options = {
       title: 'Player 2\'s Properties',pieSliceText: "none",colors: ['#556B2F', '#BDB76B', '#228B22', '#8FBC8F']
     };
     var chart = new google.visualization.PieChart(document.getElementById('piechart2'));
   chart.draw(data, options);
   }  
  
//google charts

function drawAxisTickColors() {
      
      var data = google.visualization.arrayToDataTable([
        ['Player', 'Balance', { role: 'style' }],
        ['Player 1', dbResponse.players[0].balance, '#CD5C5C'],            // RGB value
        ['Player 2', dbResponse.players[1].balance, '#3CB371'],            // English color name

      //['Platinum', 21.45, 'color: #e5e4e2' ], // CSS-style declaration
     ]);
      
      var options = {
       title: 'Balance'
     };

      var chart = new google.visualization.ColumnChart(document.getElementById('barchart'));
      chart.draw(data,options);
    }
	
     var map;
    
    // The JSON data
    var json = [
      
      {
            "id": "0001",
            "latitude":37.542571,
            "longitude":-121.993037,
          },
          {
            "id": "0002",
            "latitude": 37.525400,
            "longitude":-122.037764,
          },
    ];
    
    function initialize(data) {
      
      // Giving the map some options
      json[0].latitude = data.data[0][0];
      json[0].longitude = data.data[0][1];
      json[1].latitude = data.data[1][0];
      json[1].longitude = data.data[1][1];
      var mapOptions = {
        zoom: 9,
        center: new google.maps.LatLng(37.3382,-121.8863)
      };
    
      map = new google.maps.Map(document.getElementById('map'), mapOptions);
      
      
      for(var i = 0; i < json.length; i++) {
        var obj = json[i];
        var image= "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FF0000";
          
        // Adding a new marker for the object
        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(obj.latitude,obj.longitude),
          map: map,
          icon: image,
          title: obj.id // this works, giving the marker a title with the correct title
        });
      } // end loop
       
    }

    //geolocation
    var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };
    
    
    var tryGeolocation = function() {
      jQuery.post( "https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyDCa1LUe1vOczX1hO_iGYgyo8p_jYuGOPU", function(success) {
        socket.emit('getLocation',{latitude:success.location.lat,longitude:success.location.lng});

      })
      .fail(function(err) {
        alert("API Geolocation error! \n\n"+err);
      });
    };

    tryGeolocation();
