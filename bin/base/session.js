var session = function (id) {
    this._data = {};
    this._build = new Date().getTime();
    this._id = id;
};
session.resetTime = function () {
    this._build = new Date().getTime();
};
session.prototype.hasAttribute = function (key) {
    session.resetTime.call(this);
    return this._data.hasOwnProperty(key);
};
session.prototype.getAttribute = function (key) {
    session.resetTime.call(this);
    return this._data[key];
};
session.prototype.setAttribute = function (key, value) {
    session.resetTime.call(this);
    this._data[key] = value;
    return this;
};
session.prototype.removeAttribute = function (key) {
    session.resetTime.call(this);
    var r = {};
    for (var i in this._data) {
        if (i !== key) {
            r[i] = this._data[i];
        }
    }
    this._data = r;
    return this;
};
session.prototype.clear = function () {
    session.resetTime.call(this);
    this._data = {};
};
session.prototype.getId=function () {
    return this._id;
};
session.prototype.getAllAttributes=function () {
    return this._data;
};
session.prototype.getCreateTime=function () {
    return this._build;
};

module.exports = function (id) {
    return new session(id);
};