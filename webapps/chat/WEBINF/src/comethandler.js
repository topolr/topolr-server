/* 
 * @packet comethandler;
 */
Module({
    name:"testhandler",
    extend:"comethandler",
    onquit:function(info){
        console.log("----quit----"+info.channelId);
        this.getCometService().broadcast({
            type:"userlogout",
            id:info.channelId
        });
    }
});

