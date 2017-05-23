var topolr=require("topolr-util");
var channel = function (id, keeptime) {
    this.channelId = id;
    this.keeptime = keeptime;
    this.time = new Date().getTime();
    this.tid=null;
    this.session = {};
    this.msg=[];
    this.reader=[];
    this.isquit=false;
    this._next();
};
channel.prototype.isActive = function () {
    var a = new Date().getTime() - this.time;
    return a < this.keeptime + 10000;
};
channel.prototype.isChannelId = function (id) {
    return this.channelId === id;
};
channel.prototype.read = function (fn) {
    this.time=new Date().getTime();
    this.reader.push(fn);
    if(this.msg.length>0){
        this._run();
    }
    return this;
};
channel.prototype.write = function (msg) {
    this.msg.push(msg);
    this._run();
};
channel.prototype.getAttr = function (key) {
    return this.session[key];
};
channel.prototype.setAttr = function (key, obj) {
    this.session[key] = obj;
    return this;
};
channel.prototype.getAttrs = function () {
    return this.session;
};
channel.prototype.getChannelId = function () {
    return this.channelId;
};
channel.prototype.quit = function () {
    this.isquit=true;
    clearTimeout(this.tid);
    for (var i in this) {
        this[i] = null;
    }
};
channel.prototype._next=function () {
    var ths=this;
    if(!this.isquit) {
        this.tid = setTimeout(function () {
            ths._run();
            ths._next();
        }, this.keeptime);
    }
};
channel.prototype._run=function () {
    var a=this.reader.pop();
    if(a){
        a.resolve(this.msg.pop()||{type:"nodata"});
    }
};

Module({
    name: "comethandler",
    dao: "mysql",
    init: function () {
        var t=project.getService("daoservice");
        if(t) {
            this.dao = project.getService("daoservice").getDao(this.dao);
        }
    },
    onquit: function (info) {
        this.getProjectInfo().getService("cometservice").broadcast({
            type:"userlogout",
            id:info.channelId
        });
    },
    getCometService:function(){
        return project.getService("cometservice");
    }
});
Module({
    name: "cometservice",
    extend: "service",
    option: {
        keeptime: 20000,
        handler: "comethandler"
    },
    start: function (done) {
        this.channels = {};
        this.handler = packetLoader.get(this.option.handler);
        this.handler.init();
        var ths = this;
        setInterval(function () {
            ths.clean();
        }, 3000);
        return topolr.promise(function(a){a();});
    },
    check: function (id) {
        return this.channels[id] !== undefined;
    },
    join: function (cid) {
        var id = cid || topolr.util.uuid();
        this.channels[id] = new channel(id, this.option.keeptime, this);
        return id;
    },
    read: function (id) {
        var ps=topolr.promise();
        if (this.channels[id]) {
            this.channels[id].read(ps);
        } else {
            fn && fn({
                type:"offline"
            });
        }
        return ps;
    },
    getChannel: function (id) {
        return this.channels[id];
    },
    write: function (id, msg) {
        if (this.check(id)) {
            this.getChannel(id).write(msg);
        }
        return this;
    },
    broadcast: function (msg) {
        for (var i in this.channels) {
            this.channels[i].write(msg);
        }
        return this;
    },
    broadcastWithout: function (id, msg) {
        for (var i in this.channels) {
            if (i !== id) {
                this.channels[i].write(msg);
            }
        }
        return this;
    },
    quit: function (id) {
        if (this.channels[id]) {
            this.channels[id].quit();
            delete this.channels[id];
        }
        return this;
    },
    clean: function () {
        for (var i in this.channels) {
            if (!this.channels[i].isActive()) {
                this.handler.onquit(this.channels[i]);
                this.channels[i].quit();
                delete this.channels[i];
            }
        }
    },
    each: function (fn) {
        if (fn) {
            for (var i in this.channels) {
                var t = fn.call(this.channels[i], i);
                if (t === false) {
                    break;
                }
            }
        }
    },
    getChannelList: function () {
        return this.channels;
    }
});

Module({
    name: "cometcontroller",
    extend: "controller",
    getCometService: function () {
        return this.getProjectInfo().getService("cometservice");
    }
});