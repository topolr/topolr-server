var nedb = require('nedb');
var topolr=require("topolr-util");

var cursor=function (_cursor) {
    this._cursor=_cursor;
};
cursor.prototype.limit=function () {
    this._cursor.limit(Array.prototype.slice.call(arguments));
    return this;
};
cursor.prototype.sort=function () {
    this._cursor.sort(Array.prototype.slice.call(arguments));
    return this;
};
cursor.prototype.skip=function () {
    this._cursor.skip(Array.prototype.slice.call(arguments));
    return this;
};
cursor.prototype.exec=function () {
    var ps=topolr.promise();
    this._cursor.exec(function (err,data) {
        if(err){
            ps.reject(err);
        }else{
            ps.resolve(data);
        }
    });
    return ps;
};


var wrapper=function (db) {
    this._db=db;
};
wrapper.warp=function () {
    var ps=topolr.promise();
    var parse=Array.prototype.slice.call(arguments);
    var type=parse.shift();
    parse.push(function (err,data) {
        if(err){
            ps.reject(err);
        }else{
            ps.resolve(data);
        }
    });
    this._db[type].apply(this._db,parse);
    return ps;
};
wrapper.prototype.find=function () {
    var parse=Array.prototype.slice.call(arguments);
    parse.unshift("find");
    return wrapper.warp.apply(this,parse);
};
wrapper.prototype.findBy=function () {
    var parse=Array.prototype.slice.call(arguments);
    if(topolr.is.isFunction(parse[parse.length-1])){
        parse.splice(parse.length-1,1);
    }
    var at=this._db.find.apply(this._db,parse);
    return new cursor(at);
};
wrapper.prototype.insert=function () {
    var parse=Array.prototype.slice.call(arguments);
    parse.unshift("insert");
    return wrapper.warp.apply(this,parse);
};
wrapper.prototype.count=function () {
    var parse=Array.prototype.slice.call(arguments);
    parse.unshift("count");
    return wrapper.warp.apply(this,parse);
};
wrapper.prototype.update=function () {
    var parse=Array.prototype.slice.call(arguments);
    parse.unshift("update");
    return wrapper.warp.apply(this,parse);
};
wrapper.prototype.remove=function () {
    var parse=Array.prototype.slice.call(arguments);
    parse.unshift("remove");
    return wrapper.warp.apply(this,parse);
};
wrapper.prototype.ensureIndex=function () {
    var parse=Array.prototype.slice.call(arguments);
    parse.unshift("ensureIndex");
    return wrapper.warp.apply(parse);
};
wrapper.prototype.removeIndex=function () {
    var parse=Array.prototype.slice.call(arguments);
    parse.unshift("removeIndex");
    return wrapper.warp.apply(this,parse);
};

Module({
    name:"localdb",
    extend:"service",
    option:{
        path:"",
        initData:{}
    },
    start:function () {
        var ths=this;
        this._dbs={};
        var path=this.getPath(this.option.path);
        this._path=path;
        return topolr.promise(function (a) {
            a();
        });
    },
    getPath:function (path) {
        var ths=this;
        return path.replace(/\{[a-zA-Z]+\}/g, function (a) {
            a = a.substring(1, a.length - 1);
            if (a === "project") {
                return ths.getContext().getProjectPath()
            }else if(a==="webinfo"){
                return ths.getContext().getProjectPath()+"/WEBINF/"
            }
        });
    },
    get:function (name) {
        var ths=this;
        if(!this._dbs[name]) {
            var path = this._path + "/" + name + ".db";
            if (!topolr.file(path).isExists()) {
                topolr.file(path).create();
                var ps = topolr.promise();
                var db = new nedb({
                    filename: path
                });
                db.loadDatabase(function (err) {
                    if (err) {
                        ps.reject();
                    } else {
                        if(ths.option.initData[name]){
                            try {
                                var content = topolr.file(ths.getPath(ths.option.initData[name])).readSync();
                                db.insert(JSON.parse(content),function (a,b) {
                                    ths._dbs[name]=new wrapper(db);
                                    ps.resolve(ths._dbs[name]);
                                });
                            }catch (e){}
                        }else{
                            ths._dbs[name]=new wrapper(db);
                            ps.resolve(ths._dbs[name]);
                        }
                    }
                });
                return ps;
            } else {
                var ps = topolr.promise();
                var db = new nedb({
                    filename: path
                });
                db.loadDatabase(function (err) {
                    if (err) {
                        ps.reject();
                    } else {
                        ths._dbs[name]=new wrapper(db);
                        ps.resolve(ths._dbs[name]);
                    }
                });
                return ps;
            }
        }else{
            return topolr.promise(function (a) {
                a(ths._dbs[name]);
            });
        }
    }
});
Module({
    name:"storecontroller",
    extend:"controller",
    getStore:function (name) {
        return project.getService("localdb").get(name);
    }
});