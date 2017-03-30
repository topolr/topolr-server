var cookie = function (id) {
    this._data = {
    };
    this._expires=false;
    this._path="";
    this._secure=false;
    this._maxage=null;
    this._httponly=false;
    this._samesite="";
};
cookie.prototype.setValue = function (key, value) {
    this._data[key] = value;
    return this;
};
cookie.prototype.setMaxAge = function (time) {
    this._maxage=time;
    return this;
};
cookie.prototype.setExpires=function (time) {
    this._expires=new Date(new Date().getTime()+time).toGMTString();
    return this;
};
cookie.prototype.setPath=function (path) {
    this._path=path;
    return this;
};
cookie.prototype.setSecure=function () {
    this._secure=true;
    return this;
};
cookie.prototype.setHttpOnly=function () {
    this._httponly=true;
    return this;
};
cookie.prototype.setSameSite=function (type) {
    if(type) {
        var _type=type.toLowerCase();
        if (_type === "strict" || _type === "lax") {
            this._samesite=type;
        }
    }
    return this;
};
cookie.prototype.getCookieString = function () {
    var n = [];
    for (var i in this._data) {
        n.push(i + "=" + this._data[i]);
    }
    if(n.length>0){
        if(this._expires){
            n.push("Expires="+this._expires);
        }
        if(this._maxage!==null){
            n.push("Max-Age="+this._maxage);
        }
        if(this._secure){
            n.push("Secure");
        }
        if(this._httponly){
            n.push("HttpOnly");
        }
        if(this._samesite){
            n.push("SameSite="+this._samesite);
        }
    }
    return n.join(";");
};

var response = function (res) {
    this._cookie = new cookie();
    this._headers = {};
    this._statusCode = 200;
    this._data = null;
    this._pipe = null;
    this._statedata={};
};
response.prototype.setHeader = function (key, value) {
    this._headers[key] = value;
    return this;
};
response.prototype.setCookie = function (key, value) {
    this._cookie.setValue(key, value);
    return this;
};
response.prototype.getCookie=function () {
    return this._cookie;
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
response.prototype.getHeader = function (type) {
    return this._headers[type];
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
}

module.exports = function (res) {
    return new response(res);
};