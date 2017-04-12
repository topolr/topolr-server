var topolr = require("topolr-util");
var getBlank = function (len) {
    var str = "";
    for (var i = 0; i < len; i++) {
        str += " ";
    }
    return str;
};
var table = function (array) {
    var renderLine = function (len) {
        var str = "";
        for (var i = 0; i < len; i++) {
            str += "-";
        }
        return str;
    };
    var getCellStr = function (str, len, color, bgcolor) {
        var left = parseInt((len - str.toString().length) / 2);
        var right = len - left - str.toString().length;
        if (!bgcolor) {
            return topolr.logText("(color:" + color + "=>{{txt}})", {txt: getBlank(left) + str.toString() + getBlank(right)});
        } else {
            return topolr.logText("(color:" + color + ";background:" + bgcolor + "=>{{txt}})", {txt: getBlank(left) + str.toString() + getBlank(right)});
        }
    };
    var len = [], offset = 5;
    for (var i = 0; i < array.length; i++) {
        var a = array[i], t = 0;
        for (var n in a) {
            var b = a[n];
            if (len[t]) {
                if (len[t] < b.toString().length) {
                    len[t] = b.toString().length;
                }
            } else {
                len[t] = b.toString().length;
            }
            t++;
        }
    }
    var total = 0;
    for (var i = 0; i < len.length; i++) {
        len[i] = len[i] + offset * 2;
        total += len[i];
    }

    for (var i = 0; i < array.length; i++) {
        var line = "";
        var a = array[i], t = 0;
        var color = 26;
        for (var n in a) {
            var b = a[n];
            var bgcolor = "";
            if (i === 0) {
                color = 11;
                bgcolor = 18;
            } else {
                if (t % 2 === 0) {
                    color = "cyan";
                } else {
                    color = 45;
                }
            }
            line += getCellStr(b, len[t], color, bgcolor);
            if (t < len.length - 1) {
                line += "";
            }
            t++;
        }
        console.log(line);
    }
};

var list = function (obj) {
    var len = [0, 0];
    for (var i in obj) {
        if (i.toString().length > len[0]) {
            len[0] = i.toString().length;
        }
        var a = obj[i];
        if (a && a.toString().length > len[1]) {
            len[1] = a.toString().length
        }
    }
    for (var i = 0; i < len.length; i++) {
        len[i] = len[i] + 10;
    }
    for (var i in obj) {
        var line = "";
        var a = obj[i];
        var left = len[0] - 2 - (i ? i.toString().length : 0);
        line += topolr.logText("(color:cyan=>{{left}})  :  (color:11=>{{right}})", {
            left: getBlank(left) + i,
            right: a
        });
        console.log(line);
    }
};

var logger = {
    log: function (type, info) {
        if (logger[type]) {
            logger[type].call(logger, info);
        }
    },
    startproject: function (info) {
        topolr.log(" (color:cyan=>START) (color:11=>[{{name}}])", info);
    },
    scanproject: function (info) {
        topolr.log("  -(color:cyan=>[SCAN]) (color:green=>{{name}})", info);
    },
    startserver: function (info) {
        console.log("");
        if(info.http2){
            topolr.log(" (color:11=>SERVER STARTED WITH HTTP2[:{{port}}])", info);
        }else {
            topolr.log(" (color:11=>SERVER STARTED[:{{port}}])", info);
        }
        console.log("");
    },
    request: function (info) {
        var a = new Date();
        info.time = a.toLocaleString() + "." + a.getMilliseconds();
        topolr.log("  -(color:cyan=>[{{type}}]) (color:cyan=>[{{ip}}]) (color:11=>[{{project}}]) (color:green=>{{path}}) (color:cyan=>[{{time}}]) (color:cyan=>[{{id}}])", info);
    },
    controller: function (info) {
        topolr.log("    :(color:145=>controller) (color:11=>[{{controller}}]) (color:cyan=>action) (color:11=>[{{action}}])", info);
    },
    daocon: function () {
        topolr.log("    :(color:145=>dao connect)");
    },
    daoclose: function () {
        topolr.log("    :(color:145=>dao connect release)");
    },
    daorollback: function () {
        topolr.log("    :(color:145=>dao connect rollback)");
    },
    stransaction: function () {
        topolr.log("    :(color:145=>dao start transition)");
    },
    dtransaction: function () {
        topolr.log("    :(color:145=>dao transition commit)");
    },
    query: function (info) {
        topolr.log("    :(color:cyan=>query) (color:11=>[{{str}}]) (color:green=>[{{value}}])", {
            str: info.sql,
            value: JSON.stringify(info.value)
        });
    },
    error: function (info) {
        console.error(topolr.logText("    (color:red=>{{stack}})", {stack: info.stack || info}));
    },
    info: function (info) {
        topolr.log("    (color:145=>{{info}})", {info: info});
    },
    actioncmd: function (info) {
        topolr.log(" (color:11=>{{info}})", {info: info});
    },
    daemonid: function (info) {
        topolr.log(" (color:11=>{{desc}}) (color:green=>[{{id}}])", info);
    },
    servicestatus: function (a) {
        console.log("");
        list({
            PID: a.pid,
            arch: a.arch,
            platform: a.platform,
            rss: (a.memory.rss / (1024 * 1024)).toFixed(2) + "M",
            heapUsed: (a.memory.heapUsed / (1024 * 1024)).toFixed(2) + "M",
            heapTotal: (a.memory.heapTotal / (1024 * 1024)).toFixed(2) + "M"
        });
        console.log("");
    },
    projectlist: function (list) {
        console.log("");
        table(list);
        console.log("");
    },
    serverinfo: function (obj) {
        console.log("");
        list(obj);
        console.log("");
    },
    mock: function () {
        topolr.log("   - (color:green=>data by mock)");
    }
};
var url={
    getURLInfo: function (url) {
        var a = url.trim();
        var searchn = a.split("?");
        var search = "";
        var hash = "";
        var ct = "";
        if (searchn[1]) {
            var m = searchn[1].split("#");
            search = m[0];
            hash = m[1] || "";
            ct = searchn[0];
        } else {
            var hashn = a.split("#");
            if (hashn[1]) {
                hash = hashn[1];
            }
            ct = hashn[0];
        }
        var protocol = a.split(":")[0];
        var b = ct.substring(protocol.length + 3).split("/");
        var hostn = b.shift().split(":");
        var host = hostn[0];
        var port = hostn[1] || "";
        return {
            hash: hash ? "#" + hash : "",
            host: host,
            hostname: host,
            href: a,
            origin: protocol + "://" + host,
            pathname: "/" + b.join("/"),
            port: port,
            protocol: protocol,
            search: search ? "?" + search : ""
        };
    },
    getQueryParameters:function (url) {
        var a=url.split("?"),b=a[1],d={};
        if(b){
            var c=b.split("&");
            for(var i=0;i<c.length;i++){
                var e=c[i].split("=");
                if(e[0]) {
                    d[e[0]] = e[1]||"";
                }
            }
        }
        return d;
    },
    getQueryString:function (obj) {
        var r=[];
        for(var i in obj){
            r.push(i+"="+obj[i]);
        }
        return r.join("&");
    },
    concatQueryString: function (old, current) {
        var a=url.getQueryParameters(old),b=url.getQueryParameters(current);
        var d=url.getQueryString(topolr.extend(a,b));
        return old.split("?")[0]+"?"+d;
    }
}
module.exports = {
    logger: logger,
    url:url
};