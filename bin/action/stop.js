var actions=require("./base/action");
module.exports= {
    command: "stop",
    desc: "stop all service",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        actions.stopDaemon();
    }
};