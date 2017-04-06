var topolr = require("topolr-util");
var session = require("./base/session");
var Path = require("path");
var util = require("./util/util");
var domain = require('domain');

var projectConfig = function (data, path) {
    this._data = data;
    if (!this._data.spider) {
        this._data.spider = {};
    }
    topolr.extend(this._data.spider, TopolrServer.getWebConfig().spider);
    this._basepath = path;
};
projectConfig.prototype.getDefaultSuffix = function () {
    return this._data.defaultSuffix || TopolrServer.getWebConfig().defaultSuffix;
};
projectConfig.prototype.getService = function (name) {
    if (this._data.service) {
        var r = null;
        this._data.service.forEach(function (a) {
            if (a.name === name) {
                r = a;
                return false;
            }
        });
        return r;
    }
    return null;
};
projectConfig.prototype.getFilter = function (name) {
    if (this._data.filter) {
        var r = null;
        this._data.filter.forEach(function (a) {
            if (a.name === name) {
                r = a;
                return false;
            }
        });
        return r;
    }
    return null;
};
projectConfig.prototype.hasFilter = function (name) {
    return this.getFilter(name) !== null;
};
projectConfig.prototype.hasService = function (name) {
    return this.getService(name) !== null;
};
projectConfig.prototype.getPagePath = function (name) {
    if (this._data.page) {
        return this._basepath + this._data.page[name];
    }
    return null;
};
projectConfig.prototype.getBasePath = function () {
    return this._basepath;
},
    projectConfig.prototype.hasPage = function (name) {
        return this._data.page ? (this._data.page[name] !== undefined) : false;
    };
projectConfig.prototype.getPageName = function (name) {
    return this._data.page[name] || "index.nsp";
}
projectConfig.prototype.getServiceSize = function () {
    return this._data.service ? this._data.service.length : 0;
};
projectConfig.prototype.getFilterSize = function () {
    return this._data.filter ? this._data.filter.length : 0;
};
projectConfig.prototype.getUploadInfo = function () {
    return topolr.extend({}, {temp: this._basepath + "temp", max: 20971520, encoding: "utf-8"}, this._data.upload);
};
projectConfig.prototype.getListenerPacket = function () {
    return this._data.listener;
};

