var cetus=require("topolr-cetus");
var service=function () {
    this._cetus=null;
};
service.prototype.getContent=function (url) {
    return this._cetus.getContent(url);
};
service.prototype.start=function (option) {
    this._cetus=cetus.getContenter(option);
};
service.prototype.stop=function () {
};
module.exports=service;