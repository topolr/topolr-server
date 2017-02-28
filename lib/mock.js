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
    doFilter: function (view, next) {
        var response = this.response;
        view.goon(function (done) {
            var ths = this;
            if (response.getStatusCode() === "404") {
                var url=this.getRequest().getURL();
                project.getAttr("mock").doRequest(url, this.getRequest().getParameters()).done(function (a) {
                    if (a) {
                        util.logger.mock();
                        ths.getModule("jsonview", {data: a}).doRender(function () {
                            ths.next();
                        });
                    } else {
                        ths.next();
                    }
                }).fail(function () {
                    ths.next();
                });
            }else{
                ths.next();
            }
        });
        next(view);
    }
});