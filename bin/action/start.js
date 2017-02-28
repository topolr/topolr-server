var actions=require("./base/action");
module.exports= {
    command: "start",
    desc: "start service",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        actions.startServer();
    }
};