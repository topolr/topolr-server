var actions=require("./base/action");
module.exports= {
    command: "restart",
    desc: "restart service",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        actions.restartServer();
    }
};