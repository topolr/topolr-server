var topolr=require("topolr-util");
var fs=require("fs");
var manager=function () {
    this.serverConfig = require("./../../conf/server");
    this.webConfig = require("./../../conf/web");
    this.packageConfig = require("./../../package");
    this.basePath = require("path").resolve(__dirname, "./../../").replace(/\\/g, "/") + "/";
};
manager.prototype.createProject = function (name, path, remotePath) {
    path = path.replace(/\\/g, "/");
    if (path[path.length - 1] !== "/") {
        path = path + "/";
    }
    var p = this.basePath, q = p + "webapps/" + name + ".json";
    return topolr.file(q).write(JSON.stringify({
        name: name,
        path: path,
        remotePath: remotePath || ""
    }, null, 4));
};
manager.prototype.listProjects = function () {
    var path = this.basePath + "webapps", ths = this, queue = topolr.queue(), ps = topolr.promise(), ls = [];
    queue.complete(function () {
        ps.resolve(ls);
    });
    topolr.file(path).subscan(function (pa, isfile) {
        if (!isfile) {
            var n = pa.substring(path.length + 1, pa.length - 1);
            ls.push({
                name: n,
                path: pa.substring(0, pa.length - 1),
                isout: false
            });
        } else {
            if (pa.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    topolr.file(b).read().then(function (data) {
                        var n = JSON.parse(data);
                        ls.push({
                            name: n.name,
                            path: n.path.substring(0, n.path.length - 1),
                            isout: true
                        });
                        tss.next(n.name);
                    });
                }, function () {
                    this.next();
                }, pa);
            }
        }
    });
    queue.run();
    return ps;
};
manager.prototype.listProjectsSync = function () {
    var path = this.basePath + "webapps", ths = this, ls = [];
    topolr.file(path).subscan(function (pa, isfile) {
        if (!isfile) {
            var n = pa.substring(path.length + 1, pa.length - 1);
            ls.push({
                name: n,
                path: pa.substring(0, pa.length - 1),
                isout: false
            });
        } else {
            if (pa.indexOf(".json") !== -1) {
                var data = topolr.file(pa).readSync();
                var n = JSON.parse(data);
                ls.push({
                    name: n.name,
                    path: n.path.substring(0, n.path.length - 1),
                    isout: true
                });
            }
        }
    });
    return ls;
};
manager.prototype.getAllRemoteProjects = function () {
    var path = this.basePath + "webapps", queue = topolr.queue(), ps = topolr.promise(), ls = [];
    queue.complete(function () {
        ps.resolve(ls);
    });
    topolr.file(path).getSubPaths().then(function (data) {
        data.file.forEach(function (a) {
            if (a.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    topolr.file(b).read().then(function (data) {
                        var n = JSON.parse(data);
                        if (n.remotePath) {
                            ls.push(n);
                        }
                        tss.next(n);
                    });
                }, function () {
                    this.next();
                }, a);
            }
        });
        queue.run();
    });
    return ps;
};
manager.prototype.removeProject = function (projectName) {
    var path = this.basePath + "webapps" + "/" + projectName, ps = topolr.promise();
    if (projectName !== "ROOT") {
        if (topolr.file(path + ".json").isExists()) {
            topolr.file(path + ".json").remove();
            ps.resolve();
        } else {
            if (topolr.file(path).isExists()) {
                topolr.file(path).remove();
                ps.resolve();
            } else {
                ps.resolve();
            }
        }
    } else {
        if (topolr.file(path + ".json").isExists()) {
            topolr.file(path + ".json").remove();
        } else {
            util.logger.log("actioncmd", "Default ROOT can not remove");
        }
        ps.resolve();
    }
    return ps;
};
manager.prototype.editProject = function (projectName, path, remotePath) {
    return this.createProject(projectName, path, remotePath);
};
manager.prototype.setServerConfig = function (prop, value) {
    var a = this.serverConfig;
    var b = prop.split("-");
    var r = null, has = true;
    for (var i = 0; i < b.length; i++) {
        var c = b[i];
        r = a[c];
        if (r === undefined) {
            has = false;
            break;
        }
    }
    if (has) {
        if (value) {
            (new Function("data", "value", "data." + prop.replace(/\-/g, ".") + "=value;"))(a, value);
            var path = topolr.cpath.getRelativePath(__dirname + "/", "./../conf/server.json");
            return topolr.file(path).write(JSON.stringify(a, null, 4)).then(function () {
                return value;
            });
        } else {
            return topolr.promise(function (a, b) {
                a(r);
            });
        }
    } else {
        return topolr.promise(function (a, b) {
            a("Prop can not find");
        });
    }
};
manager.prototype.getServerConfig = function () {
    var ps = topolr.promise();
    var r = {};
    for (var i in this.serverConfig) {
        var a = this.serverConfig[i];
        if (topolr.is.isArray(a)) {
            r[i] = a.join(",");
        } else if (topolr.is.isObject(a)) {
            for (var t in a) {
                r[i + "-" + t] = a[t];
            }
        } else {
            r[i] = a;
        }
    }
    ps.resolve(r);
    return ps;
};
manager.prototype.getServerInfo = function () {
    return {
        version: this.packageConfig.version,
        "node version": process.version,
        "install path": process.installPrefix || "unknow",
        platform: process.platform
    };
};
manager.prototype.getPort = function () {
    return this.serverConfig.port;
};
manager.prototype.getProtocol = function () {
    return this.http2 ? "https" : "http";
};
manager.prototype.getHost = function () {
    var port = this.serverConfig.port;
    return (this.serverConfig.host || "localhost") + (port !== "" && port != 80 ? ":" + port : "");
};
manager.prototype.getURL = function () {
    var port = this.serverConfig.port;
    return this.getProtocol() + "://" + this.getHost();
};
manager.prototype.getMimeType=function (suffix) {
    return this.webConfig.mime[suffix];
};
manager.prototype.getNspContent=function (path) {
    var r = null;
    try {
        r = fs.readFileSync(path, 'utf-8');
    } catch (e) {
        console.log(e)
    }
    return r;
};
manager.prototype.getPort = function () {
    return this.serverConfig.port;
};
manager.prototype.getProtocol = function () {
    return this.http2 ? "https" : "http";
};
manager.prototype.getDefaultPagePath=function (code) {
    return this.webConfig.page[code] ? (this.basePath + this.webConfig.page[code]) : null;
};
manager.prototype.getDefaultSuffix=function () {
    return this.webConfig.defaultSuffix;
};
manager.prototype.getWebConfig=function () {
    return this.webConfig;
};
var _manager=new manager();
module.exports=function () {
    return _manager;
};