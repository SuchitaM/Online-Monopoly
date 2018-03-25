var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/westeros";
var gameId;
var dbResponse;
var ObjectID = require('mongodb').ObjectID;
var requestAction = false;
var isAlexa = false;
var buildAction = false;

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', {msg:msg.text,playerId:msg.playerId});
  });
});

//Handle from post data
var bodyParser = require('body-parser');
var connections = [];
var locations = [];
var numberOfConnections = 2;

app.use(bodyParser.urlencoded({ extended: true })); 

//app.use(express.bodyParser());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/alexa', function (req, res, next) {
console.log("request from alexa. Yayyy");
 response = {
      message:'Rolling the dice'      
   };
res.send(response);
data = { playerId: '1', rollNumber: '0' }
isAlexa = true;
getDocumentFromDb(gameId, processRollDice,data);
});


server.listen(8080, function() {
  console.log('Server running at http://127.0.0.1:8080/');
});

//handle socket connections
io.sockets.on('connection', function(socket) {
  
  connections.push(socket.id); 
  //console.log(connections);
  
  //wait until u have min required players to start a game
  if(connections.length == numberOfConnections)
  {
    //game can start. We Have required number of players
    //create new document in db for this game
    dbResponse = getInitialDb();
    createNewDocumentInDb(dbResponse, function(id) {
      gameId = id;  
    });
    
  }
  else if(connections.length < numberOfConnections)
  {
    //tell the connected client to wait until other players join
    console.log('waiting for more players to join');
    socket.emit("wait");
  }
  else{
    console.log('already two players playing. Please wait');
    socket.emit("gamefull");
  }

  //socket request handlers

  socket.on('getLocation', function (data){
    locations.push([data.latitude,data.longitude]);
    console.log(locations.length,numberOfConnections);

    if(locations.length == numberOfConnections){
      io.sockets.emit('updateLocation',{data:locations});
    }
  });

  socket.on('rollDice', function (data) {
    
      isAlexa = false;
      getDocumentFromDb(gameId, processRollDice,data);
    });

  socket.on('buy', function (data) {
      getDocumentFromDb(gameId, processBuyProperty,data);
    });

  socket.on('build', function (data) {
      getDocumentFromDb(gameId, processBuildProperty,data);
  });

  socket.on('closeConnection',function(){
      console.log('Client disconnects'  + socket.id);
      socket.disconnect();
      removePlayer(socket.id);
  });

  socket.on('disconnect', function() {
      console.log('Got disconnected!'  + socket.id);
      socket.disconnect();
      removePlayer(socket.id);
   });
});


