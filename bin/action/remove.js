var actions=require("./base/action");
var server = require("./../server");
var util=require("./../util/util");
module.exports= {
    command: "remove",
    desc: "remove porject with project name",
    paras: ["projectName"],
    fn: function (parameters, cellmapping, allmapping) {
        var projectName=parameters[0];
        if (projectName) {
            server.remove(projectName).done(function () {
                util.logger.log("actioncmd","Project has removed");
            });
        } else {
            util.logger.log("actioncmd","You must input a project name");
        }
    }
};