var actions=require("./base/action");
var server = require("./../server");
var util=require("./../util/util");
var topolr=require("topolr-util");
module.exports= {
    command: "config",
    desc: "check and set server config\n" +
    topolr.logText("color:white=>--port        )")+": server port\n" +
    topolr.logText("color:white=>--log-path    )")+": server log path\n" +
    topolr.logText("color:white=>--log-level   )")+": server log level\n" +
    topolr.logText("color:white=>--log-maxsize )")+": server log maxsize\n" +
    "...",
    paras: ["--prop","value"],
    fn: function (parameters, cellmapping, allmapping) {
        if(parameters.length===0) {
            server.getServerConfig().done(function (data) {
                util.logger.log("serverinfo", data);
            });
        }else{
            var prop=parameters[0],value=parameters[1];
            if(prop.substring(0,2)==="--") {
                prop=prop.substring(2);
                server.setServerConfig(prop, value).done(function (a) {
                    util.logger.log("actioncmd", prop+" current is "+a);
                });
            }else{
                util.logger.log("actioncmd", "Prop name need '--' prefix");
            }
        }
    }
};