function processRollDice(response,socketData){
        dbResponse = JSON.parse(response);
        playerId = Number(socketData.playerId);
        if(Number(socketData.rollNumber) == 0)
          var diceNumber = randomIntFromInterval(2,5);
        else
          var diceNumber = Number(socketData.rollNumber);
        var action="none";
        var from = dbResponse.players[playerId-1].currentPositionInBoard;
        var nextPosition = dbResponse.players[playerId-1].currentPositionInBoard = findNextPositionInBoard(dbResponse,playerId,diceNumber);    
        var property = getProperty(dbResponse,nextPosition);
        var message = "";
        if(property.color!="none")
        {
          switch(property.owner)
          {
            case "noone":
                      
                      requestAction = true;
                      buildAction = false;
                      action="buy";
                      dbResponse.nextTurn = "noone";
                      break;
            case playerId:
                      message = "Player"+playerId+" Landing at his property. He is safe.";
                      buildAction = true;
                      requestAction = false;
                      action="build";
                      dbResponse.nextTurn = "noone";
                      break;
            default:
                      requestAction = false;
                      buildAction = false;
                      dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
                      var rent= property.rent[property.currentState];
                      message = "Player"+playerId+" paid rent of $"+rent+" to player"+property.owner;
                      dbResponse.players[playerId-1].balance -= rent;
                      dbResponse.players[playerId-1].networth -= rent;
                      dbResponse.players[property.owner-1].balance += rent;
                      dbResponse.players[property.owner-1].networth += rent;
          }
        }
        else
        {
            //logic for valar morgulis, jail and non-color properties
            if(property.name == "gotojail") {
                message = "You have landed in Jail. Pay $50 fine to get out of jail";
                //for jail reduce bal and nw by 50
                dbResponse.players[playerId-1].balance -= 50;
                dbResponse.players[playerId-1].networth -= 50;
            } else if(property.name == "valarmorghulis") {
                var luckyDraw = Math.floor(Math.random()*(4)+1);
                switch(luckyDraw)
                {
                  case 1:
                      message = "Valarmorghulis. Unexpected Hospital Charges $50";
                      dbResponse.players[playerId-1].balance -= 50;
                      dbResponse.players[playerId-1].networth -= 50;
                      break;
                  case 2:
                      message = "Valarmorghulis. You have been elected as Warden of the North. Pay $50";
                      dbResponse.players[playerId-1].balance -= 100;
                      dbResponse.players[playerId-1].networth -= 100;
                      break;
                  case 3:
                      message = "Valarmorghulis. You have won a lucky draw of Iron Bank. Collect $50";
                      dbResponse.players[playerId-1].balance += 50;
                      dbResponse.players[playerId-1].networth += 50;
                      break;
                  case 4:
                      message = "Valarmorghulis. You have won the battle. Collect $100";
                      dbResponse.players[playerId-1].balance += 100;
                      dbResponse.players[playerId-1].networth += 100;
                      break; 
                }               
            } else if(property.name == "valardohaeris" ) {
                var luckyDraw = Math.floor(Math.random()*(4)+1);
                switch(luckyDraw)
                {
                  case 1:
                      message = "Valardohaeris. Make general repairs on your property – Pay $50";
                      dbResponse.players[playerId-1].balance -= 50;
                      dbResponse.players[playerId-1].networth -= 50;
                      break;
                  case 2:
                      message = "Valardohaeris. You lost a battle. Pay $100";
                      dbResponse.players[playerId-1].balance -= 100;
                      dbResponse.players[playerId-1].networth -= 100;
                      break;
                  case 3:
                      message = "Valardohaeris. You have won a token. Collect $50";
                      dbResponse.players[playerId-1].balance += 50;
                      dbResponse.players[playerId-1].networth += 50;
                      break;
                  case 4:
                      message = "Valardohaeris. You have won a dragon egg. Collect $100";
                      dbResponse.players[playerId-1].balance += 100;
                      dbResponse.players[playerId-1].networth += 100;
                      break; 
                }     
            }
          requestAction = false;
          buildAction = false;
          dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
        }

        //todo
        //if player cross start(id : 1), add 200 to bal and nw
        if (from > nextPosition) {
            console.log("Congrats, You have completed a round")
            dbResponse.players[playerId-1].balance += 200;
            dbResponse.players[playerId-1].networth += 200;
        }
        //console.log(dbResponse);
        updateDocument(gameId, dbResponse);
        if(isAlexa){
          message = "Triggered through Alexa" + message;
        }
io.sockets.emit('move', { requestAction: requestAction,buildAction: buildAction, action:action,message:message, from:from,to:nextPosition,playerId : playerId, diceNumber:diceNumber, dbResponse: dbResponse });
    }

function processBuyProperty(response,socketData){
    dbResponse = JSON.parse(response);
    playerId = Number(socketData.playerId); 
    var currentPosition = dbResponse.players[playerId-1].currentPositionInBoard 
    var property = getProperty(dbResponse,currentPosition); 
        
    if(socketData.answer=="yes")
    {
        
        dbResponse.players[playerId-1].balance -= property.value;
        //dbResponse.players[playerId-1].networth += property.value;
        dbResponse.properties[currentPosition-1].owner = playerId;
        message = "player"+playerId+" bought "+property.name;
    }
    else{
      message = "player"+playerId+" skipped buying "+property.name;
    }
    dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
    updateDocument(gameId, dbResponse);
    io.sockets.emit('nextPlayerTurn',{dbResponse:dbResponse,message:message});
}

function processBuildProperty(response, socketData){
    dbResponse = JSON.parse(response);
    playerId = Number(socketData.playerId);  

    if(socketData.answer=="yes")
    {
        var currentPosition = dbResponse.players[playerId-1].currentPositionInBoard;
        var property = getProperty(dbResponse,currentPosition); 
        dbResponse.players[playerId-1].balance -= property.buildValue;
        dbResponse.properties[currentPosition-1].currentState += 1;
        message = "Player"+playerId+" built a castle on "+property.name;
    }

    dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
    updateDocument(gameId, dbResponse);
    io.sockets.emit('nextPlayerTurn',{dbResponse:dbResponse,message:message});
}

function findNextTurn(dbResponse,playerId){
  return playerId == 1 ? 2 : 1;
}

function findNextPositionInBoard(dbResponse,playerId,diceNumber){
  var newPosition;
  dbResponse.players.forEach(function(player){
    if (player.id == playerId) {
      //TODO: do updates here
      newPosition = player.currentPositionInBoard + diceNumber;
      if(newPosition > 26) {
        newPosition = newPosition - 26;
      } 
    }
  });
  return newPosition;
}

function getProperty(dbResponse,nextPosition){
  return dbResponse.properties[nextPosition-1];
}

