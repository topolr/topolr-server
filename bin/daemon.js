var fs = require("fs");
var topolr=require("topolr-util");
var ipc = require("./util/ipc");
var ipconfig = require("../conf/server.json").ipc;
var logconfig = require("../conf/server.json").log;
var Log=require("./base/log");
var worker = null;
var isrestart = true;
var _data = null;

var startServer = function () {
    var p = topolr.path(__dirname).parent().path();
    try {
        var logger=Log(logconfig),st=["ipc"];
        if(logconfig.level.indexOf("info")!==-1){
            st.push("pipe");
        }else{
            st.push("ignore");
        }
        if(logconfig.level.indexOf("error")!==-1){
            st.push("pipe");
        }else{
            st.push("ignore");
        }
        worker = require('child_process').spawn('node', [p + './bin/main.js'], {
            detached: true,
            stdio: st
        });
        worker.stdout&&worker.stdout.pipe(logger.out);
        worker.stderr&&worker.stderr.pipe(logger.err);
        worker.on("message", function (info) {
            _data = info;
        });
        worker.on('exit', function (code, signal) {
            if (isrestart) {
                console.log("[server] restart server automatic");
                startServer();
                isrestart = true;
            }
        });
    } catch (e) {
        console.log(e);
        isrestart = false;
    }
};
var actions = {
    stopService: function () {
        isrestart = false;
        if (worker) {
            worker.kill();
        }
        worker = null;
    },
    startserver: function () {
        if (!worker) {
            isrestart = true;
            startServer();
        }
    },
    restartserver: function (data) {
        actions.stopService();
        startServer();
    },
    stopserver: function (data) {
        actions.stopService();
    },
    check: function () {
        return "ok";
    },
    stopprocess: function () {
        return "stop";
    },
    getserverinfo: function () {
        if (!_data) {
            if (worker) {
                worker.send({
                    type: "getProcessInfo"
                });
                return "goon";
            } else {
                return "noservice";
            }
        } else {
            var a = _data;
            _data = null;
            return a;
        }
    },
    daemonid: function () {
        return process.pid;
    }
};
ipc(ipconfig).on('data', function (data, conn, server) {
    var type = data.type, _data = data.data, code = "";
    if (actions[type]) {
        try {
            code = actions[type](_data);
        } catch (e) {
            console.log(e.stack);
            code = "error";
        }
    } else {
        code = "nofind";
    }
    if (code === "stop") {
        conn.write({
            type: "stopprocess",
            code: "stopped"
        });
        conn.end();
        conn.unref();
        actions.stopService();
        setTimeout(function () {
            process.exit(0);
        }, 0);
    } else {
        conn.write({
            type: type,
            code: code
        });
    }
}).on("error", function (e) {
    console.log(e.stack);
}).listen();
process.on("exit", function () {
    actions.stopService();
});
process.on("uncaughtException", function (e) {
    console.log(e.stack);
});
startServer();