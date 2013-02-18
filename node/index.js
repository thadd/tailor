var app = require('http').createServer(handler);
var url = require('url');
var path = require('path');
var fs = require('fs');
var io = require('socket.io').listen(app);
var spawn = require('child_process').spawn;

// Just serve up files from the /site directory
function handler(request, response) {
  var pathname = url.parse(request.url).pathname;

  if (pathname == "/") {
    pathname = "index.html";
  }

  var filename = path.join(__dirname, "..", "site", pathname);

  fs.exists(filename, function(exists) {

    if (!exists) {

      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found: " + filename + "\n");
      response.end();

    } else {

      fs.readFile(filename, "binary", function(err, file) {

        if (err) {

          response.writeHead(500, {"Content-Type": "text/plain"});
          response.write("Attempted filename: " + filename + "\n");
          response.write(err + "\n");
          response.end();

        } else {

          response.writeHead(200);
          response.write(file, "binary");
          response.end();

        }
      });
    }
  });
}

// Set up the IO socket
io.sockets.on('connection', function(socket) {

  // Client is requesting a log file
  socket.on('request log', function(data) {

    console.log("Request received for " + data.file_path);

    // Spawn a tail process for the file in question
    var tail = spawn('tail', ['-f', '-n 100', data.file_path]);

    // Hook up STDOUT for tail to send data back to client
    tail.stdout.on('data', function(data) {
      socket.emit('log update', { data: data.toString() });
    });

    // Report errors back to client
    tail.stderr.on('data', function(data) {
      socket.emit('log update', { data: 'ERROR: ' + data});
    });

    // Report exit back to client
    tail.on('exit', function(code) {
      socket.emit('log update', { data: 'Tail process exited with code: ' + code});
      socket.disconnect();
    });

    // When the client disconnects, kill their tail process
    socket.on('disconnect', function() {
      tail.kill();
    });
  });

});

// Only listen on loopback for security
app.listen(7065, "127.0.0.1");
console.log("Server started on http://127.0.0.1:7065");