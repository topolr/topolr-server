var topolr=require("topolr-util");
var cluster = require('cluster');
var util=require("./util/util");
var manager=require("./server/manager");
var server=function () {
    var workerSize=manager.getWorkerSize();
    if (cluster.isMaster) {
        util.logger.log("serverstart",{
            host:manager.getHost(),
            port:manager.getPort(),
            protocol:manager.getProtocol(),
            url:manager.getURL(),
            projects:manager.listProjectsSync(),
            workerSize:workerSize,
            http2:manager.isHttp2(),
            info:manager.getServerInfo()
        });
        var service = require("./server/service.js");
        for (var i = 0; i < workerSize; i++) {
            var a=cluster.fork();
            a.send({
                type:"startserver",
                data:a.id
            });
        }
        cluster.on("message", function (worker,data) {
            var type=data.type,_data=data.data,id=data.id;
            var r=service.excute(data);
            if(r&&r.then&&r.done){
                r.then(function (a) {
                    worker.send({
                        id:id,
                        data:a
                    });
                },function (e) {
                    worker.send({
                        id:id,
                        data:e
                    });
                });
            }else {
                worker.send({
                    id: id,
                    data: r
                });
            }
        });
        cluster.on('exit', function (worker) {
            console.log('worker' + worker.id + ' exit.');
            var a=cluster.fork();
            a.send({
                type:"startserver",
                data:a.id
            });
        });
    } else {
        require("./server/process.js")();
    }
};


var actions = {
    getProcessInfo: function () {
        return {
            type: "getProcessInfo",
            data: {
                version: process.version,
                pid: process.pid,
                title: process.title,
                uptime: process.uptime(),
                arch: process.arch,
                memory: process.memoryUsage(),
                platform: process.platform,
                path: process.installPrefix
            }
        };
    }
};
process.on("message", function (data) {
    if (data && data.type && actions[data.type]) {
        var a = null;
        try {
            a = actions[data.type]();
        } catch (e) {
            a = {
                type: "error",
                data: e.stack
            };
        }
        process.send(a);
    } else {
        process.send("");
    }
});
process.on("uncaughtException", function (e) {
    console.log(e.stack);
});
new server();
module.exports={};