/*
 * @packet service.chat;
 */

Module({
    name: "chatservice",
    extend: "publicservice",
    option: {},
    init: function () {
        this.start();
    },
    service_login: function (un) {
        var ths = this;
        this.postRequest(sitePath + "comet/join",{username: un}).done(function (a) {
            ths.id = un;
            ths.data.id=un;
            ths.data.onlines=a;
            ths.read();
            ths.trigger("loginend",ths.data);
        });
    },
    read: function () {
        var ths = this;
        this.stop();
        this.postRequest(sitePath + "comet/read", {id: this.id}).done(function (a) {
            ths.trigger("message", a);
            ths.read();
            ths.start();
        });
    },
    service_write: function (a) {
        this.postRequest(sitePath + "comet/send", $.extend({id: this.id}, a)).done(function (a) {
        });
    },
    quit: function () {
        this.postRequest(sitePath + "comet/quit", {id: this.id}).done(function (a) {
            console.log("quit-%o", a);
        });
    },
    broadcast: function (a) {
        this.write(a);
    }
});
Module({
    name: "chatlistservice",
    extend: "publicservice",
    option: {},
    init: function () {
        this.data = [];
        this.start();
    },
    service_add: function (info) {
        var id = info.id, has = false;
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].id === id) {
                has = true;
                this.data[i] = info;
            }
        }
        if (!has) {
            this.data.push(info);
        }
        console.log(this.data);
        this.trigger();
    },
    service_remove: function (id) {
        var t = [];
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].id !== id) {
                t.push(this.data[i]);
            }
        }
        this.data = t;
        this.trigger();
    },
    service_state: function (id) {
        var t = [];
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].id === id) {
                this.data[i].state = true;
            }
        }
        this.trigger();
    },
    service_unstate: function (id) {
        var t = [];
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].id === id) {
                this.data[i].state = false;
            }
        }
        this.trigger();
    }
});
Module({
    name:"chatboxservice",
    extend:"privateservice",
    init:function () {
        this.data={
            id:this.option.id,
            info:this.option.info,
            message:[]
        };
        this.start();
    },
    service_add:function (info) {
        this.data.message.push(info);
        this.trigger();
    }
});