var Client = function (socket) {
    var self = this;
    self.socket = socket;
    self.address = null;
    self.write = function(data) {
        self.socket.write(data);
    };
};

module.exports = Client;