var topolr = require("topolr-util");
var formidable = require('formidable');
var http = require('http');
var util = require("./util/util");
var project = require("./project");
var request = require("./base/request");
var response = require("./base/response");
var fs = require("fs");
var Path = require("path");

var topolrServer = function () {
    this.serverConfig = require("../conf/server");
    this.webConfig = require("../conf/web");
    this.packageConfig = require("../package");
    this.basePath=Path.resolve(__dirname,"./../").replace(/\\/g,"/")+"/";
    this.version = this.packageConfig.version;
    this.projects = {};
    this._server = null;
    this.sessioninterval = 0;
    this.http2=this.serverConfig.http2&&this.serverConfig.http2.enable;
};
topolrServer.prototype.setTemplateGlobalMacro = function () {
    topolr.setTemplateGlobalMacro("include", function (attrs, render) {
        var c = global.TopolrServer.getNspContent(this.basePath + attrs.path), t = "";
        if (!c) {
            c = "";
        }
        try {
            var temp = topolr.template(c);
            temp.basePath = this.basePath;
            temp.request = this.request;
            t = temp.fn(new Function("request", "session", "data", temp.code())).render(this.request, this.request.getSession(), attrs.data);
            for (var i in temp._caching) {
                this._caching[i] = temp._caching[i];
            }
        } catch (e) {
            util.logger.log("error", e);
        }
        return t;
    });
    topolr.setTemplateGlobalMacro("error", function (attr, render) {
        var a = "";
        try {
            var stack = attr.stack;
            stack.split("\n").forEach(function (p) {
                if (/[\s]+at[\s]+/.test(p)) {
                    var n = p.trim().split(" ");
                    a += "<div class='line'><span class='line-a'>at</span><span class='line-b'>" + (n[1] || "") + "</span><span class='line-c'>" + (n[2] || "") + "</span></div>";
                } else {
                    a += "<div class='linen'>" + p + "</div>";
                }
            });
        } catch (e) {
            util.logger.log("error", e);
        }
        return a;
    });
};
topolrServer.prototype.getModulesCode = function () {
    var paths = this.serverConfig.modules, ths = this;
    if (!topolr.is.isArray(paths)) {
        paths = ["lib/base.js"];
    }
    var ps = topolr.promise(function (a) {
        a();
    });
    var t = [];
    paths.forEach(function (path) {
        (function (path) {
            ps.then(function () {
                return topolr.file(path).read().then(function (a) {
                    t.push(a + "\n//# sourceURL=" + path);
                });
            });
        })(ths.basePath + path);
    });
    ps.then(function () {
        return t;
    });
    return ps;
};
topolrServer.prototype.initProjects = function (code) {
    var ths = this;
    var ps = topolr.promise(function (a) {
        a();
    });
    var projectpath = this.basePath + "webapps/";
    topolr.file(projectpath).subscan(function (path, isfile) {
        if (isfile) {
            if (topolr.cpath.getSuffix(path) === "json") {
                (function (path) {
                    ps.then(function () {
                        return topolr.file(path).read().then(function (data) {
                            var n = JSON.parse(data);
                            var t = project(n.path, n.name, true);
                            t._server = ths;
                            ths.projects[n.name] = t;
                            util.logger.log("startproject", {name: n.name});
                            return t.run(code);
                        });
                    });
                })(path);
            }
        } else {
            (function (b) {
                ps.then(function () {
                    var t = project(b.path, b.name, false);
                    t._server = ths;
                    ths.projects[b.name] = t;
                    util.logger.log("startproject", {name: b.name});
                    return t.run(code);
                });
            })({
                path: path,
                name: path.substring(projectpath.length + Path.sep.length, path.length - Path.sep.length)
            });
        }
    });
    return ps;
};
topolrServer.prototype.initServer = function () {
    var ths = this;
    try {
        this.startSessionWatcher();
        if (this.http2) {
            var keypath=this.serverConfig.http2.key.replace(/\{server\}/g,this.basePath);
            var certpath=this.serverConfig.http2.cert.replace(/\{server\}/g,this.basePath);
            this._server = require("http2").createServer({
                key: topolr.file(keypath).readSync(),
                cert: topolr.file(certpath).readSync()
            }, function (req, res) {
                if (req.method.toLowerCase() === "post") {
                    ths.doPostRequest(req, res);
                } else {
                    ths.doRequest(req, res);
                }
            }).listen(this.serverConfig.port);
            util.logger.log("startserver", {port: this.serverConfig.port,http2:true});
        } else {
            this._server = http.createServer(function (req, res) {
                if (req.method.toLowerCase() === "post") {
                    ths.doPostRequest(req, res);
                } else {
                    ths.doRequest(req, res);
                }
            }).listen(this.serverConfig.port);
            util.logger.log("startserver", {port: this.serverConfig.port});
        }
    } catch (e) {
        util.logger.log("error", e);
    }
};
topolrServer.prototype.startup = function () {
    this.setTemplateGlobalMacro();
    this.getModulesCode().scope(this).then(function (code) {
        return this.initProjects(code);
    }).then(function () {
        this.initServer();
    }, function (e, a) {
        util.logger.log("error", e);
    });
};
topolrServer.prototype.stop = function () {
    var ps = topolr.promise();
    this.stopSessionWatcher();
    for (var i in this.projects) {
        (function (b) {
            return b.stop();
        })(this.projects[i]);
    }
    return ps;
};

