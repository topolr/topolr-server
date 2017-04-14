var event=function (target,type,data) {
    this.type=type;
    this.target=target;
    this.data=data;
};
module.exports={
    TYPE_TASK:"task",
    TYPE_MESSAGE:"message",
    STARTSERVER:"startserver",
    TYPE_TO_MESSAGE:"tomessage",
    createEvent:function (target,type,data) {
        return new event(target,type,data);
    }
};