var app = require('express')();
var server = require('http').Server(app);
const http = require('http');

http.get('http://localhost:8080/alexa', (resp) => {
  let data = '';
 
  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
    console.log(data);
    
  });
 
 
}).on("error", (err) => {
  console.log("Error: " + err.message);
 
});