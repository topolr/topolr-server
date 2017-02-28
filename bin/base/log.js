var fs = require("fs");
var stream = require('stream');
var topolr = require("topolr-util");

var logger = function (name, option) {
    var ths = this;
    this.option = option;
    this._writer = new stream.Writable();
    this._writer.write = function (data) {
        ths.write(data);
    };
    this._name = name;
    this._path = option.path;
    this._level = option.level;
    this._maxsize = option.maxsize;
    var _e = 0, _currentFilePath = "";
    topolr.file(this._path).subscan(function (path) {
        if (topolr.file(path).suffix() === "log") {
            var a = topolr.cpath.getNormalizePath(path).split("/").pop();
            if(a===ths._name+".log"){
                _e=0;
                _currentFilePath=path;
            }else {
                var b = a.split(/\./);
                if (b.length === 3) {
                    if (b[1] > _e) {
                        _e = b[1] / 1;
                        _currentFilePath = path;
                    }
                }
            }
        }
    });
    this._current = _e;
    this._currentSize = topolr.file(_currentFilePath).infoSync().size;
    this._currentFilePath = _currentFilePath;
};
logger.prototype.write = function (data) {
    var ismake = false;
    if (this._currentFilePath) {
        var b = this._currentSize + data.length;
        if (b > this._maxsize) {
            this._current++;
            this._currentSize = 0;
            if (this._reader) {
                this._reader.end();
            }
            this._reader=null;
            ismake = true;
        } else {
            this._currentSize = b;
        }
    } else {
        ismake = true;
    }
    if (ismake) {
        this._currentFilePath = this._path + "/" + this._name + (this._current ? ("." + this._current) : "") + ".log";
        topolr.file(this._currentFilePath).write("");
    }
    if (!this._reader) {
        this._reader = fs.createWriteStream(this._currentFilePath, {
            flags: "a",
            encoding: "utf-8",
            mode: 0666
        });
    }
    this._reader.write(data.toString());
};

module.exports = function (option) {
    option.path = topolr.cpath.getNormalizePath(option.path);
    option.path = option.path.replace(/\{server\}/g, function () {
        return topolr.cpath.getRelativePath(__dirname, "./../");
    });
    var info = new logger("log", option);
    var err = new logger("error", option);
    return {
        out: info._writer,
        err: err._writer
    };
};