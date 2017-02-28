var actions = {
    getProcessInfo: function () {
        return {
            type: "getProcessInfo",
            data: {
                version: process.version,
                pid: process.pid,
                title: process.title,
                uptime: process.uptime(),
                arch: process.arch,
                memory: process.memoryUsage(),
                platform: process.platform,
                path: process.installPrefix
            }
        };
    }
};
process.on("message", function (data) {
    if (data && data.type && actions[data.type]) {
        var a = null;
        try {
            a = actions[data.type]();
        } catch (e) {
            a = {
                type: "error",
                data: e.stack
            };
        }
        process.send(a);
    } else {
        process.send("");
    }
});
var server = require("./server");
server.run();