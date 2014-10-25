var http = require('http');
var fs = require('fs');
var redis = require('redis');

var redisPort = process.env.REDIS_PORT || 6379;
var redisHost = process.env.REDIS_HOST || "proxybug.redis.cache.windows.net";
var redisPassword = process.env.REDIS_PASSWORD || "kCr/7K3pvhA/M68ewl47A3hQmhDskpBscoke0M2yH6o=";

redis.debug_mode = true;

var rc = redis.createClient(redisPort, redisHost);
rc.auth(redisPassword, function() {
  console.log('connected to redis');
});

console.log('starting up...');

var app = http.createServer(function (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
});

var io = require('socket.io')(app);

io.on('connection', function (socket) {
  rc.on("subscribe", function(channel, count) {
  });

  rc.on("message", function(channel, message) {
  	socket.emit('news', message);
  });

  socket.on("disconnect", function(reason) {
    rc.unsubscribe();
    rc.end();
  });

  rc.subscribe("proxied");
});

app.listen(80);
