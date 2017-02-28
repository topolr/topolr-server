var fs = require("fs");
var topolr = require("topolr-util");
var server = require("./../../server");
var ipc = require("./../../util/ipc");
var ipconfig = require("./../../../conf/server.json").ipc;
var util=require("./../../util/util");

var actions={
    checkDaemonThenData: function (type, data) {
        var ps = topolr.promise();
        var t = topolr.extend({}, ipconfig, {reconnect: false});
        ipc(t).on("data", function (data, conn, server) {
            if (data.type === "check") {
                if (type) {
                    conn.write({
                        type: type,
                        data: data || {}
                    });
                } else {
                    setTimeout(function () {
                        conn.end();
                        conn.unref();
                        ps.resolve();
                    }, 0);
                }
            } else if (data.type === type) {
                setTimeout(function () {
                    conn.end();
                    conn.unref();
                    ps.resolve(data.code);
                }, 0);
            } else {
                setTimeout(function () {
                    conn.end();
                    conn.unref();
                    ps.resolve();
                }, 0);
            }
        }).on('connect', function (conn) {
            conn.write({
                type: "check",
                data: {}
            });
        }).on("error", function () {
            ps.reject();
        }).connect();
        return ps;
    },
    checkDaemonWhenData: function (type, data) {
        var t = topolr.extend({}, ipconfig, {reconnect: false}), ps = topolr.promise();
        ipc(t).on("data", function (data, conn, server) {
            if (data.type === "check") {
                conn.write({
                    type: type,
                    data: data || {}
                });
            } else if (data.type === type) {
                if (data.code === "goon") {
                    conn.write({
                        type: type,
                        data: data || {}
                    });
                } else {
                    setTimeout(function () {
                        ps.resolve(data.code);
                        conn.end();
                        conn.unref();
                    }, 0);
                }
            } else {
                setTimeout(function () {
                    conn.end();
                    conn.unref();
                    ps.resolve();
                }, 0);
            }
        }).on('connect', function (conn) {
            conn.write({
                type: "check",
                data: {}
            });
        }).on("error", function (e) {
            ps.reject();
        }).connect();
        return ps;
    },
    startServer: function () {
        try {
            actions.checkDaemonThenData("startserver").done(function () {
                util.logger.log("actioncmd","Server is already started");
            }).fail(function () {
                actions.startDaemon();
                util.logger.log("actioncmd","Server is started");
            }).always(function () {
                process.exit(0);
            });
        } catch (e) {
            console.log(e);
        }
    },
    stopServer: function () {
        actions.checkDaemonThenData("stopserver").done(function () {
            util.logger.log("actioncmd","Server is stopped");
        }).fail(function () {
            util.logger.log("actioncmd","Server is not started");
        }).always(function () {
            process.exit(0);
        });
    },
    restartServer: function () {
        actions.checkDaemonThenData("restartserver").done(function () {
            util.logger.log("actioncmd","Server is restarted");
        }).fail(function () {
            actions.startDaemon();
            util.logger.log("actioncmd","Server is started");
        }).always(function () {
            process.exit(0);
        });
    },
    stopDaemon: function () {
        actions.checkDaemonThenData("stopprocess").done(function () {
            util.logger.log("actioncmd","Server service is stopped");
        }).fail(function () {
            util.logger.log("actioncmd","Server service is not started.daemon process is not running");
        }).always(function () {
            process.exit(0);
        });
    },
    restartDaemon: function () {
        actions.checkDaemonThenData("stopprocess").done(function () {
            actions.startDaemon();
            util.logger.log("actioncmd","Server service is restated");
        }).fail(function () {
            util.logger.log("actioncmd","Server service is running,stop it...");
            actions.startDaemon();
            util.logger.log("actioncmd","Server service is restated");
        }).always(function () {
            process.exit(0);
        });
    },
    daemonid: function () {
        actions.checkDaemonThenData("daemonid").done(function (a) {
            util.logger.log("daemonid",{
                desc:"Server service pid is",
                id:a
            });
        }).fail(function () {
            util.logger.log("actioncmd","Server is not started.start the server first");
        }).always(function () {
            process.exit(0);
        });
    },
    startDaemon: function () {
        var p = topolr.path(__dirname).parent().path();
        try {
            var server = require('child_process').spawn('node', [p + './../../bin/daemon.js'], {
                detached: true,
                stdio: ['ignore', fs.openSync(p+"./../../log/deamon.log", 'a'), fs.openSync(p+"./../../log/deamon.log", 'a')]
            });
            server.on("error", function (e) {
                console.log(e);
            });
            server.unref();
        } catch (e) {
            console.log(e.stack);
        }
        util.logger.log("daemonid",{
            desc:"Server service is started.daemon process pid is",
            id:server.pid
        });
    },
    getServerInfo: function () {
        actions.checkDaemonWhenData("getserverinfo").done(function (a) {
            if (a !== "noservice") {
                util.logger.log("servicestatus",a.data);
            } else {
                util.logger.log("actioncmd","Server is not started.start it first");
            }
        }).fail(function () {
            util.logger.log("actioncmd","Server is not started.start the server first");
        }).always(function () {
            process.exit(0);
        });
    }
};
module.exports=actions;