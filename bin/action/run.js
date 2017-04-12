module.exports= {
    command: "run",
    desc: "start server without deamon process and no log",
    paras: [],
    fn: function (parameters, cellmapping, allmapping) {
        require("./../boot").run();
    }
};