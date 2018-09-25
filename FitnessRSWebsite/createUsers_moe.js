
//This function is used to store user and watch history data

var sql = require("sqlite3");
var db;


module.exports.newUserDB = newUserDB;

function newUserDB() {
    db = new sql.Database("data_moe.db");
    db.serialize(create);
    db.serialize(insertUser);
    db.close();
}

function create() {
    var ps0 = db.prepare("drop table if exists WatchHistory");
    var ps1 = db.prepare("drop table if exists Users");
    var ps2 = db.prepare("create table if not exists Users (id integer PRIMARY KEY, name text, preference text)");
    var ps3 = db.prepare("create table if not exists WatchHistory (user integer, video text, primary key (user, video))");
    ps0.run();
    ps1.run();
    ps2.run();
    ps3.run();
    ps0.finalize();
    ps1.finalize();
    ps2.finalize();
    ps3.finalize();
}

//Chenxi 5/16 For parsing data
function insertUser() {
    var ps0 = db.prepare("insert or replace into Users (id, name, preference) values (?, ?, ?)");
    var ps1 = db.prepare("insert or replace into WatchHistory (user, video) values (?, ?)");
    var fs = require('fs');
    var data = fs.readFileSync("rawdata/newpreference.csv").toString();

    var array = data.split("\n");

    for (var i = 0; i < array.length; i++) {

        var temp = array[i].replace("\r", "");
//        console.log(temp);

        var line = temp.split(",");
        var user = line[0];
        var prefer = line[1];
        ps0.run(user, "User"+(i+1), prefer);

        var history = line[2].split(";");
        for (var j = 0; j < history.length; j++) {
            if (! history[j] == "") {
                ps1.run(user, history[j]);
            }
        }
    }
    ps0.finalize();
    ps1.finalize();
}