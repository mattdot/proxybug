/* Proxy */

var http = require('http');
//var httpProxy = require('http-proxy');
var net = require('net');
var url = require('url');
var redis = require('redis');
var azure = require('azure-storage');

var port = process.env.PORT || 8080;
var host = process.env.HOST || '0.0.0.0';
var redisHost = process.env.REDIS_HOST || "proxybug.redis.cache.windows.net";
var redisPort = process.env.REDIS_PORT || 6379;
var redisPassword = process.env.REDIS_PASSWORD || "kCr/7K3pvhA/M68ewl47A3hQmhDskpBscoke0M2yH6o=";
var proxyRealm = process.env.PROXY_REALM || "proxybug-dev.cloudapp.net";
var blobAccount = process.env.AZURE_STORAGE_ACCOUNT;
var blobKey = process.env.AZURE_STORAGE_ACCESS_KEY;

redis.debug_mode = false;

var publisher = redis.createClient(redisPort, redisHost);
publisher.auth(redisPassword, function() {
  console.log('connected to redis');
});

var retryOperations = new azure.ExponentialRetryPolicyFilter();
var blobSvc = azure.createBlobService('', blobAccount, blobKey).withFilter(retryOperations);

function truncate(str) {
	var maxLength = 64;
	return (str.length >= maxLength ? str.substring(0,maxLength) + '...' : str);
}

/// <summary>
/// Logs information about the request to realtime listeners over redis
/// and saves information to blob storage for
/// </summary> 
function logRequest(req, res, identity) {
	publisher.incr("reqkey", function(err, key) {
		var logEntry = {
			key : key,
			identity : {
				username : identity.username
			},
			request : {
		    	url: req.url,
	        	method: req.method,
				headers: req.headers
			},
			response : {
				status : res.statusCode,
				contentType : res.headers['content-type'],
				size : res.headers['content-length'],
				headers: res.headers
			}
		};
		
		var serialized = JSON.stringify(logEntry)
		publisher.publish("proxied", serialized);
		//console.log(logEntry.request.url + '\n');
		
		console.log(serialized + '\n\n');
		
		//todo: write entry to docdb
		//todo: write req/res to blob storage
		blobSvc.createContainerIfNotExists(identity.username, function(error, result, response){
  			if(!error) {
    			// Container exists and allows 
    			// anonymous read access to blob 
    			// content and metadata within this container
				var resblob = blobSvc.createBlob(identity.username, 'response_' + logEntry.key, azure.Constants.BlobConstants.BlobTypes.BLOCK);
				res.pipe(resblob);
				
				var reqblob = blobSvc.createBlob(identity.username, 'r' + logEntry.key + '/request', azure.Constants.BlobConstants.BlobTypes.BLOCK);
				res.pipe(reqblob);
  			}
		});
	});
}

function logError(req, err, id) {
	//todo: actually log the error
	console.log('PROXY_ERROR:' + err + ' ' + req.url);
}

/// <summary>
/// </summary>
function authenticate(req, res) {	
	var proxyAuth = req.headers["proxy-authorization"];
	if(proxyAuth) {
		//todo: make this much more robust!
		var encoded = proxyAuth.split(' ')[1];
		var b = new Buffer(encoded, 'base64');
		var raw = b.toString();
		var parts = raw.split(':');
		
		var user = {
			username : parts[0],
			password : parts[1]
		};
		
		//todo:actually do authorization
		var authorized = (user.password === 'password!');
		
		if(authorized) {
			return user;
		}
	}
	else {
		console.log('no proxy-authorization header\n');
	}
	
	res.writeHead(407, {
  		'Proxy-Authenticate': 'Basic realm=' + proxyRealm
	});
	res.end();
}

var server = http.createServer(function(req, res){
	
	var id = authenticate(req, res);
	if(!id) {
		return;	
	}
	
	var uri = url.parse(req.url);
	var forwardOptions = {
		hostname : uri.hostname,
		path: uri.path,
		port: uri.port || 80,
		method: uri.method	
	};
	
	//todo: prevent localhost or local to proxy
	
	var freq = http.request(forwardOptions, function(fres) {
		fres.pipe(res, { end : true });
		
		logRequest(req, fres, id);
	});
	
	freq.on('error', function(error) {
		//todo: what should we send back to the end user here??
		
		logError(req, error, id);
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
