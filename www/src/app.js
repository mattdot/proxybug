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
rc.on("error", function(err) {
  console.log('redis client error: ' + err);
});

//called when subscribe to redis channel completes
rc.on("subscribe", function(channel, count) {
  console.log('subscribed to `' + channel + '`');
});

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
server.on('close', function() {
  console.log('server closing.');
  rc.end();
});

var subscriptions = new (function() {
  var self = this;
  var directory = {};
  self.add = function(s) {
      if(directory.hasOwnProperty(s)) {
        directory[s] += 1;
      }
      else {
        directory[s] = 1;
      }

      return directory[s];
  };
  self.remove = function(s, callback) {
      if(directory.hasOwnProperty(s)) {
        if(directory[s] > 1) {
          return --directory[s];
        }
        else {
          delete directory[s];
          return 0;
        }
      }
      else {
        console.log('removing a subscription which does not exist');
        return NaN;
      }
  };
})();

//respond to websocket connections
io.on('connection', function (socket) {
  console.log('client connected');
  console.log('handshake = %o', socket.handshake);

  socket.on('join', function(room) {
    console.log('joining room = ', room);
    //join the socket.io room
    socket.join(room);

    //subscribe to the topic on redis
    if(1 === subscriptions.add(room)) {
      rc.subscribe(room);
    }

    socket.addListener('disconnect', function() {
      console.log('web client disconnected');
      //rc.removeListener('message', onMessage);
      if(subscriptions.remove(room) < 1) {
        rc.unsubscribe(room);
      }
    });
  });
/*
  socket.on('disconnect', function() {
    console.log('web client disconnected');
    //rc.removeListener('message', onMessage);
    if(subscriptions.remove(topic) < 1) {
      rc.unsubscribe(topic);
    }
  });
  */
});

rc.on("message", function(channel, message) {
  console.log('event received on channel = ', channel);
  var obj = JSON.parse(message);
  io.sockets.in(channel).emit("proxy_event", obj);
});
