var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/westeros";
var gameId;
var dbResponse;

//Handle from post data
var bodyParser = require('body-parser');
var connections = [];
var numberOfConnections = 2;

app.use(bodyParser.urlencoded({ extended: true })); 

//app.use(express.bodyParser());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
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
    gameId = createNewDocumentInDb(dbResponse);
  }
  else
  {
    //tell the connected client to wait until other players join
    console.log('waiting for more players to join');
    socket.emit("wait");
  }

  

  //socket request handlers

  socket.on('rollDice', function (data) {
      console.log("playerId" +data.playerId);
      var diceNumber = randomIntFromInterval(2,6);
      console.log("rollDice: "+diceNumber)
      io.sockets.emit('move', { playerId:data.playerId,diceNumber:diceNumber });
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

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function removePlayer(item)
{
var index = connections.indexOf(item);
connections.splice(index, 1);
}


function createNewDocumentInDb(dbResponse){
  var gameId;
  MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      db.collection("game").insertOne(dbResponse, function(err, res) {
        if (err) throw err;
        console.log("Game created in DB");
        db.close();
        startGame(dbResponse._id);
      });
    });
  
}

function startGame(gameId)
{
    console.log('starting game');
    console.log(gameId);
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
  "status": "InProgess",
  "numberOfPlayers": 2,
  "currentNumberOfPlayers": 2,
  "nextTurn": "1",
  "players": [{
      "id": 1,
      "balance": 1500,
      "networth": 1500,
      "status": "playing",
      "currentPositionInBoard": 1
    },
    {
      "id": 2,
      "balance": 1500,
      "networth": 1500,
      "status": "playing",
      "currentPositionInBoard": 1
    }
  ],
  "properties": [{
    "id": 1,
    "name": "winterfell",
    "owner": "noone",
    "color": "blue",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  }, {
    "id": 2,
    "name": "dragonstone",
    "owner": "noone",
    "color": "red",
    "rent": [5, 50, 150, 200],
    "currentState": 0
  }]
  }
  return db;
}