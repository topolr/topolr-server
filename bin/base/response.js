var topolr=require("topolr-util");
var cookie=require("./cookie");

var response = function (res) {
    this._cookie = {};
    this._headers = {};
    this._statusCode = 200;
    this._data = null;
    this._pipe = null;
    this._statedata={};
    this._context=null;
};
response.prototype.addCookie = function (key, value) {
    this._cookie[key]=new cookie(key,value);
    return this;
};
response.prototype.getCookie=function (key) {
    return this._cookie[key];
};
response.prototype.clearCookie=function () {
    this._cookie={};
    return this;
};
response.prototype.setStatusCode = function (code) {
    this._statusCode = code;
    return this;
};
response.prototype.setContentType = function (type) {
    this._headers["Content-Type"] = type;
    return this;
};
response.prototype.getStatusCode = function () {
    return this._statusCode;
};
response.prototype.getContentType = function () {
    return this._headers["Content-Type"];
};
response.prototype.setHeader = function (key, value) {
    if(arguments.length===1){
        if(topolr.is.isObject(key)){
            var _a={},_b="set-cookie";
            for(var i in key){
                _a[i.toLowerCase()]=key[i];
            }
            if(_a[_b]){
                var a=cookie.parse(_a[_b]);
                for(var mt=0;mt<a.length;mt++) {
                    this._cookie[a[mt].getKey()] = a[mt];
                }
            }
            for(var i in _a){
                if(i!==_b) {
                    this._headers[i] = _a[i];
                }
            }
        }
    }else if(arguments.length===2) {
        this._headers[key.toLowerCase()] = value;
    }
    return this;
};
response.prototype.getHeader = function (type) {
    if(arguments.length===0) {
        var r = [];
        for (var i in this._cookie) {
            var a = this._cookie[i];
            if (a._path === null) {
                a.setPath(this._context._localpath);
            }
            r.push(a.getCookieString());
        }
        if (r.length > 0) {
            this._headers["Set-Cookie"] = r;
        }
    }
    var _r = {};
    for (var i in this._headers) {
        var a = i.split("-"), b = "";
        if (a.length > 1) {
            b = a[0][0].toUpperCase() + a[0].substring(1) + "-" + a[1][0].toUpperCase() + a[1].substring(1);
        } else {
            b = a[0][0].toUpperCase() + a[0].substring(1);
        }
        _r[b] = this._headers[i];
    }
    return _r;
};
response.prototype.write = function () {
    this._data = Array.prototype.slice.call(arguments);
    return this;
};
response.prototype.pipe = function (a) {
    this._pipe = a;
    return this;
};
response.prototype.getFileStream=function () {
    return this._pipe;
};
response.prototype.getContent = function () {
    return this._data;
};
response.prototype.setStateData=function (key,value) {
    this._statedata[key]=value;
    return this;
};
response.prototype.getStateData=function (key) {
    return this._statedata[key];
};
response.prototype.hasStateData=function (key) {
    return this._statedata[key]!==undefined&&this._statedata[key]!==null;
};

module.exports = function (res) {
    return new response(res);
};