topolrServer.prototype.getRequestInfo = function (req, res) {
    var a = req.url.split("?");
    var b = a[0].split("/");
    var r = "ROOT", t = "";
    if (b.length >= 1) {
        if (this.projects.hasOwnProperty(b[1])) {
            r = b[1];
            if (b.length === 2) {
                t = "/";
            }
        }
    }
    var prj = this.projects[r];
    if (!prj) {
        prj = this.projects["ROOT"];
    }
    var resp = response(), reqt = request(req, {
        method: req.method.toLowerCase(),
        url: req.url + t,
        rawHeaders: req.rawHeaders||req.headers
    });
    return {
        project: prj,
        request: reqt,
        response: resp
    };
};
topolrServer.prototype.doPostRequest = function (req, res) {
    var ths = this;
    var post = {}, file = {};
    var info = this.getRequestInfo(req, res);
    util.logger.log("request", {
        project: info.project._name,
        type: "POST",
        path: info.request.getURL(),
        ip: info.request.getClientIp()
    });
    var uploadInfo = info.project.getConfig().getUploadInfo();
    var form = new formidable.IncomingForm();
    form.encoding = uploadInfo.encoding;
    form.uploadDir = uploadInfo.temp;
    form.maxFieldsSize = uploadInfo.max;
    form.on('error', function (err) {
        util.logger.log("error", err);
        ths.doResponse(info.project.error(err), info.request, info.response, res);
    }).on('field', function (field, value) {
        if (form.type === 'multipart') {
            if (field in post) {
                if (topolr.is.isArray(post[field]) === false) {
                    post[field] = [post[field]];
                }
                post[field].push(value);
                return;
            }
        }
        post[field] = value;
    }).on('file', function (field, _file) {
        file[field] = _file;
    }).on('end', function () {
        info.request._data = topolr.extend({}, topolr.serialize.queryObject(req.url), post, file);
        ths.triggerProject(info.project, info.request, info.response, res);
    });
    form.parse(req);
};
topolrServer.prototype.doRequest = function (req, res) {
    var info = this.getRequestInfo(req, res);
    util.logger.log("request", {
        project: info.project._name,
        type: "GET",
        path: info.request.getURL(),
        ip: info.request.getClientIp()
    });
    info.request._data = topolr.serialize.queryObject(req.url);
    this.triggerProject(info.project, info.request, info.response, res);
};
topolrServer.prototype.triggerProject = function (prj, reqt, resp, res) {
    var ths = this;
    prj.trigger(reqt, resp, res).then(function (a) {
        ths.doResponse(a, reqt, resp, res);
    });
};
topolrServer.prototype.doResponse = function (view, reqt, resp, res) {
    var serverName = "topolr " + this.version;
    view.doRender(function () {
        var cstr = resp._cookie.getCookieString();
        if (cstr) {
            resp._headers["Set-Cookie"] = cstr;
        }
        resp._headers["Server"] = serverName;
        if (resp._statusCode === "index") {
            resp._statusCode = "200";
        }
        res.writeHead(resp._statusCode, resp._headers);
        if (resp._pipe) {
            resp._pipe.pipe(res);
        } else {
            if (resp._data) {
                res.write.apply(res, resp._data);
            }
            res.end();
        }
    });
};
topolrServer.prototype.startSessionWatcher = function () {
    var tout = this.webConfig.session.timeout;
    this.sessioninterval = setInterval(function () {
        for (var i in this.projects) {
            this.projects[i].checkSession(tout);
        }
    }.bind(this), tout * 1000);
    return this;
};
topolrServer.prototype.stopSessionWatcher = function () {
    clearInterval(this.sessioninterval);
    return this;
}

