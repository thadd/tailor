var app = require('http').createServer(handler);
var url = require('url');
var path = require('path');
var fs = require('fs');
var io = require('socket.io').listen(app);
var spawn = require('child_process').spawn;

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

io.sockets.on('connection', function(socket) {

  socket.on('request log', function(data) {
    console.log("Received a log request for: " + data.file_path);

    var tail = spawn('tail', ['-f', '-n 100', data.file_path]);

    tail.stdout.on('data', function(data) {
      socket.emit('log update', { data: data.toString() });
    });

    tail.stderr.on('data', function(data) {
      socket.emit('log update', { data: 'error: ' + data});
      console.log('error!');
    });

    tail.on('exit', function(code) {
      socket.emit('log update', { data: 'child process exited with code ' + code});
      console.log('child process exited with code ' + code);
      socket.close();
    });

    socket.on('disconnect', function() {
      console.log("Lost connection, killing spawned processes");
      tail.kill();
    });
  });

});

app.listen(8080, "127.0.0.1");
console.log("Server started on http://127.0.0.1:8080");