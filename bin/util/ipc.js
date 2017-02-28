var net = require('net'), util = require('util'), EventEmitter = require('events').EventEmitter, Stream = require('stream').Stream, Lazy = require('lazy');
function IPC(options) {
    Stream.call(this);
    options = options || {};
    this.socketPath = (options.socketPath ? options.socketPath : false);
    this.port = (options.port ? options.port : 7100);
    this.host = (options.host ? options.host : 'localhost');
    this.reconnect = (options.reconnect ? options.reconnect : true);
    this.delayReconnect = (options.delayReconnect ? options.delayReconnect : 3000);
    this.dataType = (options.dataType ? options.dataType : 'json');
    this.numReconnects = 0;
}
util.inherits(IPC, Stream);

IPC.prototype.close = function () {
    var conn = this.conn;
    conn.end();
    conn.unref();
};
IPC.prototype.connect = function (port, host, cb) {
    var ths = this;
    if (port instanceof Function) {
        cb = port;
        port = null;
    }
    if (host instanceof Function) {
        cb = host;
        host = null;
    }
    port = port || ths.socketPath || ths.port;
    host = host || (!isNaN(port) ? ths.host : null);
    cb = cb || function () {};
    var conn;
    function onError(err) {
        conn.removeListener('connect', onConnect);
        if (err.code === 'ENOENT' && isNaN(port) && ths.port) {
            ths.emit('warn', new Error(err.code + ' on ' + port + ', ' + host));
            ths.connect(ths.port, cb);
            return;
        } else if (err.code === 'ECONNREFUSED' && ths.numReconnects) {
            ths.emit('warn', new Error(err.code + ' on ' + port + ', ' + host));
            return ths._reconnect(port, host);
        }
        cb(err);
        ths.emit('error', err);
    }
    function onConnect() {
        conn.removeListener('error', onError);
        ths._parseStream(conn);
        conn.on('close', function (had_error) {
            ths.emit('close', had_error, conn);
            if (ths.reconnect) {
                ths._reconnect(port, host);
            }
        });
        cb(null, conn);
        if (ths.numReconnects > 0) {
            ths.emit('reconnect', conn);
            ths.numReconnects = 0;
        } else {
            ths.emit('connect', conn);
        }
    }
    if (port && host) {
        conn = net.connect(port, host);
    } else {
        conn = net.connect(port);
    }
    ths.conn = conn;
    conn.once('error', onError);
    conn.once('connect', onConnect);
};

IPC.prototype._reconnect = function (port, host) {
    var ths = this;
    ths.numReconnects += 1;
    if (ths.delayReconnect) {
        setTimeout(function () {
            ths.connect(port, host);
        }, ths.delayReconnect);
    } else {
        ths.connect(port, host);
    }
};
IPC.prototype.listen = function (port, host, cb) {
    var ths = this;
    if (port instanceof Function) {
        cb = port;
        port = null;
    }
    if (host instanceof Function) {
        cb = host;
        host = null;
    }
    port = port || ths.socketPath || ths.port;
    host = host || (!isNaN(port) ? ths.host : null);
    cb = cb || function () {};
    function onError(err) {
        if (err.code === 'EACCES' && isNaN(port) && ths.port) {
            ths.emit('warn', new Error(err.code + ' on ' + port + ', ' + host));
            ths.listen(ths.port, cb);
            return;
        }
        cb(err);
        ths.emit('error', err);
    }
    function onConnection(conn) {
        ths._parseStream(conn, server);

        conn.on('close', function (had_error) {
            ths.emit('close', had_error, conn, server);
        });

        cb(null, conn, server);
        ths.emit('connection', conn, server);
    }
    var server = net.createServer();
    server.once('error', onError);
    server.once('listening', function () {
        server.removeListener('error', onError);
        ths.emit('listening', server);
    });
    server.on('connection', onConnection);
    if (port && host) {
        server.listen(port, host);
    } else {
        server.listen(port);
    }
};

IPC.prototype.start = function (port, host, cb) {
    var ths = this;
    if (port instanceof Function) {
        cb = port;
        port = null;
    }
    if (host instanceof Function) {
        cb = host;
        host = null;
    }
    port = port || ths.socketPath || ths.port;
    host = host || (!isNaN(port) ? ths.host : null);
    cb = cb || function () {};
    function onError(err) {
        if (err.code === 'ECONNREFUSED') {
            ths.emit('warn', new Error(err.code + ' on ' + port + ', ' + host));
            ths.listen(port, host);
        } else {
            ths.removeListener('listening', onListening);
            ths.removeListener('connection', onConnection);
            ths.removeListener('connect', onConnect);
            cb(err);
            ths.emit('error', err);
        }
    }
    function onListening(server) {
        ths.removeListener('error', onError);
        ths.removeListener('connection', onConnection);
        ths.removeListener('connect', onConnect);
        cb(null, true, server);
    }
    function onConnection(conn, server) {
        ths.removeListener('error', onError);
        ths.removeListener('listening', onListening);
        ths.removeListener('connect', onConnect);
        cb(null, true, conn, server);
    }
    function onConnect(conn) {
        ths.removeListener('error', onError);
        ths.removeListener('listening', onListening);
        ths.removeListener('connection', onConnection);
        cb(null, false, conn);
    }
    ths.once('error', onError);
    ths.once('listening', onListening);
    ths.once('connection', onConnection);
    ths.once('connect', onConnect);
    ths.connect(port, host);
};

IPC.prototype._parseStream = function (conn, server) {
    var ths = this;
    Lazy(conn).lines.map(String).forEach(ths._onData.bind(ths, conn, server));
    var old_write = conn.write;
    conn.write = function () {
        if (conn.writable) {
            if (ths.dataType === 'json') {
                arguments[0] = JSON.stringify(arguments[0]) + '\n';
            }
            return old_write.apply(conn, arguments);
        } else {
            ths.emit('warn', new Error('Connection is not writable.'));
        }
    };
};
IPC.prototype._onData = function (conn, server, data) {
    if (this.dataType === 'json') {
        data = JSON.parse(data);
    }
    if (server) {
        this.emit('data', data, conn, server);
    } else {
        this.emit('data', data, conn);
    }
};
module.exports = function (option) {
    return new IPC(option);
};