var topolr=require("topolr-util");
var _session=require("./../../bin/base/session");
var session=function () {
    this._data={};
};
session.prototype.create=function () {
    var id=topolr.util.uuid();
    this._data[id]=_session(id);
    return id;
};
session.prototype.remove=function (id) {
    delete this._data[id];
};
session.prototype.check=function (id) {
    return this._data[id]!==undefined;
};
session.prototype.start=function () {
    // console.log("session start");
};
session.prototype.stop=function () {
    console.log("session stop");
};
session.prototype.excute=function (parameters) {
    var method=parameters.shift(),id=parameters.shift();
    if(this._data[id]){
        return this._data[id][method].apply(this._data[id],parameters);
    }
    return null;
};
module.exports=session;