topolrServer.prototype.createProject = function (name, path, remotePath) {
    path=path.replace(/\\/g,"/");
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
topolrServer.prototype.listProjects = function () {
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
topolrServer.prototype.listProjectsSync = function () {
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
topolrServer.prototype.getAllRemoteProjects = function () {
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
topolrServer.prototype.removeProject = function (projectName) {
    var path = this.basePath + "webapps" + "/" + projectName, ps = topolr.promise();
    if (projectName !== "ROOT") {
        if (topolr.file(path + ".json").isExists()) {
            topolr.file(path + ".json").remove();
            ps.resolve();
        } else {
            if (topolr.file(path).isExists()) {
                topolr.file(path).remove();
                ps.resolve();
            }else{
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
topolrServer.prototype.editProject = function (projectName, path, remotePath) {
    return this.createProject(projectName, path, remotePath);
};
topolrServer.prototype.setServerConfig = function (prop, value) {
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
topolrServer.prototype.getServerConfig = function () {
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
topolrServer.prototype.getServerInfo = function () {
    return {
        version: this.packageConfig.version,
        "node version": process.version,
        "install path": process.installPrefix || "unknow",
        platform: process.platform
    };
};
topolrServer.prototype.getPort=function () {
    return this.serverConfig.port;
};
topolrServer.prototype.getProtocol=function () {
    return this.http2?"https":"http";
};
topolrServer.prototype.getHost=function () {
    var port = this.serverConfig.port;
    return (this.serverConfig.host||"localhost") + (port !== "" && port != 80 ? ":" + port : "");
};
topolrServer.prototype.getURL=function () {
    var port = this.serverConfig.port;
    return this.getProtocol()+"://"+this.getHost();
};

var topolrserver = new topolrServer();
global.TopolrServer = {
    getServerPort:function () {
        return topolrserver.getPort();
    },
    getServerHost: function () {
        return topolrserver.getHost();
    },
    getServerProtocol:function () {
        return topolrserver.getProtocol();
    },
    getServerURL: function () {
        return topolrserver.getURL();
    },
    getServerConfig: function () {
        return topolrserver.serverConfig;
    },
    getWebConfig: function () {
        return topolrserver.webConfig;
    },
    getNspContent: function (path) {
        var r = null;
        try {
            r = fs.readFileSync(path, 'utf-8');
        } catch (e) {
        }
        return r;
    },
    getMimeType:function (suffix) {
        return this.webConfig.mime[suffix];
    },
    getProjects: function () {
        return topolrserver.listProjectsSync();
    },
    getServerInfo: function () {
        return {
            version: topolrserver.packageConfig.version,
            node: process.version,
            platform: process.platform
        };
    },
    getPathInfo: function () {
        return {
            basePath: topolrserver.basePath,
            packagePath: topolrserver.packagePath,
            configPath: topolrserver.configPath,
            serverConfigPath: topolrserver.serverConfigPath,
            webConfigPath: topolrserver.webConfigPath
        };
    },
    getDefaultPagePath:function (code) {
        return topolrserver.webConfig.page[code]?(topolrserver.basePath+topolrserver.webConfig.page[code]):null;
    },
    getDefaultSuffix:function () {
        return topolrserver.webConfig.defaultSuffix;
    }
};
process.on('uncaughtException', function (err) {
    util.logger.log("error", err);
    topolrserver._server && topolrserver._server.close(function () {
        process.exit(1);
    });
});
module.exports = {
    run: function () {
        topolrserver.startup();
    },
    version: function () {
        return topolrserver.version;
    },
    create: function (name, path, remotePath) {
        return topolrserver.createProject(name, path, remotePath);
    },
    scan: function () {
        return topolrserver.listProjects();
    },
    remove: function (projectName) {
        return topolrserver.removeProject(projectName);
    },
    getServerConfig: function () {
        return topolrserver.getServerConfig();
    },
    setServerConfig: function (prop, value) {
        return topolrserver.setServerConfig(prop, value);
    },
    getServerInfo: function () {
        return topolrserver.getServerInfo();
    },
    getPathInfo: function () {
        return {
            basePath: topolrserver.basePath,
            packagePath: topolrserver.packagePath,
            configPath: topolrserver.configPath,
            serverConfigPath: topolrserver.serverConfigPath,
            webConfigPath: topolrserver.webConfigPath
        };
    }
};