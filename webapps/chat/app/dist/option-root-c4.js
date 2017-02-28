window.topolr.source({"packet":[{"p":"option.root","h":"60c520a95a","c":"/* \n * @packet option.root;\n * @require chat;\n */\r\nOption({name:\"chat\",option:{override:{onendinit:function(){this.addChild({type:\"@chat.chatlogin\"})},event_loginend:function(t){this.getFirstChild().remove(),this.addChild({type:\"@chat.chatcontainer\",option:t.data})}}}});"},{"p":"chat","h":"14aecf9af2","c":"/* \n * @packet chat;\n * @template template.chatemp;\n * @css style.chatyle;\n */\r\nModule({name:\"chatlogin\",extend:\"view\",className:\"chatlogin\",template:module.getTemplate(\"@chatemp\",\"chatlogin\"),init:function(){this.render()},find_login:function(t){t.click(function(){var t=this.finders(\"input\").val();t?this.postRequest(basePath+\"comet/join\",{username:t}).done(function(i){this.out().done(function(){this.dispatchEvent(\"loginend\",{id:t,onlines:i})}.bind(this))}).fail(function(t){$.toast(t.msg)}):$.toast(\"username can not empty.\")}.bind(this))},out:function(){var t=this.dom.transition().all();return t.scope().css(\"opacity\",0),t}}),Module({name:\"chatcontainer\",extend:\"viewgroup\",className:\"chatcontainer\",layout:module.getTemplate(\"@chatemp\",\"chatcontainer\"),option:{chatlistType:\"@.chatlist\",id:\"\",onlines:[]},onbeforeinit:function(){this.option[this.option.chatlistType]={onlines:this.option.onlines}},init:function(){this.boxs={},this.read(),this.currentbox=null},read:function(){this.postRequest(basePath+\"comet/read\",{id:this.option.id}).done(function(t){t.type&&\"offline\"!==t.type?(this.read(),this.dispatchEvent(\"message\",t)):$.toast(\"You are offline!\")})},event_message:function(t){var i=t.data.type;this[\"comet_\"+i]&&(console.log(\"---->\"+i+\"<------\"),this[\"comet_\"+i](t.data))},event_openbox:function(t){var i=t.data;if(this.currentbox=i.id,this.boxs[i.id]){for(var o in this.boxs)this.boxs[o].hide();this.boxs[i.id].show()}else this.boxs[i.id]=\"in\",this.addChild({type:\"@.chatbox\",option:{id:this.option.id,info:i},container:this.finders(\"boxcontainer\")}).done(function(t){this.boxs[i.id]=t})},event_sendmsg:function(t){this.postRequest(basePath+\"comet/send\",{id:this.option.id,to:t.data.info.id,msg:t.data.msg}).done(function(){})},comet_userlogin:function(t){this.getFirstChild().add(t.id)},comet_userlogout:function(t){this.getFirstChild().remove(t.id)},comet_message:function(t){var i=t;this.boxs[i.id]?(this.boxs[i.id].addMessage(i),this.currentbox!==i.id&&this.getFirstChild().setstate(i)):(this.boxs[i.id]=\"in\",this.addChild({type:\"@.chatbox\",option:{id:this.option.id,info:{id:i.id}},container:this.finders(\"boxcontainer\")}).done(function(t){this.boxs[i.id]=t,null!==this.currentbox&&this.currentbox!==i.id&&t.hide(),t.addMessage(i)}))}}),Module({name:\"chatbox\",extend:\"view\",className:\"chatbox\",autoupdate:!0,option:{id:\"\",info:null},template:module.getTemplate(\"@chatemp\",\"chatbox\"),init:function(){this.message={id:this.option.id,info:this.option.info,message:[]},this.render(this.message)},find_send:function(t){var i=this;t.click(function(){var t=i.finders(\"input\").val();t?(i.dispatchEvent(\"sendmsg\",{info:i.option.info,msg:t}),i.addMessage({id:i.option.id,msg:t})):$.toast(\"Message can not empty!\")})},hide:function(){this.dom.hide()},show:function(){this.dom.show()},addMessage:function(t){this.message.message.push(t),this.update(this.message),this.finders(\"messbox\").scrollTop(1e10)}}),Module({name:\"chatlist\",extend:\"view\",className:\"chatlist\",autoupdate:!0,option:{onlines:[]},template:module.getTemplate(\"@chatemp\",\"chatlist\"),init:function(){this.render(this.option.onlines)},find_item:function(t){var i=this;t.click(function(){$(this).removeClass(\"state\"),i.dispatchEvent(\"openbox\",$(this).cache())})},add:function(t){this.option.onlines.push({id:t}),this.update(this.option.onlines),$.toast(\"user \"+t+\" login now.\")},remove:function(t){var i=!1;for(var o in this.option.onlines)this.option.onlines[o].id===t&&(this.option.onlines.splice(o,1),i=!0);i&&($.toast(\"user \"+t+\" logout now.\"),this.update(this.option.onlines))},setstate:function(t){this.finders(\"item\").each(function(){$(this).cache().id===t.id&&$(this).addClass(\"state\")})}}),$.toast=function(t){$(\"<div class='toast'><div class='toast_text'>\"+t+\"</div></div>\").appendTo(\"body\").transition().set(\"-all-transform\").done(function(){this.transition().removeAll().set(\"opacity\",{time:1e3}).delay(2e3).then(function(){this.css(\"opacity\",0)}).delay(1e3).done(function(){this.remove()}).resolve()}).scope().transform().y(-150)},$.loadingbar=function(){var t=$(\"#loadingbar\");return 0===t.length&&(t=$(\"<div id='loadingbar'><div class='loadingbar-bg'></div><div class='loadingbar-desc'></div></div>\").appendTo(\"body\")),new loadingbar(t)};var loadingbar=function(t){this.dom=t};loadingbar.prototype.showLoading=function(t){return this.dom.children(1).html(\"<i class='fa fa-repeat fa-spin'></i> \"+(t||\"Loading...\")),this},loadingbar.prototype.showError=function(t){var i=$.promise(),o=this;return setTimeout(function(){o.close(),i.resolve()},2e3),this.dom.children(1).html(\"<i class='fa fa-circle-cross'></i> \"+(t||\"操作错误\")),i},loadingbar.prototype.showSuccess=function(t){var i=$.promise(),o=this;return setTimeout(function(){o.close(),i.resolve()},2e3),this.dom.children(1).html(\"<i class='fa fa-circle-check'></i> \"+(t||\"操作成功\")),i},loadingbar.prototype.close=function(){this.dom.remove()};"}],"template":[{"p":"template.chatemp","h":"e6c7e07fc1","c":"<!--[chatlogin]--><div class=\"chatlogin-con\"><div class=\"chatlogin-con-label\">Input Your Name To Join Chating</div><div class=\"chatlogin-con-input\"><input data-find=\"input\" type=\"text\" placeholder=\"username\"/></div><div class=\"chatlogin-con-btn\" data-find=\"login\">Login</div></div><!--[chatcontainer]--><div class=\"chatcontainer-left\"><div class=\"chatcontainer-left-title\">Online User List</div><div class=\"chatcontainer-left-list\"><@module type=\"{{data.chatlistType}}\"/></div></div><div class=\"chatcontainer-right\" data-find=\"boxcontainer\"></div><!--[chatbox]--><div class=\"chatbox-title\">Talking With:<%=data.info.id;%></div><div class=\"chatbox-box\" data-find=\"messbox\"><%for(var i in data.message){%><%if(data.message[i].id===data.id){%><div class=\"chat-box-item right\"><span class=\"b\"><%=data.message[i].msg;%></span><span class=\"a\"><%=data.message[i].id;%></span></div><%}else{%><div class=\"chat-box-item left\"><span class=\"a\"><%=data.message[i].id;%></span><span class=\"b\"><%=data.message[i].msg;%></span></div><%}%><%}%></div><div class=\"chatbox-tools\"><div class=\"chatbox-tools-input\"><textarea data-find=\"input\"></textarea></div><div class=\"chatbox-tools-btn\" data-find=\"send\">send</div></div><!--[chatlist]--><%for(var i in data){%><div class=\"chatbox-item\" data-find=\"item\" @cache(data[i])><div class=\"a\"><%=data[i].id;%></div><div class=\"b\"><span></span></div></div><%}%>"}],"css":[{"p":"style.chatyle","h":"53a1b92a03","c":"html,body,div,span,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,abbr,address,cite,code,del,dfn,em,img,ins,kbd,q,samp,small,strong,sub,sup,var,b,i,dl,dt,dd,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,figcaption,figure,footer,header,hgroup,menu,nav,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;outline:0;font-size:100%;vertical-align:baseline;background:transparent}html,body{margin:0;padding:0;background:#f3f7fa;font-size:14px;font-family:Microsoft Yahei In-Bold,Microsoft Yahei,Apple LiGothic Medium;color:#222;width:100%;height:100%}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:'';content:none}a{margin:0;padding:0;font-size:100%;vertical-align:baseline;background:transparent}ins{background-color:#ff9;color:#000;text-decoration:none}mark{background-color:#ff9;color:#000;font-style:italic;font-weight:bold}del{text-decoration:line-through}abbr[title],dfn[title]{border-bottom:1px dotted;cursor:help}table{border-collapse:collapse;border-spacing:0}hr{display:block;height:1px;border:0;border-top:1px solid #ccc;margin:1em 0;padding:0}label{position:relative;z-index:2;display:inline-block}.fix{zoom:1}.fix:before,.fix:after{content:\"\";display:table;clear:both}.fleft{float:left}.fright{float:right}.text-left{text-align:left}.text-right{text-align:right}.text-center{text-align:center}h1,.title_1{font-size:38.5px;line-height:40px;font-weight:normal}h2,.title_2{font-size:31.5px;line-height:40px;font-weight:normal}h3,.title_3{font-size:21px;line-height:40px;font-weight:normal}h4,.title_4{font-size:21px;line-height:40px;font-weight:normal}h5,.title_5{font-size:14px;line-height:40px;font-weight:bold}h6,.title_6{font-size:11.9px;line-height:40px;font-weight:bold}p{margin:10px 0 10px 0;line-height:1.5;font-size:13px}.fix{zoom:1}.fix:before,.fix:after{content:\"\";display:table;clear:both}.chatlogin{position:absolute;left:0;top:0;right:0;bottom:0}.chatlogin .chatlogin-con{width:300px;position:absolute;left:50%;top:50%;right:auto;bottom:auto;margin-left:-150px}.chatlogin .chatlogin-con .chatlogin-con-label{line-height:45px}.chatlogin .chatlogin-con .chatlogin-con-input{line-height:40px}.chatlogin .chatlogin-con .chatlogin-con-input input{height:40px;-ms-box-sizing:border-box;box-sizing:border-box;padding:0 5px 0 5px;width:100%;border:1px solid #d7d7d7;border-radius:3px}.chatlogin .chatlogin-con .chatlogin-con-btn{line-height:45px;color:white;text-align:center;background:#4b8bf5;border-radius:3px;margin:10px 0 10px 0;cursor:default;-webkit-user-select:none;-webkit-user-drag:none;-webkit-tap-highlight-color:transparent;-moz-user-select:none;-moz-user-drag:none;-moz-tap-highlight-color:transparent;-ms-user-select:none;-ms-user-drag:none;-ms-tap-highlight-color:transparent;user-select:none;user-drag:none;tap-highlight-color:transparent;border-right:1px solid #4681e5;border-bottom:1px solid #4681e5}.chatlogin .chatlogin-con .chatlogin-con-btn:hover{background:#4883e5}.chatlogin .chatlogin-con .chatlogin-con-btn:active{background:#4376d1}.chatcontainer{position:absolute;left:0;top:0;right:0;bottom:0}.chatcontainer .chatcontainer-left{position:absolute;left:0;top:0;right:auto;bottom:0;width:300px}.chatcontainer .chatcontainer-left .chatcontainer-left-title{line-height:35px;padding:0 10px 0 10px;background:white}.chatcontainer .chatcontainer-left .chatcontainer-left-list{position:absolute;left:0;top:35px;right:0;bottom:0;border-top:1px solid #d7d7d7}.chatcontainer .chatcontainer-right{position:absolute;left:300px;top:0;right:0;bottom:0;border-left:1px solid #d7d7d7;background:#f0f0f0}.chatlist .chatbox-item{line-height:40px;background:white;border-bottom:1px solid #d7d7d7;display:-moz-flex;display:-webkit-box;display:flex}.chatlist .chatbox-item .a{-webkit-flex:1;-moz-flex:1;-ms-flexbox:1;-webkit-box-flex:1;flex:1;padding:0 10px 0 10px;overflow:hidden;text-overflow:ellipsis}.chatlist .chatbox-item .b{width:40px;text-align:center;display:none}.chatlist .chatbox-item .b span{display:inline-block;width:10px;height:10px;border-radius:50%;background:red;vertical-align:middle}.chatlist .chatbox-item.state .b{display:block}.chatbox{position:absolute;left:0;top:0;right:0;bottom:0}.chatbox .chatbox-title{line-height:35px;padding:0 10px 0 10px;background:white}.chatbox .chatbox-box{position:absolute;left:0;top:35px;right:0;bottom:60px;border-top:1px solid #d7d7d7;background:#f0f0f0;overflow:auto}.chatbox .chatbox-box .chat-box-item{padding:10px;white-space:nowrap}.chatbox .chatbox-box .chat-box-item.left .a{display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;background:white;border:1px solid #d7d7d7;-webkit-border-radius:50%;vertical-align:top;font-size:12px;overflow:hidden;text-overflow:ellipsis}.chatbox .chatbox-box .chat-box-item.left .b{vertical-align:top;display:inline-block;padding:10px;background:#39f;color:white;position:relative;margin-left:10px;white-space:normal;max-width:70%}.chatbox .chatbox-box .chat-box-item.left .b:after{content:\"\";display:block;border-top:5px solid transparent;border-right:5px solid #39f;border-bottom:5px solid transparent;border-left:5px solid transparent;-webkit-border-radius:3px;position:absolute;right:100%;top:15px}.chatbox .chatbox-box .chat-box-item.right{text-align:right;white-space:nowrap}.chatbox .chatbox-box .chat-box-item.right .a{display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;background:white;border:1px solid #d7d7d7;-webkit-border-radius:50%;vertical-align:top;font-size:12px;overflow:hidden;text-overflow:ellipsis}.chatbox .chatbox-box .chat-box-item.right .b{vertical-align:top;display:inline-block;padding:10px;background:#39f;color:white;position:relative;margin-right:10px;white-space:normal;text-align:left;max-width:70%}.chatbox .chatbox-box .chat-box-item.right .b:after{content:\"\";display:block;border-top:5px solid transparent;border-left:5px solid #39f;border-bottom:5px solid transparent;border-right:5px solid transparent;position:absolute;-webkit-border-radius:3px;left:100%;top:15px}.chatbox .chatbox-tools{position:absolute;left:0;top:auto;right:0;bottom:0;display:-moz-flex;display:-webkit-box;display:flex;border-top:1px solid #d7d7d7}.chatbox .chatbox-tools-input{-webkit-flex:1;-moz-flex:1;-ms-flexbox:1;-webkit-box-flex:1;flex:1}.chatbox .chatbox-tools-input textarea{height:60px;max-height:60px;width:100%;-ms-box-sizing:border-box;box-sizing:border-box;border-right:1px solid #d7d7d7}.chatbox .chatbox-tools-btn{width:70px;text-align:center;line-height:60px}.toast{position:fixed;left:0;right:0;bottom:-30px;height:30px;display:-webkit-box;display:-moz-box;display:box;display:-ms-flexbox;-webkit-box-orient:horizontal;-webkit-box-pack:center;-webkit-box-align:center;-moz-box-orient:horizontal;-moz-box-pack:center;-moz-box-align:center;-ms-flex-orient:horizontal;-ms-flex-pack:center;-ms-flex-align:center;box-orient:horizontal;box-pack:center;box-align:center;z-index:999999999}.toast .toast_text{line-height:30px;background:#5f5d5d;color:white;padding:0 15px 0 15px;border-radius:15px}#loadingbar{position:fixed;left:0;top:0;right:0;bottom:0;z-index:999999999;display:-webkit-box;-webkit-box-orient:horizontal;-webkit-box-pack:center;-webkit-box-align:center;display:-moz-box;-moz-box-orient:horizontal;-moz-box-pack:center;-moz-box-align:center;display:-ms-flexbox;-ms-flex-orient:horizontal;-ms-flex-pack:center;-ms-flex-align:center;display:box;box-orient:horizontal;box-pack:center;box-align:center}#loadingbar .loadingbar-bg{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.05)}#loadingbar .loadingbar-desc{position:relative;padding:15px 20px 15px 20px;background:white;-webkit-border-radius:2px;-webkit-box-shadow:1px 2px 10px #b2b2b2;-moz-border-radius:2px;-moz-box-shadow:1px 2px 10px #b2b2b2;-ms-border-radius:2px;-ms-box-shadow:1px 2px 10px #b2b2b2;border-radius:2px;box-shadow:1px 2px 10px #b2b2b2}"}]});