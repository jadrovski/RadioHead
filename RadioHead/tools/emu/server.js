var net = require('net');
var bufferPack = require('bufferpack');

var clients = [];

var RH_TCP_MESSAGE_TYPE_THISADDRESS = 1; // Specifies the thisAddress of the connected sketch
var RH_TCP_MESSAGE_TYPE_PACKET = 2; // Message to/from the connected sketch
var RH_TCP_MESSAGE_TYPE_BUSY = 3;
var BPS = 1200; // 1200 baud

var channelPacket = null;
var channelPacketReceived = null;
var channelFromSocket = null;

var server = net.createServer(function (socket) {
    clients.push({socket: socket});

    socket.on('data', function (data) {
        if (data.length < 4) {
            return;
        }
        var len = bufferPack.unpack("!L", data)[0];
        if (data.length < len + 4) {
            return;
        }

        var type = bufferPack.unpack("B", data, 4)[0];

        if (type == RH_TCP_MESSAGE_TYPE_THISADDRESS) {
            var address = bufferPack.unpack("B", data, 5)[0];
            getClient(socket).thisAddress = address;
            process.stdout.write("RADIO ADDRESS: " + address + "\n");
        } else if (type == RH_TCP_MESSAGE_TYPE_PACKET) {
            for (var i = 0; i < clients.length; i++) {
                var client = clients[i];
                if (client.socket === socket) {
                    continue;
                }
                //todo: probability
                if (channelPacket !== null) {
                    process.stdout.write("\n##################### COLLISION #####################\n");
                    printPacket(data);
                    printPacket(channelPacket);
                    process.stdout.write("##################### COLLISION #####################\n\n");

                    channelPacket = null;
                    channelFromSocket = null;
                    channelPacketReceived = null;
                    channelBusy(false);
                } else {
                    channelPacket = data;
                    channelFromSocket = socket;
                    channelPacketReceived = process.hrtime();
                    channelBusy(true);
                }
            }
        }
    });

    socket.on('end', function () {
        clients.splice(clients.indexOf(socket), 1);
        process.stdout.write("DISCONNECTED: " + socket['remoteAddress'] + ":" + socket['remotePort'] + "\n");
    });

    process.stdout.write("CONNECTED: " + socket['remoteAddress'] + ":" + socket['remotePort'] + "\n");
});

function channelBusy(busy) {
    process.stdout.write("  SET BUSY CHANNEL: " + busy + "\n");
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        var data = bufferPack.pack("!LBB", [2, RH_TCP_MESSAGE_TYPE_BUSY, busy ? 1 : 0]);
        client.socket.write(data);
    }
}

function getClient(socket) {
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].socket === socket) {
            return clients[i];
        }
    }
}

function broadcast() {
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (channelPacket === null) {
            break;
        }
        if (channelFromSocket === client.socket) {
            continue;
        }

        var elapsed = process.hrtime(channelPacketReceived)[1] / 1e6;
        var transmittingTime = (channelPacket.length * 8 / BPS) * 1000;
        if (elapsed > transmittingTime) {
            printPacket(channelPacket);
            client.socket.write(channelPacket);
            channelPacket = null;
            channelBusy(false);
        }
    }
    setTimeout(broadcast, 1);
}

function printPacket(packet) {
    var to = bufferPack.unpack("B", packet, 5)[0];
    var from = bufferPack.unpack("B", packet, 6)[0];
    var id = bufferPack.unpack("B", packet, 7)[0];
    var flags = bufferPack.unpack("B", packet, 8)[0];
    var payload = bufferPack.unpack(packet.length - 9 + "s", packet, 9)[0];

    var ack = flags & 0x80;
    if(ack) {
        process.stdout.write("<<< ACK ");
        process.stdout.write(from + "->" + to);
        process.stdout.write(", id: " + id + "\n");
    } else {
        process.stdout.write(">>> MSG ");
        process.stdout.write(from + "->" + to);
        process.stdout.write(", id: " + id);
        process.stdout.write(", payload: " + payload + "\n");
    }
}

server.listen(4000, '127.0.0.1');

setTimeout(broadcast, 1000);