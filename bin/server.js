var topolr=require("topolr-util");
var cluster = require('cluster');
var util=require("./util/util");
var manager=require("./server/manager");
var event=require("./server/event");
var server=function () {
    var workerSize=manager.getWorkerSize();
    if (cluster.isMaster) {
        var ths=this;
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
        var service = require("./server/service.js")(this);
        for (var i = 0; i < workerSize; i++) {
            var a=cluster.fork();
            a.send(event.createEvent({
                pid:process.pid,
                id:"main"
            },event.STARTSERVER,a.id));
        }
        cluster.on("message", function (worker,event) {
            var eventType=event.type;
            if(server.handler[eventType]){
                server.handler[eventType].call(ths,worker,event);
            }
        });
        cluster.on('exit', function (worker) {
            var a=cluster.fork();
            a.send(event.createEvent({
                pid:process.pid,
                id:"main"
            },event.STARTSERVER,a.id));
        });
    } else {
        require("./server/process.js")();
    }
};
server.handler={
    task:function (worker,_event) {
        var data=_event.data;
        var type=data.type,_data=data.data,id=data.id;
        var r=service.excute(data);
        if(r&&r.then&&r.done){
            r.then(function (a) {
                worker.send(event.createEvent(_event.target,event.TYPE_TO_TASK,{
                    id:id,
                    data:a
                }));
            },function (e) {
                worker.send(event.createEvent(_event.target,event.TYPE_TO_TASK,{
                    id:id,
                    data:e
                }));
            });
        }else {
            worker.send(event.createEvent(_event.target,event.TYPE_TO_TASK,{
                id:id,
                data:r
            }));
        }
    },
    message:function (worker,event) {
        var data=event.data;
        for(var i in cluster.workers){
            if(cluster.workers[i]!==worker){
                cluster.workers[i].send(event.createEvent(event.target,event.TYPE_TO_MESSAGE,data));
            }
        }
    }
};
server.prototype.postMessage=function (data) {
    var a=null;
    for(var i in cluster.workers){
        a=cluster.workers[i];
        break;
    }
    a.send(event.createEvent({
        pid:process.pid,
        id:"main"
    },event.TYPE_TO_MESSAGE,data));
};
server.prototype.getProcessInfo=function () {
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
};

var _server=new server();
process.on("message", function (data) {
    if (data && data.type && actions[data.type]) {
        var a = null;
        try {
            a = _server[data.type]();
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

module.exports=_server;