var server = require("./../server");
var util=require("./../util/util");
module.exports= {
    command: "version",
    desc: "show server version",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        var v=server.version();
        util.logger.log("actioncmd",v);
    }
};