var topolr = require("topolr-util");
var cookie = function (str) {
    this._str = str;
    this._info = {};
    if (str) {
        this._str.split(';').forEach(function (Cookie) {
            var parts = Cookie.split('=');
            this._info[parts[0].trim()] = (parts[1] || '').trim();
        }.bind(this));
    }
};
cookie.prototype.get = function (key) {
    return this._info[key];
};

var header = function (arr) {
    this._headers = {};
    if (topolr.is.isArray(arr)) {
        arr.forEach(function (n, i) {
            var t = i + 1;
            if (t % 2 !== 0) {
                this._headers[n.toLowerCase()] = arr[t];
            }
        }.bind(this));
    } else {
        for (var i in arr) {
            this._headers[i.toLowerCase()] = arr[i];
        }
    }
};
header.prototype.getHost = function () {
    return this._headers.host;
};
header.prototype.getPort = function () {
    return this.getHost().split(":")[1];
};
header.prototype.getDomain = function () {
    return this.getHost().split(":")[0];
};
header.prototype.getConnection = function () {
    return this._headers.connection;
};
header.prototype.getAccept = function () {
    return this._headers.accept;
};
header.prototype.getUserAgent = function () {
    return this._headers["user-agent"];
};
header.prototype.getAcceptEncoding = function () {
    return this._headers["accept-encoding"];
};
header.prototype.getAcceptLanguage = function () {
    return this._headers["accept-language"];
};
header.prototype.getCookie = function () {
    return new cookie(this._headers.cookie);
};
header.prototype.getCookieContent = function () {
    return this._headers["cookie"];
};
header.prototype.getAttr = function (key) {
    return this._headers[key];
};
header.prototype.getReferer = function () {
    console.log(this._headers);
    return this._headers["referer"];
};
header.prototype.getHeadersInfo = function () {
    return this._headers;
};

var request = function (req, data) {
    this._headers = new header(data.rawHeaders);
    this._rawURL = data.rawURL;
    this._context = null;
    this._data = {};
    this._session = null;
    this._method = data.method;
    this._url = data.url;
    this._realreq = req;
    this._attr = {};
    this._files = {};
    this._posts = {};
    this._gets = {};
    this._clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
};
request.prototype.getRealRequest = function () {
    return this._realreq;
};
request.prototype.getHeaders = function () {
    return this._headers;
};
request.prototype.getMethod = function () {
    return this._method;
};
request.prototype.hasPrarameter = function (key) {
    return this._data[key] !== undefined;
};
request.prototype.getParameter = function (key) {
    return this._data[key];
};
request.prototype.getParameters = function () {
    if (arguments.length === 0) {
        return this._data;
    } else if (arguments.length === 1) {
        var a = arguments[0];
        if (topolr.is.isArray(a)) {
            var r = {};
            for (var i = 0; i < a.length; i++) {
                r[a[i]] = this._data[a[i]];
            }
            return r;
        } else if (topolr.is.isObject(a)) {
            var r = {};
            for (var i in a) {
                r[i] = a[i];
                if (this._data[i] !== undefined) {
                    r[i] = this._data[i];
                }
            }
            return r;
        } else {
            var r = {};
            r[a] = this._data[a];
            return r;
        }
    } else {
        var paras = Array.prototype.slice.call(arguments), ex = {};
        if (topolr.is.isObject(paras[paras.length - 1])) {
            ex = paras.pop();
        }
        var r = {}, a = paras;
        for (var i = 0; i < a.length; i++) {
            r[a[i]] = this._data[a[i]];
        }
        topolr.extend(r, ex);
        return r;
    }
};
request.prototype.setAttr = function (key, value) {
    this._attr[key] = value;
    return this;
};
request.prototype.getAttr = function (key) {
    return this._attr[key];
};
request.prototype.hasAttr = function (key) {
    return this._attr[key] !== undefined;
};
request.prototype.removeAttr = function (key) {
    delete this._attr[key];
    return this;
};
request.prototype.removeAllAttr = function () {
    this._attr = {};
};
request.prototype.getURL = function () {
    return this._url;
};
request.prototype.getRawURL = function () {
    return this._rawURL;
};
request.prototype.getProjectURL = function () {
    if (this._context._name === "ROOT") {
        return this._url;
    } else {
        return this._url.substring(this._context._name.length + 1);
    }
};
request.prototype.getContext = function () {
    return this._context;
};
request.prototype.getSession = function () {
    return this._session;
};
request.prototype.isAjax = function () {
    return this.getHeaders().getAttr("x-requested-with") === "XMLHttpRequest";
};
request.prototype.isPostRequest = function () {
    return this.getMethod() === "post";
};
request.prototype.isGetRequest = function () {
    return this.getMethod() === "get";
};
request.prototype.getHttpPath = function () {
    var t = this.getContext()._name;
    if (t === "ROOT") {
        t = "";
    }
    return TopolrServer.getServerProtocol() + "://" + this.getHeaders().getHost() + "/" + (t ? t + "/" : "");
};
request.prototype.getRequestURL = function () {
    return TopolrServer.getServerProtocol() + "://" + this.getHeaders().getHost() + this.getURL();
};
request.prototype.isSpiderByUA = function () {
    var t = this.getContext();
    var r = false;
    var s = t.getConfig().spider;
    var us = this.getHeaders().getUserAgent();
    for (var i in s) {
        if (us.indexOf(i) !== -1) {
            r = true;
        }
    }
    return r;
};
request.prototype.isSpider = function () {
    var t = this.getContext();
    var r = false;
    var s = t.getConfig().spider;
    var ip = this._clientIp;
    var us = this.getHeaders().getUserAgent();
    for (var i in s) {
        if (us.indexOf(i) !== -1) {
            var a = s[i].indexOf(ip);
            if (a !== -1) {
                r = true;
                break;
            } else {
                var n = ip.split(".");
                n.pop();
                var b = n.join(".") + ".*";
                if (s[i].indexOf(b) !== -1) {
                    r = true;
                }
            }
        }
    }
    return r;
};
request.prototype.getClientIp = function () {
    return this._clientIp;
};
request.prototype.getPostData = function () {
    return topolr.extend({}, this._posts);
};
request.prototype.getGetData = function () {
    return topolr.extend({}, this._gets);
};
request.prototype.getMultipartData = function () {
    return topolr.extend({}, this._files);
};

module.exports = function (req, data) {
    return new request(req, data);
};