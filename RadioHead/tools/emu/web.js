var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

var Web = function () {
};

var clients;

app.listen(81);
function handler(req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }

            res.writeHead(200);
            res.end(data);
        });
}

io.on('connection' , function(socket) {
    socket.emit('init', clients);
});

Web.prototype.send = function (data) {
    io.emit('event', data);
};

Web.prototype.setClients = function (cl) {
    clients = cl;
};

module.exports = new Web();