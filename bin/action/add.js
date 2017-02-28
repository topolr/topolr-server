var actions=require("./base/action");
var server = require("./../server");
var util=require("./../util/util");
module.exports= {
    command: "add",
    desc: "add a project to the server",
    paras: ['projectName','projectPath'],
    fn: function (parameters, cellmapping, allmapping) {
        var projectName=parameters[0],projectPath=parameters[1];
        if (projectName && projectPath) {
            server.create(projectName, projectPath).done(function () {
                util.logger.log("actioncmd","Add project complete");
            });
        } else {
            util.logger.log("actioncmd","parameter error.first parameter is project name,the other is project path");
        }
    }
};