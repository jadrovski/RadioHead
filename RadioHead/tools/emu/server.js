var net = require('net');
var bufferPack = require('bufferpack');
var web = require('./web');
var Client = require('./client');

var clients = [];
web.setClients(clients);

var RH_TCP_MESSAGE_TYPE_THISADDRESS = 1; // Specifies the thisAddress of the connected sketch
var RH_TCP_MESSAGE_TYPE_PACKET = 2; // Message to/from the connected sketch
var RH_TCP_MESSAGE_TYPE_BUSY = 3;
var BPS = 1200; // 1200 baud

var channelPacket = null;
var channelPacketObject = null;
var channelPacketReceived = null;
var channelPacketFromClient = null;

var server = net.createServer(function (socket) {
    process.stdout.write("CONNECTED: " + socket['remoteAddress'] + ":" + socket['remotePort'] + "\n");

    var client = new Client(socket);
    clients.push(client);
    socket.client = client;

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
            socket.client.address = address;
            process.stdout.write("RADIO ADDRESS: " + address + "\n");
        } else if (type == RH_TCP_MESSAGE_TYPE_PACKET) {
            //todo: probability
            if (channelPacket !== null) {
                process.stdout.write("\n##################### COLLISION #####################\n");
                process.stdout.write(packetToString(getObjectFromPacket(data)));
                process.stdout.write(packetToString(getObjectFromPacket(channelPacket)));
                process.stdout.write("##################### COLLISION #####################\n\n");

                clearChannel();
            } else {
                channelBusy(true);

                channelPacket = data;
                channelPacketObject = getObjectFromPacket(channelPacket);
                channelPacketFromClient = socket.client;
                channelPacketReceived = process.hrtime();
            }
        }
    });

    socket.on('end', function () {
        resetSocket(socket);
    });

    socket.on('error', function(err){
        if(err.code == 'ECONNRESET') {
            resetSocket(this);
        }
    });

    function resetSocket(socket) {
        clients.splice(clients.indexOf(socket.client), 1);
        process.stdout.write("DISCONNECTED: " + socket['remoteAddress'] + ":" + socket['remotePort'] + "\n");
    }
});

function channelBusy(busy) {
    process.stdout.write("  SET BUSY CHANNEL: " + busy + "\n");
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        client.write(bufferPack.pack("!LBB", [2, RH_TCP_MESSAGE_TYPE_BUSY, busy ? 1 : 0]));
    }
}

function clearChannel() {
    channelPacket = null;
    channelPacketObject = null;
    channelPacketReceived = null;
    channelPacketFromClient = null;
    channelBusy(false);
}

function broadcast() {
    if (channelPacket !== null) {
        var elapsed = process.hrtime(channelPacketReceived)[1] / 1e6;
        var transmittingTime = (channelPacket.length * 8 / BPS) * 1000;
        if (elapsed > transmittingTime) {
            for (var i = 0; i < clients.length; i++) {
                var client = clients[i];
                if (channelPacketFromClient === client) {
                    continue;
                }
                client.write(channelPacket);

                //web.send(channelPacketObject);
            }
            var stringedPacket = packetToString(channelPacketObject);
            process.stdout.write(stringedPacket);
            clearChannel();
        }
    }
    setTimeout(broadcast, 1);
}

function getObjectFromPacket(packet) {
    var to = bufferPack.unpack("B", packet, 5)[0];
    var from = bufferPack.unpack("B", packet, 6)[0];
    var id = bufferPack.unpack("B", packet, 7)[0];
    var flags = bufferPack.unpack("B", packet, 8)[0];
    var payload = bufferPack.unpack(packet.length - 9 + "s", packet, 9)[0];

    var ack = flags & 0x80;

    return {
        to: to,
        from: from,
        id: id,
        flags: flags,
        payload: payload,
        ack: ack
    };
}

function packetToString(packetObject) {
    var result = '';
    if (packetObject.ack) {
        result += "<<< ACK ";
        result += packetObject.from + "->" + packetObject.to;
        result += ", id: " + packetObject.id + "\n";
    } else {
        result += ">>> MSG ";
        result += packetObject.from + "->" + packetObject.to;
        result += ", id: " + packetObject.id;
        result += ", payload: " + packetObject.payload + "\n";
    }
    return result;
}

server.listen(4000, '127.0.0.1');
setTimeout(broadcast, 1);