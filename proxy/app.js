/* Proxy */

var http = require('http');
//var httpProxy = require('http-proxy');
var net = require('net');
var url = require('url');
var redis = require('redis');

var port = process.env.PORT || 8080;
var host = process.env.HOST || '0.0.0.0';
var redisHost = process.env.REDIS_HOST || "proxybug.redis.cache.windows.net";
var redisPort = process.env.REDIS_PORT || 6379;
var redisPassword = process.env.REDIS_PASSWORD || "kCr/7K3pvhA/M68ewl47A3hQmhDskpBscoke0M2yH6o=";

redis.debug_mode = true;

var publisher = redis.createClient(redisPort, redisHost);
publisher.auth(redisPassword, function() {
  console.log('connected to redis');
});

function truncate(str) {
	var maxLength = 64;
	return (str.length >= maxLength ? str.substring(0,maxLength) + '...' : str);
}

function logRequest(req, res) {
	var loggedText = req.method + ' ' + truncate(req.url);
	publisher.publish("proxied", JSON.stringify({
		request : {
	    	url: req.url,
        	method: req.method
		},
		response : {
			status : res.statusCode,
			contentType : res.getHeader('content-type')
		}
	}));
	console.log(loggedText);
	//for (var i in req.headers)
	//	console.log(' * ' + i + ': ' + truncate(req.headers[i]));
}

var server = http.createServer(function(req, res){
	var uri = url.parse(req.url);
	var forwardOptions = {
		hostname : uri.hostname,
		path: uri.path,
		port: uri.port || 80,
		method: uri.method	
	};
	
	var freq = http.request(forwardOptions, function(fres) {
		fres.pipe(res, { end : true });
		
		logRequest(req, freq);
	});
	
	freq.on('error', function(error) {
		console.log('$$$$$$$$$$$$' + error);
	});
	
	req.pipe(freq, {end : true});
});

// when a CONNECT request comes in, the 'upgrade'
// event is emitted
/*
server.on('upgrade', function(req, socket, head) {
	logRequest(req);
	// URL is in the form 'hostname:port'
	var parts = req.url.split(':', 2);
	// open a TCP connection to the remote host
	var conn = net.connect(parts[1], parts[0], function() {
		// respond to the client that the connection was made
		socket.write("HTTP/1.1 200 OK\r\n\r\n");
		// create a tunnel between the two hosts
		socket.pipe(conn);
		conn.pipe(socket);
	});
});
 */
server.listen(port, function() {
  console.log('waiting to proxy...');
});
