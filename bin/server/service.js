var manager=require("./manager");
var actions={
    service:{},
    task:function (data) {
        var name=data.serviceName,method=data.method,parameters=data.parameters;
        if(actions.service[name]&&actions.service[name][method]){
            return actions.service[name][method](parameters);
        }
        return null;
    },
    startservice:function (data) {
        var path=data.path,serviceName=data.serviceName;
        if(path&&!actions.service[serviceName]){
            var a=require(path);
            var service=new a();
            actions.service[serviceName]=service;
            service.start(data.option||{});
        }
    }
};
var sservice=manager.getShareServices();
for(var i=0;i<sservice.length;i++){
    var a=sservice[i];
    actions.startservice({
        path:a.path,
        serviceName:a.name
    });
}
module.exports={
    excute:function (data) {
        var type=data.type,_data=data.data;
        if(actions[type]){
            return actions[type](_data);
        }
        return null;
    }
};