var project = function (path, name, isouter) {
    this._isouter = isouter;
    this._name = name;
    this._path = path.replace(/\\/g, "/");
    this._server = null;
    this._services = {};
    this._filters = [];
    this._packet = topolr.packet(this._path + "node_modules", this._path + "WEBINF/src/");
    this.config = null;
    this._scope = {};
    this._session = {};
    this._listener = null;
    this._baseurl = TopolrServer.getServerURL() + "/" + this._name + "/";
    this._localpath = "/" + this._name + "/";
};
project.prototype.run = function (code) {
    var ths = this, ps = topolr.promise();
    code.forEach(function (cod) {
        var ccod = cod, reg = new RegExp(require('os').EOL);
        for (var i = 0; i < 2; i++) {
            ccod = ccod.replace(reg, "").replace(/\r/, "");
        }
        try {
            new Function("project", "packetLoader", "Module", "require", ccod)({
                isOuterProject: function () {
                    return ths._isouter;
                },
                getPacketPath: function () {
                    return ths._packet;
                },
                getProjectPath: function () {
                    return ths._path;
                },
                getProjectName: function () {
                    return ths._name;
                },
                getProjectConfig: function () {
                    return ths.config;
                },
                hasAttr: function (key) {
                    return ths._scope[key] !== undefined;
                },
                getAttr: function (key) {
                    return ths._scope[key];
                },
                setAttr: function (key, value) {
                    return ths._scope[key] = value;
                },
                getService: function (packet) {
                    return ths._services[packet];
                },
                getLocalURL: function () {
                    return ths._baseurl;
                },
                getLocalPath: function () {
                    return ths._localpath;
                },
                getListener: function () {
                    return ths._listener;
                }
            }, {
                get: function (name, option) {
                    var a = ths._packet.modules.get(name, option);
                    if (a.init) {
                        try {
                            a.init(option);
                        } catch (e) {
                            console.error(e.stack);
                        }
                    }
                    return a;
                },
                has: function (name) {
                    return ths._packet.modules.has(name);
                },
                each: function (fn) {
                    ths._packet.modules.each(fn);
                }
            }, function (obj) {
                if (obj) {
                    ths._packet.modules.add(obj);
                }
            }, function (a) {
                return require(a);
            });
        } catch (e) {
            console.error(e);
        }
    });
    var webconfigpath = this._path + "WEBINF" + Path.sep + "web.json";
    if (topolr.file(webconfigpath).isExists()) {
        return topolr.file(webconfigpath).read().then(function (data) {
            this.config = new projectConfig(JSON.parse(data), this._path);
            var pathc = this.config.getUploadInfo().temp.replace(/\{[a-zA-Z]+\}/g, function (a) {
                a = a.substring(1, a.length - 1);
                if (a === "project") {
                    return ths._path;
                }
            });
            topolr.file(topolr.cpath.getNormalizePath(pathc)).makedir();
            return this.packetInit();
        }.bind(this)).fail(function (e) {
            util.logger.log("error", "can not find web.json with path of " + this._path);
        }.bind(this));
    } else {
        return topolr.promise(function (a) {
            this.config = new projectConfig({
                page: {
                    index: "index." + TopolrServer.getWebConfig().defaultSuffix
                },
                filter: [],
                service: []
            }, this._path);
            a();
        }).scope(this).then(function () {
            return this.packetInit();
        }).fail(function (e) {
            util.logger.log("error", "init project error " + this._path);
        }.bind(this));
    }
};
project.prototype.stop = function () {
    return this.stopService();
};
project.prototype.packetInit = function () {
    var ths = this;
    var t = topolr.file(this._path + "WEBINF" + Path.sep + "src" + Path.sep).scan(function (path, isfile) {
        if (isfile && topolr.path(path, false).suffixWith("js")) {
            return path;
        }
    });
    var n = "";
    var ps = topolr.promise(function (a) {
        a();
    });
    for (var i = 0; i < t.length; i++) {
        (function (path) {
            ps.then(function () {
                var ths = this;
                util.logger.log("scanproject", {name: path});
                return topolr.file(path).read().then(function (a) {
                    n += a + "\n";
                });
            });
        })(t[i]);
    }
    ps.then(function () {
        ths._packet.parseCode(n);
        ths.doListener();
    }).then(function () {
        return ths.doServices();
    });
    return ps;
};
project.prototype.trigger = function (request, response, res) {
    var idkey = ("t" + this._name + "id").toUpperCase();
    var sid = request.getHeaders().getCookie().get(idkey);
    if (!sid) {
        sid = topolr.util.uuid();
    }
    if (!this._session[sid]) {
        var k = session(sid);
        request._session = k;
        this._session[sid] = k;
        response.addCookie(idkey, sid);
        try {
            this._listener.sessionCreated && this._listener.sessionCreated(k);
        } catch (e) {
            console.error(e);
        }
    } else {
        this._session[sid]._build = new Date().getTime();
        request._session = this._session[sid];
    }
    var ps = topolr.promise(), ths = this;
    request._context = this;
    response._context = this;
    var domainer = domain.create();
    domainer.run(function () {
        ths.doFilters(request, response, function () {
            ps.resolve();
        });
    });
    domainer.on('error', function (e) {
        util.logger.log("error", e);
        var view = ths.getModule("errorview", {request: request, response: response, data: e.stack});
        ths._server.doResponse(view, request, response, res);
    });
    return ps;
};
project.prototype.getModule = function (packetName, option) {
    var c = this._packet.getModuleContainer().get(packetName, option);
    if (c) {
        return c;
    } else {
        throw Error("[packet] can not find the module of " + packetName);
    }
};
project.prototype.doFilters = function (request, response, fn) {
    var ths = this;
    this.doFrontFilters(request, response).then(function (a) {
        if (!a || !a.typeOf || !a.typeOf("view")) {
            a = ths.getModule("errorview", {request: request, response: response});
        }
        return a;
    }).then(function (a) {
        return a.render();
    }).then(function () {
        return ths.doEndFilters(request, response);
    }).then(function () {
        fn && fn();
    }, function (a) {
        console.log(a)
    });
};
project.prototype.doFrontFilters = function (request, response) {
    var ps = topolr.promise(), ths = this, a = [];
    this.config._data.filter.forEach(function (filter) {
        var packet = filter.name, option = filter.option;
        var mod = ths.getModule(packet, option);
        if (mod.typeOf("filter") && mod.position === "front") {
            a.push(mod);
        }
    });
    if (a.length > 0) {
        var queue = topolr.queue();
        queue.complete(function (a) {
            ps.resolve(a);
        });
        a.forEach(function (mod) {
            mod.request = request;
            mod.response = response;
            queue.add(function (data, mode) {
                var q = this;
                try {
                    mode.doFilter(data, function (a) {
                        q.next(a);
                    }, function () {
                        q.end(a);
                    });
                } catch (e) {
                    console.error(e.stack);
                    q.next(ths.getModule("errorview", {request: request, response: response, data: e.stack}));
                }
            }, function () {
                this.next();
            }, mod);
        });
        queue.run(null);
    } else {
        ps.resolve(this.getModule("fileview", {
            request: request,
            response: response,
            path: this._path + request.getProjectURL().split("?")[0]
        }));
    }
    return ps;
};
project.prototype.doEndFilters = function (request, response) {
    var ps = topolr.promise(), a = [], ths = this;
    this.config._data.filter.forEach(function (filter) {
        var packet = filter.name, option = filter.option;
        var mod = ths.getModule(packet, option);
        if (mod.typeOf("filter") && mod.position === "end") {
            a.push(mod);
        }
    });
    if (a.length > 0) {
        var queue = topolr.queue();
        queue.complete(function (a) {
            ps.resolve(a);
        });
        a.forEach(function (mod) {
            mod.request = request;
            mod.response = response;
            queue.add(function (data, mode) {
                var q = this;
                try {
                    mode.doFilter(data, function (a) {
                        q.next(a);
                    }, function () {
                        q.end(a);
                    });
                } catch (e) {
                    console.error(e.stack);
                    q.next(ths.getModule("errorview", {request: request, response: response, data: e.stack}));
                }
            }, function () {
                this.next();
            }, mod);
        });
        queue.run();
    } else {
        ps.resolve(null);
    }
    return ps;
};
project.prototype.doListener = function () {
    var name = this.config.getListenerPacket();
    if (!name) {
        name = "listener";
    }
    var mod = this.getModule(name, {});
    if (mod && mod.typeOf && mod.typeOf("listener")) {
        this._listener = mod;
    } else {
        this._listener = this.getModule("listener", {});
    }
};
project.prototype.doServices = function () {
    var ths = this;
    var ps = topolr.promise(function (a) {
        a();
    });
    if (this.config._data.service && this.config._data.service.length > 0) {
        this.config._data.service.forEach(function (service) {
            (function (service) {
                ps.then(function () {
                    var packet = service.name, option = service.option;
                    var mod = ths.getModule(packet, option);
                    if (mod && mod.typeOf && mod.typeOf("service")) {
                        ths._services[packet] = mod;
                        return mod.start();
                    } else {
                        throw Error("[server] packet " + packet + " is not a service");
                    }
                });
            })(service);
        });
    }
    ps.fail(function (e) {
        console.error(e);
    });
    return ps;
};
project.prototype.stopService = function () {
    var ths = this;
    var ps = topolr.promise(function (a) {
        a();
    });
    if (this.config._data.service) {
        this.config._data.service.forEach(function (service) {
            (function (service) {
                ps.then(function () {
                    var mod = ths.getModule(service.name, service.option);
                    if (mod && mod.typeOf && mod.typeOf("service")) {
                        if (mod.stop) {
                            return mod.stop();
                        }
                    }
                });
            })(service);
        });
    }
    return ps;
};
project.prototype.checkSession = function (tout) {
    var a = new Date().getTime();
    for (var i in this._session) {
        var s = this._session[i];
        if (a - s._build > tout) {
            var ka = this._session[i];
            delete this._session[i];
            try {
                this._listener.sessionDestroyed && this._listener.sessionDestroyed(ka);
            } catch (e) {
                console.error(e);
            }
        }
    }
};
project.prototype.getConfig = function () {
    return this.config;
};
project.prototype.error = function (request, response, e) {
    return this.getModule("errorview", {request: request, response: response, data: e ? e.stack : []}).render();
};

module.exports = function (path, name, isouter) {
    return new project(path, name, isouter);
};