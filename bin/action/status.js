var actions=require("./base/action");
module.exports= {
    command: "status",
    desc: "show the server running status",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        actions.getServerInfo();
    }
};