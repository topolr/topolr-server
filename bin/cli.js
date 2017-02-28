#!/usr/bin/env node  
var topolr = require("topolr-util");

var commander=topolr.commander();
[
    require("./action/version"),
    require("./action/info"),
    require("./action/run"),
    require("./action/start"),
    require("./action/stop"),
    require("./action/restart"),
    require("./action/status"),
    require("./action/daemonpid"),
    require("./action/config"),
    require("./action/projects"),
    require("./action/add"),
    require("./action/remove"),
    require("./action/edit")
].forEach(function (a) {
    var command=a.command, desc=a.desc, paras=a.paras, fn=a.fn;
    commander.bind(command,desc,paras,fn);
});
commander.call(process.argv.slice(2));
process.on("uncaughtException", function (e) {
    console.log(e.stack);
});