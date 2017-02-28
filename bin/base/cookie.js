var cookie = function (str) {
    this._str = str;
    this._info = {};
    if (str) {
        this._str.split(';').forEach(function (Cookie) {
            var parts = Cookie.split('=');
            this._info[ parts[ 0 ].trim() ] = (parts[ 1 ] || '').trim();
        }.bind(this));
    }
};
cookie.prototype.get = function (key) {
    return this._info[key];
};
module.exports = function (str) {
    return new cookie(str);
};