function getDocumentFromDb(gameId, callback,socketData) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection('game', function(error, collection) {
      collection.findOne({_id: gameId}, function(err, response) {
        if (err) throw err;
        var stringified = JSON.stringify(response);
        callback(stringified,socketData);
      });
    });
  });
}

function updateDocument(gameId, dbResponse){
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    delete dbResponse._id;
    db.collection("game").replaceOne({_id: ObjectID(gameId)}, dbResponse, true);
  });
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function removePlayer(item)
{
var index = connections.indexOf(item);
connections.splice(index, 1);
locations = [];
}


function createNewDocumentInDb(dbResponse, callback) {
  var gameId;
  MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      db.collection("game").insertOne(dbResponse, function(err, res) {
        if (err) throw err;
        console.log("Game created in DB");
        db.close();
        gameId = dbResponse._id;
        startGame(gameId);
        callback(gameId);
      });
    });
}

function startGame(gameId)
{
    console.log('Starting game');
    //tell all clients to start the game and send their respective player id 
    for(var i=0; i<connections.length;i++)
    {
      var playerId = i + 1;
      io.to(connections[i]).emit('gameStart',{gameId:gameId,playerId:playerId,dbResponse:dbResponse});
    }
}



function getInitialDb()
{
  var db = {
  "status": "InProgress",
  "numberOfPlayers": 2,
  "currentNumberOfPlayers": 2,
  "nextTurn": "1",
  "players": [{
      "id": 1,
      "balance": 5000,
      "networth": 5000,
      "status": "playing",
      "currentPositionInBoard": 1
    },
    {
      "id": 2,
      "balance": 5000,
      "networth": 5000,
      "status": "playing",
      "currentPositionInBoard": 1
    }
  ],
  "properties": [{
    "id": 1,
    "name": "start",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 2,
    "name": "stormsend",
    "owner": "noone",
    "color": "brown",
    "value" : 200,
    "buildValue": 100,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 3,
    "name": "dragonstone",
    "owner": "noone",
    "color": "brown",
    "value" : 180,
    "buildValue": 100,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 4,
    "name": "valardohaeris",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 5,
    "name": "moatcailin",
    "owner": "noone",
    "color": "brown",
    "value" : 180,
    "buildValue": 100,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 6,
    "name": "gotojail",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 7,
    "name": "winterfell",
    "owner": "noone",
    "color": "blue",
    "value" : 320,
    "buildValue": 50,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 8,
    "name": "pyke",
    "owner": "noone",
    "color": "blue",
    "value" : 300,
    "buildValue": 60,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 9,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 10,
    "name": "castleblack",
    "owner": "noone",
    "color": "blue",
    "value" : 300,
    "buildValue": 80,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 11,
    "name": "casterlyrock",
    "owner": "noone",
    "color": "yellow",
    "value" : 200,
    "buildValue": 80,
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 12,
    "name": "valardohaeris",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 13,
    "name": "crakehall",
    "owner": "noone",
    "color": "yellow",
    "value" : 100,
    "buildValue": 20,
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 14,
    "name": "gotojail",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 15,
    "name": "cleganskeep",
    "owner": "noone",
    "color": "yellow",
    "value" : 160,
    "buildValue": 50,
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 16,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 100,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 17,
    "name": "meereen",
    "owner": "noone",
    "color": "orange",
    "value" : 280,
    "buildValue": 60,
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 18,
    "name": "astapor",
    "owner": "noone",
    "color": "orange",
    "value" : 260,
    "buildValue": 40,
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 19,
    "name": "gotojail",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 20,
    "name": "yunkai",
    "owner": "noone",
    "color": "orange",
    "value" : 260,
    "buildValue": 40,
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 21,
    "name": "qarth",
    "owner": "noone",
    "color": "green",
    "value" : 240,
    "buildValue": 50,
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 22,
    "name": "slaversbay",
    "owner": "noone",
    "color": "green",
    "value" : 220,
    "buildValue": 40,
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 23,
    "name": "nightswatch",
    "owner": "noone",
    "color": "white",
    "value" : 100,
    "buildValue": 20,
    "rent": [5, 20, 50, 100],
    "currentState": 0
  },{
    "id": 24,
    "name": "braavos",
    "owner": "noone",
    "color": "green",
    "value" : 200,
    "buildValue": 40,
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 25,
    "name": "crasterskeep",
    "owner": "noone",
    "color": "white",
    "value" : 120,
    "buildValue": 10,
    "rent": [5, 20, 50, 100],
    "currentState": 0
  },{
    "id": 26,
    "name": "hardhome",
    "owner": "noone",
    "color": "white",
    "value" : 100,
    "buildValue": 10,
    "rent": [5, 20, 50, 100],
    "currentState": 0
  }]
  }
  return db;
}
