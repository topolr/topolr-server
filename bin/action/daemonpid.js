var actions=require("./base/action");
module.exports= {
    command: "daemonpid",
    desc: "show the service process id",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        actions.daemonid();
    }
};