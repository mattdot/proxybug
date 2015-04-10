var http = require('http');
var express = require('express');
var redis = require('redis');
var path = require('path');
var socketio = require('socket.io');

//get environment variables
var port = process.env.PORT || 80;
var redisPort = process.env.REDIS_PORT || 6379;
var redisHost = process.env.REDIS_HOST || "proxybug.redis.cache.windows.net";
var redisPassword = process.env.REDIS_PASSWORD || "kCr/7K3pvhA/M68ewl47A3hQmhDskpBscoke0M2yH6o=";

//debug switches
redis.debug_mode = true;

console.log('starting up...');

//connect to redis
var rc = redis.createClient(redisPort, redisHost);
rc.auth(redisPassword, function() {
  console.log('connected to redis');
});

var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);
//io.set('origins', '*:*');
app.use(express.static(path.join(__dirname, '/public'), { index:['index.html'] } ));

//start the server
server.listen(port);

//respond to websocket connections
io.on('connection', function (socket) {
  console.log('client connected');
  rc.on("subscribe", function(channel, count) {
    console.log('subscribed to ' + channel);
  });

  rc.on("message", function(channel, message) {
    var obj = JSON.parse(message);
    console.log(obj);
  	socket.emit('news', obj);
  });

  socket.on("disconnect", function(reason) {
    rc.unsubscribe();
    rc.end();
  });

  rc.subscribe("proxied");
});