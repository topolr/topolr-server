var topolr = require("topolr-util");
var formidable = require('formidable');
var http = require('http');
var util = require("./../util/util");
var project = require("./../project");
var request = require("./../base/request");
var response = require("./../base/response");
var Path = require("path");
var manager=require("./manager");
var topolrserver = null;

var serverprocess = function (id) {
    this.serverConfig = require("./../../conf/server");
    this.basePath = Path.resolve(__dirname, "./../../").replace(/\\/g, "/") + "/";
    this.version = require("./../../package").version;
    this.projects = {};
    this._server = null;
    this.http2 = this.serverConfig.http2 && this.serverConfig.http2.enable;
    this._taskqueue = {};
    this._workerId=id;
};
serverprocess.prototype.setTemplateGlobalMacro = function () {
    topolr.setTemplateGlobalMacro("include", function (attrs, render) {
        var c = manager.getNspContent(this.basePath + attrs.path), t = "";
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
serverprocess.prototype.getModulesCode = function () {
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
serverprocess.prototype.initProjects = function (code) {
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
                            var t = project(n.path, n.name, true, ths);
                            ths.projects[n.name] = t;
                            // util.logger.log("startproject", {name: n.name});
                            return t.run(code);
                        });
                    });
                })(path);
            }
        } else {
            (function (b) {
                ps.then(function () {
                    var t = project(b.path, b.name, false, ths);
                    ths.projects[b.name] = t;
                    // util.logger.log("startproject", {name: b.name});
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
serverprocess.prototype.initServer = function () {
    var ths = this;
    try {
        if (this.http2) {
            var keypath = this.serverConfig.http2.key.replace(/\{server\}/g, this.basePath);
            var certpath = this.serverConfig.http2.cert.replace(/\{server\}/g, this.basePath);
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
            util.logger.log("startserver", {port: this.serverConfig.port, http2: true,id:this._workerId});
        } else {
            this._server = http.createServer(function (req, res) {
                if (req.method.toLowerCase() === "post") {
                    ths.doPostRequest(req, res);
                } else {
                    ths.doRequest(req, res);
                }
            }).listen(this.serverConfig.port);
            util.logger.log("startserver", {port: this.serverConfig.port,id:this._workerId});
        }
    } catch (e) {
        util.logger.log("error", e);
    }
};
serverprocess.prototype.startup = function () {
    this.setTemplateGlobalMacro();
    this.getModulesCode().scope(this).then(function (code) {
        return this.initProjects(code);
    }).then(function () {
        this.initServer();
    }, function (e, a) {
        util.logger.log("error", e);
    });
    return this;
};
serverprocess.prototype.stop = function () {
    var ps = topolr.promise();
    for (var i in this.projects) {
        (function (b) {
            return b.stop();
        })(this.projects[i]);
    }
    return ps;
};
serverprocess.prototype.getRequestInfo = function (req, res) {
    var _url = req.url.replace(/[\/]+/g, "/");
    var a = _url.replace(/[\/]+/g, "/").split("?");
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
        url: _url + t,
        rawHeaders: req.rawHeaders || req.headers
    });
    return {
        project: prj,
        request: reqt,
        response: resp
    };
};
serverprocess.prototype.doPostRequest = function (req, res) {
    var ths = this;
    var post = {}, file = {};
    var info = this.getRequestInfo(req, res);
    util.logger.log("request", {
        project: info.project._name,
        type: "POST",
        path: info.request.getURL(),
        ip: info.request.getClientIp(),
        id:this._workerId
    });
    var uploadInfo = info.project.getConfig().getUploadInfo();
    var form = new formidable.IncomingForm();
    form.encoding = uploadInfo.encoding;
    form.uploadDir = uploadInfo.temp;
    form.maxFieldsSize = uploadInfo.max;
    form.on('error', function (err) {
        util.logger.log("error", err);
        info.project.error(err).then(function () {
            ths.doResponse(info.request, info.response, res);
        });
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
        var _get = topolr.serialize.queryObject(req.url);
        info.request._data = topolr.extend({}, _get, post, file);
        info.request._files = file;
        info.request._posts = post;
        info.request._gets = _get;
        ths.triggerProject(info.project, info.request, info.response, res);
    });
    form.parse(req);
};
serverprocess.prototype.doRequest = function (req, res) {
    var info = this.getRequestInfo(req, res);
    util.logger.log("request", {
        project: info.project._name,
        type: "GET",
        path: info.request.getURL(),
        ip: info.request.getClientIp(),
        id:this._workerId
    });
    info.request._data = topolr.serialize.queryObject(req.url);
    this.triggerProject(info.project, info.request, info.response, res);
};
serverprocess.prototype.triggerProject = function (prj, reqt, resp, res) {
    var ths = this;
    prj.trigger(reqt, resp, res).then(function () {
        ths.doResponse(reqt, resp, res);
    },function (a) {
        console.log(a)
    });
};
serverprocess.prototype.doResponse = function (reqt, resp, res) {
    resp.setHeader("server", "topolr " + this.version);
    res.writeHead(resp._statusCode, resp.getHeader());
    if (resp._pipe) {
        resp._pipe.pipe(res);
    } else {
        if (resp._data) {
            res.write.apply(res, resp._data);
        }
        res.end();
    }
};
serverprocess.prototype.excuteShareService = function (info) {
    var cluster = require('cluster');
    if (!cluster.isMaster) {
        var id = Math.random().toString(36).slice(2, 34), ps = topolr.promise();
        var ops = topolr.extend({
            id: id,
            type: "",
            data: null
        }, info);
        this._taskqueue[id] = ps;
        process.send(ops);
        return ps;
    }
};
serverprocess.prototype._doMessage=function (data) {
    var id = data.id;
    if (id && this._taskqueue[id]) {
        var a = this._taskqueue[id];
        delete this._taskqueue[id];
        a.resolve(data.data);
    }
};

process.on('uncaughtException', function (err) {
    util.logger.log("error", err);
    if(topolrserver) {
        topolrserver._server && topolrserver._server.close(function () {
            process.exit(1);
        });
    }
});
process.on("message", function (data) {
    if(data&&data.type==="startserver"){
        topolrserver=new serverprocess(data.data).startup();
    }else if(topolrserver) {
        topolrserver._doMessage(data);
    }
});
module.exports=function () {
    return topolrserver;
};