/**
 * @packet main;
 * @template template.temp;
 * @js lib.prism;
 * @css lib.prism;
 * @css style.main;
 */
Module({
    name:"codetab",
    extend:"view",
    className:"codetab",
    template:module.getTemplate("@temp","codetab"),
    option:{
        tabs:[],
        codes:[]
    },
    init:function(){
        this.render(this.option);
        this.finders("title").eq(0).click();
    },
    bind_title:function(dom){
        var index=dom.index(),content=this.finders("content").eq(index),ths=this;
        if(content.children().length===0){
            var info=content.cache();
            var q=$("<div class='codetab-loading'><i class='fa fa-spinner9 fa-spin'></i></div>").appendTo(content);
            $.ajax({
                method:"get",
                url:info.code
            }).done(function (a) {
                if(info.type==="html"){
                    a=ths.parseCode(a);
                }
                q.remove();
                var t=$("<pre style='overflow:initial' class='line-numbers' data-language='"+info.type+"'><code class='language-"+info.type+"'>"+a+"</code></pre>").appendTo(content);
                Prism.highlightElement(t.children(0).get(0));
            });
        }
        this.finders("title").each(function(){
            $(this).removeClass("active");
        });
        this.finders("content").each(function(){
            $(this).removeClass("active");
        });
        dom.addClass("active");
        this.finders("content").eq(index).addClass("active");
    },
    parseCode:function(str){
        return str.replace(/&/g, "&gt;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;").replace(/\'/g, "&#39;").replace(/\"/g, "&quot;");
    }
});
Option({
    name:"helloption",
    option:{
        tabs:["Javascript","Template","Sass","base.scss"],
        codes:[
            {type:"javascript",code:sitePath+"app/src/demo/hello/base.js"},
            {type:"html",code:sitePath+"app/src/demo/hello/template/temp.html"},
            {type:"css",code:sitePath+"app/src/demo/hello/style/hello.scss"},
            {type:"css",code:sitePath+"app/src/demo/hello/style/base.scss"}
        ]
    }
});
Option({
    name:"todoption",
    option:{
        tabs:["Javascript","Service","Template","Style"],
        codes:[
            {type:"javascript",code:sitePath+"app/src/demo/todos/todos.js"},
            {type:"javascript",code:sitePath+"app/src/demo/todos/service/testservice.js"},
            {type:"html",code:sitePath+"app/src/demo/todos/template/temp.html"},
            {type:"css",code:sitePath+"app/src/demo/todos/style/todostyle.scss"}
        ]
    }
});