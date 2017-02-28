var actions=require("./base/action");
var server = require("./../server");
var util=require("./../util/util");
module.exports= {
    command: "info",
    desc: "check server basic info",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        var data=server.getServerInfo();
        util.logger.log("serverinfo", data);
    }
};