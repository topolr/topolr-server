/*
 * @packet base.controller; 
 */
Module({
    name: "index",
    extend: "cometcontroller",
    path: "/comet",
    success: function (a) {
        if (arguments.length === 0) {
            return this.getJsonView({code: "1"});
        } else {
            return this.getJsonView({code: "1", data: a});
        }
    },
    error: function (msg) {
        if (arguments.length === 0) {
            return this.getJsonView({code: "0"});
        } else {
            return this.getJsonView({code: "0", msg: msg});
        }
    },
    "/read": function () {
        var ths = this, id = this.request.getParameter("id");
        return this.getCometService().read(id).then(function (msg) {
            return ths.success(msg);
        });
    },
    "/write": function () {
        this.getCometService().broadcast(this.request.getParameter("msg"));
        return this.success();
    },
    "/join": function () {
        var username = this.request.getParameter("username");
        if (!this.getCometService().check(username)) {
            this.getCometService().join(username);
            var online = [];
            this.getCometService().each(function () {
                online.push({
                    id:this.getChannelId()
                });
            });
            this.getCometService().broadcast({
                type:"userlogin",
                id:username
            });
            return this.success(online);
        } else {
            return this.error("You are in chat,check it.");
        }
    },
    "/send":function(){
        var msg = this.request.getParameter("msg"), id = this.request.getParameter("id"), to = this.request.getParameter("to");
        this.getCometService().write(to, {
            id: id,
            msg: msg,
            type: "message",
            form:id
        });
        return this.success();
    },
    "/sendto": function () {
        var msg = this.request.getParameter("msg"), id = this.request.getParameter("id");
        this.getCometService().broadcastWithout(id, {
            username: id,
            msg: msg,
            type: "broadcast"
        });
        return this.success();
    },
    "/quit": function () {
        this.getCometService().quit(this.request.getParameter("id"));
        return this.success();
    }
});