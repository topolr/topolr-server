var topolr = require("topolr-util");
var mock = require("topolr-mock");
var util=require("./../bin/util/util");
Module({
    name: "mockservice",
    extend: "service",
    option: {
        path: "",
        builterPath: "",
        parserPath: ""
    },
    start: function (done) {
        project.setAttr("mock", mock({
            path: this.getLocalPath(this.option.path),
            builterPath: this.getLocalPath(this.option.builterPath),
            parserPath: this.getLocalPath(this.option.parserPath),
            project:project.getProjectName()
        }));
        return topolr.promise(function (a) {
            a();
        })
    },
    getLocalPath:function (path) {
        return path.replace(/\{[a-zA-Z]+\}/g, function (a) {
            a = a.substring(1, a.length - 1);
            if (a === "project") {
                return project.getProjectPath()
            }else if(a==="webinfo"){
                return project.getProjectPath()+"/WEBINF/";
            }
        });
    }
});
Module({
    name: "mockfilter",
    extend: "filter",
    position:"end",
    doFilter: function (view, next) {
        var ths = this, response = this.response,request=this.request;
        if (response.getStatusCode() === "404") {
            var url=request.getURL();
            project.getAttr("mock").doRequest(url, request.getParameters()).done(function (a) {
                if (a) {
                    util.logger.mock();
                    ths.getModule("jsonview", {data: a}).render().then(function () {
                        response.setStatusCode("200");
                        next(view);
                    });
                } else {
                    next(view);
                }
            }).fail(function (e) {
                next(view);
            });
        }else{
            next(view);
        }
    }
});