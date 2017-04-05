var cookie = function (key,value) {
    this._key=key;
    this._value=value;
    this._expires=false;
    this._path=null;
    this._secure=false;
    this._maxage=null;
    this._httponly=false;
    this._samesite="";
    this._domain=null;
};
cookie.prototype.getKey=function () {
    return this._key;
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
    if(this._key) {
        n.push(this._key + "=" + this._value||"");
    }
    if(n.length>0){
        if(this._path){
            n.push("Path="+this._path);
        }
        if(this._expires){
            n.push("Expires="+this._expires);
        }
        if(this._maxage!==null){
            n.push("Max-Age="+this._maxage);
        }
        if(this._domain){
            n.push("Domain="+this._domain);
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
cookie.parse=function (strarray) {
    var r=[];
    for(var k=0;k<strarray.length;k++) {
        var str=strarray[k];
        var b = str.split(";");
        var d = {};
        for (var t = 0; t < b.length; t++) {
            var c = b[t].split("=");
            d[c[0].trim()] = c[1] || "";
        }
        var aa = new cookie();
        var bb = ["path", "expires", "max-age", "secure", "httponly", "samesite", "domain"];
        for (var i in d) {
            if (bb.indexOf(i.toLowerCase()) !== -1) {
                aa["_" + i.toLowerCase().replace(/\-/g, "")] = d[i]||true;
            } else {
                aa._key = i;
                aa._value = d[i];
            }
        }
        r.push(aa);
    }
    return r;
};
module.exports=cookie;