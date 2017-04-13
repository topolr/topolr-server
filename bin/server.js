var topolr=require("topolr-util");
var cluster = require('cluster');
var cpuNums = require('os').cpus().length;
var util=require("./util/util");
var manager=require("./server/manager");
var server=function () {
    if (cluster.isMaster) {
        util.logger.log("serverstart",{
            host:manager.getHost(),
            port:manager.getPort(),
            protocol:manager.getProtocol(),
            url:manager.getURL(),
            projects:manager.listProjectsSync(),
            workerSize:cpuNums,
            http2:manager.isHttp2(),
            info:manager.getServerInfo()
        });
        var service = require("./server/service.js");
        for (var i = 0; i < cpuNums; i++) {
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
        });
    } else {
        require("./server/process.js")();
    }
};
server.prototype.run=function () {
};
module.exports=new server();