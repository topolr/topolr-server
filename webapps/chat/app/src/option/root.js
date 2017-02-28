/* 
 * @packet option.root;
 * @require chat;
 */
Option({
    name:"chat",
    option:{
        override:{
            onendinit:function(){
                this.addChild({
                    type:"@chat.chatlogin"
                });
            },
            event_loginend:function(e){
                this.getFirstChild().remove();
                this.addChild({
                    type:"@chat.chatcontainer",
                    option:e.data
                });
            }
        }
    }
});
