var topolr = require("topolr-util");
var fs = require('fs');
var zlib = require("zlib");
var request = require('request');
var hash = require("./util/md5");
var router = require("topolr-router");
var Path = require("path");
var cetus = require("topolr-cetus");
var util=require("./../bin/util/util");
var http=require("http");

Module({
    name: "filter",
    doFilter: function (data, next,end) {
        next(data);
    },
    getModule: function (type, option) {
        return packetLoader.get(type, topolr.extend({
            request: this.request,
            response: this.response
        }, option));
    },
    getContext:function () {
        return project;
    }
});
Module({
    name:"listener",
    sessionCreated:function (session) {},
    sessionDestroyed:function (session) {}
});
Module({
    name: "service",
    option: {},
    start: function () {
        return topolr.promise(function (a) {
            a();
        });
    },
    stop:function () {
        return topolr.promise(function (a) {
            a();
        });
    },
    getModule: function (type, option) {
        return packetLoader.get(type,option);
    },
    getContext:function () {
        return project;
    }
});
Module({
    name: "controller",
    path: "",
    active:true,
    actionPaths:[],
    action:null,
    dao: "",
    before: function (a, b) {
        a();
    },
    after: function (a, b) {
        b(a);
    },
    getProjectInfo: function () {
        return project;
    },
    getTable: function (tableName) {
        var a = project.getAttr("tableMapping")[tableName];
        if (a) {
            var b = packetLoader.get(a);
            b.init();
            return b;
        }
        return null;
    },
    getJsonView: function (data) {
        return packetLoader.get("jsonview", {request: this.request, response: this.response, data: data});
    },
    getFileView: function (path) {
        return packetLoader.get("fileview", {request: this.request, response: this.response, data: path});
    },
    getStringView: function (string) {
        return packetLoader.get("stringview", {request: this.request, response: this.response, data: string});
    },
    getNspView: function (path, data) {
        return packetLoader.get("nspview", {
            request: this.request,
            response: this.response,
            data: data,
            path: project.getProjectPath() + path
        });
    },
    getRequestView: function (url, data) {
        return packetLoader.get("requestview", {request: this.request, response: this.response, data: data, url: url});
    },
    getDefaultPageView: function (code, data) {
        return packetLoader.get("defaultPageView", {
            request: this.request,
            response: this.response,
            data: data,
            code: code
        });
    },
    getRedirectView: function (url) {
        return packetLoader.get("redirectview", {request: this.request, response: this.response, url: url});
    },
    getCetusView:function () {
        return packetLoader.get("cetusview",{request:this.request,response:this.response});
    },
    getCustomView: function (option, render) {
        var ops = {
            request: this.request,
            response: this.response
        };
        var t = topolr.extend({}, ops, option);
        var k = packetLoader.get("view", t);
        k.render = render;
        return k;
    },
    getProxyView:function () {
        var host="",apiName="",headerHook=null;
        host=arguments[0];
        if(topolr.is.isFunction(arguments[1])){
            headerHook=arguments[1];
        }else if(topolr.is.isString(arguments[1])){
            apiName=arguments[1];
            if(topolr.is.isFunction(arguments[2])) {
                headerHook = arguments[2];
            }
        }
        return packetLoader.get("proxyview",{request:this.request,response:this.response,hostName:host,apiName:apiName,headerHook:headerHook});
    },
    getModule: function (type, option) {
        return packetLoader.get(type, option);
    },
    forward:function (option) {
        var ops=topolr.extend({
            hostName:"",
            apiName:"",
            headHook:null,
            encode:"utf8"
        },option);
        var ps=topolr.promise();
        var ths=this;
        var proxy=project.getService("proxyservice");
        var host=proxy.getHost(ops.hostName);
        var path=proxy.getAPIPath(ops.hostName,ops.apiName);
        var timeout=proxy.getTimeout(ops.hostName);
        var port=proxy.getPort(ops.hostName);
        if(host) {
            if(!path){
                path=this.request.getURL();
            }else{
                path=util.url.concatQueryString(path,this.request.getURL());
            }
            var headers = this.request.getHeaders().getHeadersInfo();
            headers.host = host;
            headers["accept-encoding"] = "";
            if (ops.headerHook) {
                headers = ops.headerHook(headers);
            }
            var req = http.request({
                host: host,
                path: path,
                port:port,
                method: this.request.getMethod(),
                headers: headers
            }, function (resp) {
                var chunks = "";
                resp.setEncoding(ops.encode);
                resp.on("data",function(chunk){
                    chunks+=chunk;
                });
                resp.on("end",function(){
                    ps.resolve({
                        header:resp.headers,
                        code:resp.statusCode,
                        data:chunks
                    });
                });
            });
            req.setTimeout(proxy.getTimeout(ops.hostName), function () {
                ps.reject("time out");
            });
            req.on("error", function (e) {
                ps.reject(e);
            });
            this.request.getRealRequest().pipe(req);
        }else{
            ps.reject();
        }
        return ps;
    },
    getContext:function () {
        return project;
    }
});
Module({
    name: "view",
    option: {
        request: null,
        response: null,
        data: null
    },
    doRender: function (fn) {
        var ths=this;
        this._end = fn;
        if (!this._queue) {
            this._queue = topolr.queue();
            this.goon(this.render);
        }
        this._queue.complete(function () {
            fn && fn.call(ths);
        });
        this._queue.run();
    },
    goon: function (fn) {
        var thss = this;
        if (!this._queue) {
            this._queue = topolr.queue();
            this._queue.add(function (a, b) {
                var ths = this;
                b.call(thss, function () {
                    ths.next();
                });
            }, function (e, b) {
                util.logger.log("error",b);
                thss.getModule("errorview", {data: b.stack}).doRender(function () {
                    thss._queue.end();
                });
            }, this.render);
        }
        this._queue.add(function (a, b) {
            var ths = this;
            b.call(thss, function () {
                ths.next();
            });
        }, function (e, b) {
            util.logger.log("error",b);
            thss.getModule("errorview", {data: b.stack}).doRender(function () {
                thss._queue.end();
            });
        }, fn);
    },
    next:function () {
        if(this._queue){
            this._queue.next();
        }
    },
    done: function () {
        this._queue.clean();
        this._end && this._end();
    },
    render: function (done) {
        done();
    },
    getRequest: function () {
        return this.option.request;
    },
    getResponse: function () {
        return this.option.response;
    },
    getModule: function (type, option) {
        return packetLoader.get(type, topolr.extend({
            request: this.option.request,
            response: this.option.response
        }, option));
    },
    getContext:function () {
        return project;
    }
});
Module({
    name: "stringview",
    extend: "view",
    render: function (done) {
        var res = this.option.response;
        res.setContentType("text/html");
        res.setStatusCode(200);
        res.write(this.option.data);
        done();
    }
});
Module({
    name: "jsonview",
    extend: "view",
    render: function (done) {
        var res = this.option.response;
        res.setContentType("application/json");
        res.setStatusCode(200);
        res.write(JSON.stringify(this.option.data));
        this.next();
    }
});
Module({
    name: "fileview",
    extend: "view",
    init: function () {
        this.option.data = this.option.data.split("?")[0];
    },
    render: function (goon) {
        var ths = this;
        var path = this.option.data.split("?")[0], response = this.option.response;
        if (path.indexOf("webapps" + Path.sep + project.getProjectName() + Path.sep + "WEBINF") === -1 && path.indexOf("webapps" + Path.sep + project.getProjectName() + Path.sep + "node_modules") === -1) {
            var a = path.split("."), suffix = "";
            if (a.length > 1) {
                suffix = a[a.length - 1];
            }
            var mime = TopolrServer.getWebConfig().mime[suffix] || "text/html";
            this.info = {
                path: path,
                suffix: suffix,
                mime: mime
            };
            if (suffix === "nsp") {
                ths.getModule("nspview", {path: path}).doRender(function () {
                    goon();
                });
            } else {
                if (suffix !== "") {
                    fs.stat(path, function (err, data) {
                        if (err) {
                            ths.info.err = true;
                            ths.getModule("defaultPageView", {code: "404"}).doRender(function () {
                                goon();
                            });
                        } else {
                            ths.info.fileInfo = data;
                            response.setStatusCode(200);
                            response.setContentType(mime);
                            response.pipe(fs.createReadStream(path));
                            goon();
                        }
                    });
                } else {
                    if (path === project.getProjectPath()) {
                        this.getModule("defaultPageView", {code: "index"}).doRender(function () {
                            goon();
                        });
                    } else {
                        this.getModule("defaultPageView", {code: "404"}).doRender(function () {
                            goon();
                        });
                    }
                }
            }
        } else {
            this.getModule("defaultPageView", {code: "403"}).doRender(function () {
                goon();
            });
        }
    }
});
Module({
    name: "nspview",
    extend: "view",
    option: {
        path: "",
        data: {}
    },
    render: function (goon) {
        var response = this.option.response, ths = this, path = "";
        if (project.getProjectConfig().hasPage(this.option.code)) {
            path = project.getProjectConfig().getPagePath(this.option.code);
        } else {
            path = global.TopolrServer.getWebConfig().page[this.option.code] || "404.nsp";
        }
        if(topolr.file(path).isExists()) {
            if (path.split(".").pop() === "nsp") {
                if (this.option.code === "404") {
                    var content = global.TopolrServer.getNspContent(path);
                    if (content) {
                        this.getModule("nspview", {path: path, data: this.option.data}).doRender(function () {
                            response.setStatusCode(ths.option.code);
                            ths.next();
                        });
                    } else {
                        response.setStatusCode("404");
                        ths.next();
                    }
                } else {
                    this.getModule("nspview", {path: path, data: this.option.data}).doRender(function () {
                        response.setStatusCode(ths.option.code);
                        ths.next();
                    });
                }
            } else {
                var content = topolr.file(path).readSync();
                if (this.option.code === "404") {
                    if (content) {
                        this.getModule("stringview", {data: content}).doRender(function () {
                            response.setStatusCode(ths.option.code);
                            ths.next();
                        });
                    } else {
                        response.setStatusCode("404");
                        ths.next();
                    }
                } else {
                    this.getModule("stringview", {data: content}).doRender(function () {
                        response.setStatusCode(ths.option.code);
                        ths.next();
                    });
                }
            }
        }else{
            this.getModule("stringview", {data: "file can not find."}).doRender(function () {
                response.setStatusCode("400");
                ths.next();
            });
        }
    }
});
Module({
    name: "defaultPageView",
    extend: "view",
    option: {
        code: "",
        data: {}
    },
    render: function (goon) {
        var response = this.option.response, ths = this, path = "";
        if (project.getProjectConfig().hasPage(this.option.code)) {
            path = project.getProjectConfig().getPagePath(this.option.code);
        } else {
            path = global.TopolrServer.getWebConfig().page[this.option.code] || "404.nsp";
        }
        if (this.option.code === "404") {
            var content = global.TopolrServer.getNspContent(path);
            if (content) {
                this.getModule("nspview", {path: path, data: this.option.data}).doRender(function () {
                    response.setStatusCode(ths.option.code);
                    ths.next();
                });
            } else {
                response.setStatusCode("404");
                ths.next();
            }
        } else {
            this.getModule("nspview", {path: path, data: this.option.data}).doRender(function () {
                response.setStatusCode(ths.option.code);
                ths.next();
            });
        }
    }
});
Module({
    name:"errorview",
    extend:"view",
    render:function () {
        var ths=this;
        if(this.option.request.isAjax()){
            this.getModule("jsonview",{data:{code:"0",msg:this.option.data}}).doRender(function () {
                ths.next();
            });
        }else{
            ths.getModule("defaultPageView", {code:"500",data: this.option.data}).doRender(function () {
                ths.next();
            });
        }
    }
});
Module({
    name: "redirectview",
    extend: "view",
    option: {
        url: ""
    },
    render: function (goon) {
        this.option.response.setStatusCode("302");
        this.option.response.setHeader("Location", this.option.url);
        this.done();
    }
});
Module({
    name:"proxyview",
    extend:"view",
    option:{
        hostName:"",
        apiName:"",
        headerHook:null
    },
    render:function () {
        var ths=this;
        var proxy=project.getService("proxyservice");
        var host=proxy.getHost(this.option.hostName);
        var path=proxy.getAPIPath(this.option.hostName,this.option.apiName);
        var timeout=proxy.getTimeout(this.option.hostName);
        var port=proxy.getPort(this.option.hostName);
        if(host) {
            if(!path){
                path=this.getRequest().getURL();
            }else{
                path=util.url.concatQueryString(path,this.getRequest().getURL());
            }
            var headers = this.getRequest().getHeaders().getHeadersInfo();
            headers.host = host;
            headers["accept-encoding"] = "";
            if (this.option.headerHook) {
                headers = this.option.headerHook(headers);
            }
            var req = http.request({
                host: host,
                path: path,
                port:port,
                method: this.getRequest().getMethod(),
                headers: headers
            }, function (resp) {
                ths.getResponse().pipe(resp);
                ths.done();
            });
            req.setTimeout(proxy.getTimeout(this.option.hostName), function () {
                ths.getModule("errorview", {data: "proxy timeout"}).doRender(function () {
                    ths.done();
                });
            });
            req.on("error", function (e) {
                ths.getModule("errorview", {data: e.stack}).doRender(function () {
                    ths.done();
                });
            });
            this.getRequest().getRealRequest().pipe(req);
        }else{
            ths.getModule("errorview", {data: "proxy host can not find name is "+this.option.hostName}).doRender(function () {
                ths.done();
            });
        }
    }
});
Module({
    name: "cetusview",
    extend: "view",
    option: {
    },
    render: function (goon) {
        var contenter = project.getAttr("cetus"),ths=this;
        var response=this.option.response;
        var url=TopolrServer.getServerURL()+this.option.request.getURL();
        if(!contenter) {
            ths.getModule("defaultPageView", {code: "index", data: {}}).doRender(function () {
                var a = this.option.response.getContent()[0];
                var b = a.match(/App\(\{[\w\W]*?\}\)/g);
                if (b) {
                    var q = b[0].substring(4, b[0].length - 1);
                    var m = new Function("return " + q + ";")();
                    var et=topolr.extend({},m,project.getAttr("cetusoption"));
                    var ae=cetus.getContenter(et);
                    project.setAttr("cetus",ae);
                    ae.getPageContent(url).then(function (content) {
                        ths.getModule("defaultPageView", {code: "index", data: content}).doRender(function () {
                            ths.next();
                        });
                    });
                }
            });
        }else {
            contenter.getPageContent(url).then(function (content) {
                ths.getModule("defaultPageView", {code: "index", data: content}).doRender(function () {
                    ths.next();
                });
            });
        }
    }
});
Module({
    name: "cetusservice",
    extend: "service",
    option: {
        localhost:global.TopolrServer.getServerHost(),
        cache:{
            type:"memory",
            cycle:10000
        }
    },
    start: function () {
        if(this.option.cache&&this.option.cache.path){
            this.option.cache.path=this.option.cache.path.replace(/\{[a-zA-Z]+\}/g,function (a) {
                a=a.substring(1,a.length-1);
                if(a==="project"){
                    return project.getProjectPath()
                }
            });
        }
        project.setAttr("cetusoption",this.option);
        return topolr.promise(function(a){a();});
    }
});
Module({
    name: "daoservice",
    extend: "service",
    option: {
        "host": "localhost",
        "port": "3306",
        "debug": false,
        "database": "home",
        "user": "root",
        "password": "",
        "connectionLimit ": "200"
    },
    start: function () {
        var b = {}, d = {};
        packetLoader.each(function (mod) {
            if (mod.typeOf("table")) {
                b[mod.getFields()["tableName"]] = mod.type();
            }
        });
        packetLoader.each(function (mod) {
            if (mod.typeOf("dao")) {
                d[mod.getFields()["daoName"]] = mod.type();
            }
        });
        var pool = require('mysql').createPool(this.option);
        project.setAttr("tableMapping", b);
        project.setAttr("daoMapping", d);
        project.setAttr("pool", pool);
        return topolr.promise(function(a){a();});
    },
    getDao: function (daotype) {
        var r = project.getAttr("daoMapping")[daotype];
        if (r) {
            var dao = packetLoader.get(r, {pool: project.getAttr("pool")});
            dao.init();
            return dao;
        } else {
            return null;
        }
    }
});
Module({
    name: "mvcservice",
    extend: "service",
    option: {},
    start: function () {
        var b = {}, d = {}, _router = router(project.getProjectName());
        packetLoader.each(function (mod) {
            if (mod.typeOf("controller")) {
                var t = mod.getFields();
                if(t.active!==false) {
                    var p = t["path"];
                    if (p === "" || p === "/") {
                        p = "";
                    } else if (p[0] !== "/") {
                        p = "/" + p + "/";
                    } else {
                        p = p + "/";
                    }
                    for (var i in t) {
                        if (i[0] === "/") {
                            _router.add(p + i, i, mod.type());
                        }
                    }
                    if (t["actionPaths"]) {
                        if(topolr.is.isFunction(t["actionPaths"])){
                            t["actionPaths"]=t["actionPaths"]();
                        }
                        for (var i = 0; i < t.actionPaths.length; i++) {
                            _router.add(p + t.actionPaths[i], t.actionPaths[i], mod.type());
                        }
                    }
                }
            }
        });
        project.setAttr("router", _router);
        return topolr.promise(function (a) {
            a();
        });
    }
});
Module({
    name:"proxyservice",
    extend:"service",
    option:{
    },
    start:function () {
        return topolr.promise(function (a) {
            a();
        });
    },
    getHost:function(name){
        return this.option[name]?this.option[name].host:null;
    },
    getTimeout:function (name) {
        return this.option[name]?this.option[name].timeout:null;
    },
    getAPIPath:function (hostname,apiname) {
        var a=this.option[hostname];
        if(a&&a.apis){
            return a.apis[apiname];
        }
        return null;
    },
    getPort:function (hostname) {
        var a=this.option[hostname];
        return this.option[hostname]?this.option[hostname].port:80;
    }
});
Module({
    name: "table",
    tableName: "",
    id: "",
    cols: [],
    init: function () {
        this._data = {};
        this.cols.forEach(function (a) {
            this._data[a] = null;
        }.bind(this));
    },
    set: function (key, value) {
        if (arguments.length === 2) {
            if (this._data.hasOwnProperty(key)) {
                this._data[key] = value;
            }
        } else if (arguments.length === 1) {
            for (var i in key) {
                if (this._data.hasOwnProperty(i)) {
                    this._data[i] = key[i];
                }
            }
        }
        return this;
    },
    get: function (key) {
        if (arguments.length === 0) {
            return this._data;
        } else {
            return this._data[key];
        }
    },
    with: function (req) {
        for (var i in req._data) {
            if (this.cols.indexOf(i) !== -1) {
                this._data[i] = req._data[i];
            }
        }
        return this;
    },
    getSelectSqlInfo: function () {
        var str = "select ", a = [], b = [], c = [];
        for (var i in this._data) {
            a.push(i);
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += a.join(",") + " from " + this.tableName + (c.length > 0 ? (" where " + c.join(" and ")) : "");
        return {
            sql: str,
            value: b
        };
    },
    getSelectPageSqlInfo: function (from, size) {
        var a = this.getSelectSqlInfo();
        a.sql = a.sql + " limit ?,?";
        a.value.push(parseInt(from));
        a.value.push(parseInt(size));
        return a;
    },
    getInsertSqlInfo: function () {
        var str = "insert into " + this.tableName + " set ", b = [], c = [];
        for (var i in this._data) {
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += c.join(",");
        return {
            sql: str,
            value: b
        };
    },
    getUpdateSqlInfo: function () {
        var str = "update " + this.tableName + " set ", b = [], c = [];
        for (var i in this._data) {
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += c.join(",") + " where " + this.id + "=?";
        b.push(this._data[this.id]);
        return {
            sql: str,
            value: b
        };
    },
    getDeleteSqlInfo: function () {
        var str = "delete from " + this.tableName, b = [], c = [];
        for (var i in this._data) {
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += (c.length > 0 ? (" where " + c.join(" and ")) : "");
        return {
            sql: str,
            value: b
        };
    },
    getContext:function () {
        return project;
    },
    getModule: function (type, option) {
        return packetLoader.get(type,option);
    }
});
Module({
    name: "dao",
    daoName: "",
    option: {
        pool: null
    },
    _release: function () {
        if (this.connection && this._transactioncount === 0) {
            util.logger.log("daoclose");
            this.connection.release();
            this.connection = null;
        }
    },
    getConnection: function (fn) {
        var ths = this;
        if (!this.connection) {
            this.option.pool.getConnection(function (err, connection) {
                if (err) {
                } else {
                    util.logger.log("daocon");
                    ths.connection = connection;
                    fn && fn(connection);
                }
            });
        } else {
            fn && fn(this.connection);
        }
    },
    getContext:function () {
        return project;
    },
    getModule: function (type, option) {
        return packetLoader.get(type,option);
    }
});
Module({
    name: "mysqldao",
    extend: "dao",
    daoName: "mysql",
    init: function () {
        this._transactioncount = 0;
    },
    query: function (sql, values) {
        var ps = topolr.promise(), str = sql, value = values;
        if (topolr.is.isObject(sql)) {
            if (sql.typeOf && sql.typeOf("table")) {
                var a = sql.getSelectSqlInfo();
                str = a.sql;
                value = a.value;
            }
        }
        this.getConnection(function (con) {
            util.logger.log("query",{sql:str,value:value});
            con.query(str, value, function (err, rows) {
                if (err) {
                    util.logger.log("error",err);
                    ps.reject(err);
                } else {
                    ps.resolve(rows);
                }
            });
        });
        return ps;
    },
    transaction: function () {
        this._transactioncount++;
        var ths = this, con = null;
        var ps = topolr.promise(function (p) {
            ths.getConnection(function (connection) {
                con = connection;
                con.beginTransaction(function (err) {
                    util.logger.log("stransaction");
                    p();
                });
            });
        }).scope(this).always(function (a, b) {
            this._transactioncount--;
            if (b) {
                util.logger.log("daorollback");
                con.rollback();
                if (this._transactioncount === 0) {
                    this.privator("release");
                }
            } else {
                con.commit(function () {
                    util.logger.log("dtransaction");
                    if (this._transactioncount === 0) {
                        this.privator("release");
                    }
                }.bind(this));
            }
        }).fail(function () {
            this._transactioncount--;
            util.logger.log("daorollback");
            con.rollback();
            if (this._transactioncount === 0) {
                this.privator("release");
            }
        });
        return ps;
    },
    add: function (table) {
        var c = table.getInsertSqlInfo();
        var ps = topolr.promise(), str = c.sql, value = c.value;
        this.getConnection(function (con) {
            util.logger.log("query",c);
            con.query(str, value, function (err, rows) {
                if (err) {
                    util.logger.log("error",err);
                    ps.reject(err);
                } else {
                    table._data[table.id] = rows.insertId;
                    ps.resolve(table);
                }
            });
        });
        return ps;
    },
    remove: function (table) {
        var c = table.getDeleteSqlInfo();
        var ps = topolr.promise(), str = c.sql, value = c.value;
        this.getConnection(function (con) {
            util.logger.log("query",c);
            con.query(str, value, function (err, rows) {
                if (err) {
                    util.logger.log("error",err);
                    ps.reject(err);
                } else {
                    table._data[table.id] = rows.insertId;
                    ps.resolve(table);
                }
            });
        });
        return ps;
    },
    update: function (table) {
        var c = table.getUpdateSqlInfo();
        var ps = topolr.promise(), str = c.sql, value = c.value;
        this.getConnection(function (con) {
            util.logger.log("query",c);
            con.query(str, value, function (err, rows) {
                if (err) {
                    util.logger.log("error",err);
                    ps.reject(err);
                } else {
                    table._data[table.id] = rows.insertId;
                    ps.resolve(table);
                }
            });
        });
        return ps;
    },
    find: function (table) {
        var c = table.getSelectSqlInfo();
        var ps = topolr.promise(), str = c.sql, value = c.value;
        this.getConnection(function (con) {
            util.logger.log("query",c);
            con.query(str, value, function (err, rows) {
                if (err) {
                    util.logger.log("error",err);
                    ps.reject(err);
                } else {
                    ps.resolve(rows);
                }
            });
        });
        return ps;
    },
    findPage: function (table, from, size) {
        var c = table.getSelectPageSqlInfo(from, size);
        var ps = topolr.promise(), str = c.sql, value = c.value;
        this.getConnection(function (con) {
            util.logger.log("query",c);
            con.query(str, value, function (err, rows) {
                if (err) {
                    util.logger.log("error",err);
                    ps.reject(err);
                } else {
                    ps.resolve(rows);
                }
            });
        });
        return ps;
    }
});
Module({
    name: "mvcfilter",
    extend: "filter",
    doFilter: function (data, next,end) {
        var request = this.request, response = this.response;
        var url = request.getURL();
        var name = project.getProjectName();
        var router = project.getAttr("router");
        var relt = router.check(url);
        var doit = false;
        if (relt.found) {
            var action = relt.action, controller = relt.controller,map=relt.map;
            util.logger.log("controller",{controller:controller,action:action});
            var mod = packetLoader.get(controller);
            if (mod && mod.typeOf("controller")) {
                mod.request = request;
                mod.response = response;
                if (mod.dao) {
                    mod.dao = project.getService("daoservice").getDao(mod.dao);
                }
                if (mod[action]||mod.action) {
                    doit = true, _filter = this;
                    topolr.queue().scope({
                        map: relt.map,
                        mod: mod,
                        action: action
                    }).complete(function (a) {
                        if (this.scope().mod.dao) {
                            this.scope().mod.dao.privator("release");
                        }
                        next(a);
                    }).add(function (a, b) {
                        var ths = this;
                        this.scope().mod.before(function () {
                            ths.next();
                        }, function (a) {
                            ths.end(a);
                        },map);
                    }, function (a, e) {
                        util.logger.log("error",e);
                        this.end(_filter.getModule("errorview", {data: e.stack}));
                    }).add(function (a, b) {
                        var fn = this.scope().mod[this.scope().action];
                        if (!fn) {
                            fn = this.scope().mod.action;
                        }
                        if (fn) {
                            var ps = fn.call(this.scope().mod, map),ths=this;
                            if (ps && ps.then && ps.always) {
                                ps.always(function (view) {
                                    if (view && view.type && view.typeOf("view")) {
                                        ths.next(view);
                                    } else {
                                        ths.end(_filter.getModule("errorview", {data: view?view.stack||"controller error":"controller error"}));
                                    }
                                });
                            } else if (ps && ps.type && ps.type("view")) {
                                this.next(ps);
                            } else {
                                this.end(_filter.getModule("errorview", {data: "controller need return a promise or a view isntance"}));
                            }
                        } else {
                            this.end(_filter.getModule("errorview", {data: "controller need return a view isntance"}));
                        }
                    }, function (a, e) {
                        util.logger.log("error",e);
                        this.end(_filter.getModule("errorview", {data: e.stack}));
                    }).add(function (a, b) {
                        var ths = this;
                        this.scope().mod.after(a, function (view) {
                            ths.next(view);
                        },map);
                    }, function (a, e) {
                        util.logger.log("error",e);
                        this.end(_filter.getModule("errorview", {data: e.stack}));
                    }).run();
                } else {
                    doit = true;
                    next(this.getModule("defaultPageView", {code: "404"}));
                }
            }
        } else {
            if (!url) {
                url = "/";
            }
            if (url === "/") {
                doit = true;
                next(this.getModule("defaultPageView", {code: "index"}));
            }
        }
        if (!doit) {
            var path = "";
            if (name === "ROOT") {
                path = project.getProjectPath() + request.getURL();
            } else {
                path = project.getProjectPath() + request.getURL().substring(name.length + 2);
            }
            next(this.getModule("fileview", {data: path}));
        }
    }
});
Module({
    name: "cachefilter",
    extend: "filter",
    option: {
        expires: 4000
    },
    doFilter: function (view, next) {
        if (this.request.getMethod() === "get" && view && view.typeOf && view.typeOf("fileview")) {
            var ths = this, response = this.response;
            view.goon(function (done) {
                var _view=this;
                if(response.getStatusCode()!=="404"&&this.info&&this.info.fileInfo) {
                    var info = this.info, c = false, sh = hash.md5(this.info.path + this.info.fileInfo.mtime);
                    var hs = this.getRequest().getHeaders();
                    var ms = hs.getAttr("If-Modified-Since");
                    var nm = hs.getAttr("If-None-Match");
                    var code = "200";
                    if (ths.option.etag) {
                        response.setHeader("Etag", sh);
                    }
                    var tmt = ths.option.cacheSetting[this.info.suffix];
                    if (!tmt) {
                        tmt = ths.option.cacheSetting.default || 2;
                    }
                    response.setContentType(this.info.mime);
                    response.setHeader("Expires", new Date(Date.now() + tmt * 1000).toUTCString());
                    response.setHeader("Cache-Control", "max-age=" + tmt);
                    response.setHeader("Last-Modified", new Date(this.info.fileInfo.mtime).toUTCString());
                    if (ms) {
                        if (new Date(ms).getTime() === new Date(this.info.fileInfo.mtime).getTime()) {
                            if (ths.option.etag) {
                                if (nm && nm === sh) {
                                    code = "304";
                                    c = true;
                                }
                            } else {
                                code = "304";
                                c = true;
                            }
                        }
                        response.setStatusCode(code);
                        response.write('Not Modified');
                        _view.next();
                        return;
                    }
                    if (!c) {
                        response.setStatusCode(code);
                        response.pipe(fs.createReadStream(this.info.path));
                        _view.next();
                    }
                }else{
                    _view.next();
                }
            });
        }
        next(view);
    }
});
Module({
    name: "zipfilter",
    extend: "filter",
    doFilter: function (view, next) {
        if (view && view.typeOf && view.typeOf("fileview")) {
            var ths = this;
            view.goon(function (done) {
                if(this.info) {
                    var suffix = this.info.suffix, doit = false;
                    if (ths.request.getHeaders().getAcceptEncoding()) {
                        if (ths.request.getHeaders().getAcceptEncoding().indexOf("gzip") !== -1) {
                            if (ths.option.gzip) {
                                if (ths.option.gzip.indexOf(suffix) !== -1) {
                                    doit = true;
                                }
                            }
                            if (doit && ths.response._pipe) {
                                ths.response.setHeader("Content-Encoding", "gzip");
                                ths.response._pipe = ths.response._pipe.pipe(zlib.createGzip());
                            }
                        } else if (ths.request.getHeaders().getAcceptEncoding().indexOf("deflate") !== -1) {
                            if (ths.option.deflate) {
                                if (ths.option.deflate.indexOf(suffix) !== -1) {
                                    doit = true;
                                }
                            }
                            if (doit && ths.response._pipe) {
                                ths.response.setHeader("Content-Encoding", "deflate");
                                ths.response._pipe = ths.response._pipe.pipe(zlib.createDeflate());
                            }
                        }
                    }
                }
                this.next();
            });
        }
        next(view);
    }
});