var manager=require("./manager");
var serviceContainer=function (context) {
    this._context=context;
    this._service={};
    var sservice=manager.getShareServices();
    for(var i=0;i<sservice.length;i++){
        var a=sservice[i];
        serviceContainer.startservice.call(this,{
            path:a.path,
            serviceName:a.name
        });
    }
};
serviceContainer.handler={
    task:function (data) {
        var name=data.serviceName,method=data.method,parameters=data.parameters;
        if(this._service[name]&&this._service[name][method]){
            return this._service[name][method](parameters);
        }
        return null;
    },
    stopservice:function () {
        for(var i in this._service){
            this._service[i].stop();
        }
    },
    startservice:function (data) {
        var path=data.path,serviceName=data.serviceName;
        if(path&&!this._service[serviceName]){
            var a=require(path);
            var service=new a(this._context);
            this._service[serviceName]=service;
            this._service.start(data.option||{});
        }
    }
};
serviceContainer.prototype.excute=function (data) {
    var type=data.type,_data=data.data;
    if(serviceContainer[type]){
        return serviceContainer[type].call(this,_data);
    }
    return null;
};

module.exports=function (context) {
    return new serviceContainer(context);
};