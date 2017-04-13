var topolr = require("topolr-util");
var manager = {
    serverConfig: require("./../../conf/server"),
    webConfig: require("./../../conf/web"),
    packageConfig: require("./../../package"),
    basePath: (require("path").resolve(__dirname, "./../../").replace(/\\/g, "/") + "/"),
    createProject: function (name, path, remotePath) {
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
    },
    listProjects: function () {
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
    },
    listProjectsSync: function () {
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
    },
    getProjectList:function () {
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
    },
    getProjectListSync:function () {
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
    },
    getAllRemoteProjects: function () {
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
    },
    removeProject: function (projectName) {
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
    },
    editProject: function (projectName, path, remotePath) {
        return this.createProject(projectName, path, remotePath);
    },
    setServerConfig: function (prop, value) {
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
    },
    getServerConfig: function () {
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
    },
    getServerInfo: function () {
        return {
            version: this.packageConfig.version,
            nodeVersion: process.version,
            installPath: process.installPrefix || "unknow",
            platform: process.platform
        };
    },
    getHost: function () {
        return (this.serverConfig.host || "localhost");
    },
    getHostPort:function () {
        var port = this.serverConfig.port;
        return (this.serverConfig.host || "localhost") + (port !== "" && port != 80 ? ":" + port : "");
    },
    getURL: function () {
        var port = this.serverConfig.port;
        return this.getProtocol() + "://" + this.getHostPort();
    },
    getMimeType: function (suffix) {
        return this.webConfig.mime[suffix];
    },
    getNspContent: function (path) {
        var r = null;
        try {
            r=topolr.file(path).readSync();
        } catch (e) {
            console.log(e)
        }
        return r;
    },
    getPort: function () {
        return this.serverConfig.port;
    },
    getProtocol: function () {
        return this.http2 ? "https" : "http";
    },
    isHttp2:function () {
        return this.http2;
    },
    getDefaultPagePath: function (code) {
        return this.webConfig.page[code] ? (this.basePath + this.webConfig.page[code]) : null;
    },
    getDefaultSuffix: function () {
        return this.webConfig.defaultSuffix;
    },
    getWebConfig: function () {
        return this.webConfig;
    },
    getShareServices:function () {
        var a=this.serverConfig.services;
        for(var i=0;i<a.length;i++){
            var b=a[i];
            b.path=b.path.replace(/\{server\}/g,this.basePath);
        }
        return this.serverConfig.services;
    }
};
module.exports = manager;