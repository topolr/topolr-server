var actions=require("./base/action");
var server = require("./../server");
var util=require("./../util/util");
module.exports= {
    command: "projects",
    desc: "list projects of server",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        server.scan().done(function (data) {
            data.unshift({
                name: "Project Name",
                path: "Project Path",
                isout: "Out Server"
            });
            util.logger.log("projectlist",data);
        });
    }
};