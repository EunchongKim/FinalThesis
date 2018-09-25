"use strict";
//This function is used to collect data
//1678 Videos stored

var addressArray = new Array();
var indexArray = new Array();
parseData();

var sql = require("sqlite3");
var db = new sql.Database("data_moe.db");
db.serialize(create);
db.serialize(insertVideo);

function create() {

    db.run("drop table if exists Labels");
    db.run("create table Labels (id, name)");
    db.run("insert into Labels values (1,'Weight Training')");
    db.run("insert into Labels values (2,'Gym')");
    db.run("insert into Labels values (3,'Squat')");
    db.run("insert into Labels values (4,'Barbell')");
    db.run("insert into Labels values (5,'Stretching')");
    db.run("insert into Labels values (6,'Aerobics')");
    db.run("insert into Labels values (7,'Pull-up')");
    db.run("insert into Labels values (8,'Dumbbell')");
    db.run("insert into Labels values (9,'Bodyweight Exercise')");
    db.run("insert into Labels values (10,'Pilates')");
    db.run("insert into Labels values (11,'Kettlebell')");
    db.run("insert into Labels values (12,'Indoor Cycling')");
    db.run("insert into Labels values (13,'Treadmill')");
    db.run("insert into Labels values (14,'Exercise Ball')");
    db.run("insert into Labels values (15,'Health Club')");
    db.run("insert into Labels values (16,'Burpee')");

    db.run("drop table if exists Videos");
    db.run("create table Videos (id PRIMARY KEY, title, owner, view, created, labels)");
}

function insertVideo() {
    var query = "insert into Videos (id, title, owner, view, created, labels) values (?, ?, ?, ?, ?, ?)";
    var ps = db.prepare(query);

    (async function loop() {
        // addressArray.length
        for (let i = 0; i < addressArray.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            var fetchVideoInfo = require('youtube-info');
            fetchVideoInfo(addressArray[i]).then(function (videoInfo) {
                if (String(videoInfo.thumbnailUrl).includes("maxresdefault") && videoInfo.views > 1 &&
                    String(videoInfo.title).match(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? ]+$/)) {
                    ps.run(addressArray[i], videoInfo.title.replace("'", "\'").replace("&", "&amp;"),
                        videoInfo.owner.replace("'", "\'").replace("&", "&amp;"), videoInfo.views,
                        videoInfo.datePublished, indexArray[i]);
                }
            });
            console.log(i);
        }
    })();
}

function parseData() {
    var fs = require('fs');
    var data = fs.readFileSync("rawdata/RealVideoData_moe.csv").toString();
    var array = data.split("\n");

    for (var i = 0; i < array.length; i++) {
        var temp = array[i].replace("\r", "");
        var line = temp.split(",");
        if (line[0].length !== 11) {
            continue;
        }
        addressArray.push(line[0]);
        var str = line[1];

        indexArray.push(str);
    }
}