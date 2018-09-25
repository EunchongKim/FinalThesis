"use strict"
var port = 8080;
var verbose = true;

// Start the server:

var http = require("http");
var fs = require("fs");
var sql = require("sqlite3");
var db = new sql.Database("data.db");
var similarity = require( 'compute-cosine-similarity' );
var OK = 200, NotFound = 404, BadType = 415, Error = 500;
var types, banned;
var dataSize = 1678;
var resSize = 30;
var labelNum = 16;
var userSize = 10;
var currentUser = 10;
var dialog = require('dialog-node');


var label_list = ['Weight Training', 'Gym', 'Squat', 'Barbell', 'Stretching', 'Aerobics', 'Pull-up',
    'Dumbbell', 'Bodyweight Exercise', 'Pilates', 'Kettlebell', 'Indoor Cycling', 'Treadmill', 'Exercise Ball',
    'Health Club', 'Burpee'];

var spawn = require('child_process').spawn,
    py    = spawn('python', ['Hybrid.py']);
var PythonShell = require('python-shell');

start();

// Start the http service. Accept only requests from localhost, for security.
function start() {
    if (! checkSite()) return;
    types = defineTypes();
    banned = [];
//    banUpperCase("./public/", "");
    var service = http.createServer(handle);
    service.listen(port, "localhost");
    var address = "http://localhost";
    if (port != 80) address = address + ":" + port;
    console.log("Server running at", address);
}

// Serve a request by delivering a file.
async function handle(request, response) {

    //write user's history to cookie
    writeHistory(request, response);

    var url = request.url;
    if (url.endsWith("/")) {
        url = url + "index.html";
 //       console.log(request.method);
        if (request.method === 'POST') {
            var newUser = require('./createUsers');
            newUser.newUserDB();
        }
    }
//    if (url.startsWith("/GoogleLogin.html")) return logIn(url, response);
    if (url.startsWith("/video.html")) return getVideo(url, response);

    if (url.startsWith("/prefer_videos?labelid")) {
        return getLabelPage(url, response);
    }

    if (url.startsWith("/prefer_videos?update")) {
        return callImplicit(response);
    }
    if (url.startsWith("/prefer_videos")) {
        var res = [];
        var cookies = request.headers.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            if (cookies[i].includes("preIndex=")) {
                var userIndex = cookies[i].split("Index=")[1];
                printChoices(userIndex);
//                console.log(request.method);
                if (request.method == 'POST') {
                    var isUser = await callPrevPref(res);
//                    console.log(isUser);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (isUser) {
                        var resStr = res.join('');
//                        console.log(resStr);
                        return getMain(response);
                    }
                    else {
                        url = "/index.html";
                    }
                }
                else {
                    var res = changeBin(userIndex);
                    return getMain(response);
                }
            }
        }
    }

    if (url.startsWith("/history_videos")) {
        return getHistoryVideos(request, response);
    }

    if (isBanned(url)) return fail(response, NotFound, "URL has been banned");
    var type = findType(url);
    if (type == null) return fail(response, BadType, "File type unsupported");
    var file = "./public" + url;
    fs.readFile(file, ready);
    function ready(err, content) { deliver(response, type, err, content); }
}

function printChoices(userIndex) {
    for (var i = 0; i < labelNum; i++) {
        if (userIndex&1 === 1) {
            console.log(label_list[i]);
        }
        userIndex >>= 1;
    }
}

function callPrevPref(res) {
//    db = new sql.Database("data.db");
    var callback = function(code, stderr) {
        console.log("You don't have a previous choice. Please choose now!");
    };
    var ps = db.prepare("select * from Users where id=?");
    ps.get(currentUser,  (err, row) => {
        if (err || !row) {
            dialog.info("You don't have a previous choice. Please choose now!", "Alert", 100, callback);
            return false;
        }
        else {
            res.push(row.preference);
            return true;
        }
    });
//    db.close();
      return true;
}

function changeBin(binary) {
    var res = [];
    for (var i = 0; i < labelNum; i++) {
        res.push(binary&1);
        binary >>= 1;
    }
    var resStr = res.join(";");
//    db = new sql.Database("data.db");
    var store = db.prepare("insert or replace into Users (id, name, preference) values (?, ?, ?)");
    store.run(currentUser, "User"+(currentUser+1), resStr);
//    db.close();
    return resStr;
}

function writeHistory(request, response){
    var numOfHis = 21;
    var ref = request.headers.referer;
//    db = new sql.Database("data.db");
    var query1 = "insert or replace into WatchHistory (user, video) values (?, ?)";
    var ps1 = db.prepare(query1);

    if(ref) {
        var refArray= request.headers.referer.split("id=");
        if(refArray.length === 2 && refArray[0].startsWith("http")) {
            var videoId = refArray[1];
            if (videoId.length === 11) {
                //get current history
                var videoIdArray = readHistoryFromCookie(request);
                if (!isHistoryContains(videoIdArray, videoId)) {
                    if (videoIdArray.length === numOfHis) {
                        videoIdArray.shift();
                    }
                    videoIdArray.push(videoId);
//                    console.log(videoId);
                    ps1.run(currentUser, videoId);
//                    db.close();
//                writeArrayToCookie(response, videoIdArray);
                }
            }
        }
    }
}

function writeArrayToCookie(response, videoIdArray) {
    var historyString = videoIdArray[0];
    for (let i = 1; i < videoIdArray.length; i++) {
        historyString += "/" + videoIdArray[i];
    }
    response.setHeader("Set-Cookie",
        ["history=" + historyString+ ";expires=" + new Date(new Date().getTime()+86409000).toUTCString()]);

}

function readHistoryFromCookie(request) {
    var cookies = request.headers.cookie.split(";");
    var historyString;
    var videoIdArray = [];
    for (let i = 0; i < cookies.length; i++) {
        if (cookies[i].includes("history")) {
            historyString = cookies[i].split("=")[1];
            videoIdArray = historyString.split("/");
            break;
        }
    }
    return videoIdArray;
}

function isHistoryContains(videoIdArray, videoId) {
    for (var i = 0; i < videoIdArray.length; i++) {
        if (videoIdArray[i] === videoId) {
            return true;
        }
    }
    return false;
}

//get history videos and send it to front end
function getHistoryVideos(request, response) {

    var callback = function(code, stderr) {
        console.log("You don't have a history.");
    };
    var historyVideoArray = [];
    var ps = db.prepare("select * from WatchHistory where user = ?");
    ps.all(currentUser, (err, rows) => {
        if (err || rows.length === 0) {
            dialog.info("You don't have a history", "Alert", 100, callback);
            return getMain(response);
        }
        rows.forEach(function (row) {
            historyVideoArray.push(row.video);
        });
    });
//    db.close();

    fs.readFile("./history.html", ready);
    function ready(err, content) {
        getHistoryData(content, response, historyVideoArray);
    }
}

//async should be used to solve the problem
async function getHistoryData(text, response, historyVideoArray) {
    var page = '';
    text = text+'';
    var parts = text.split("$");
    var end = parts[38];
    page = page + parts[0];

    for (let i = 0; i < historyVideoArray.length; i++) {
//      db = new sql.Database("data.db");
        var preps = await db.prepare("select * from Videos where id=?");
        await new Promise(resolve => setTimeout(resolve, 100));
        preps.get(historyVideoArray[i],  (err, row) => {
            if (err || !row) {
                return fail(response, NotFound, "File not found");
            }
            page =  prepareMain(row, page, parts, response, i, end, historyVideoArray.length - 1, label_list);
        });
    }
}

//end
//************************************

// Main page with videos
function getMain(response) {
//    console.log(preIndex);
    fs.readFile("./videomain.html", ready);
    function ready(err, content) {
        if (err) {
            return fail(response, NotFound, "File not found");
        }
        getMainData(content, response);
    }
}

async function callImplicit(response) {
    var pyshell = new PythonShell('Implicit.py', { mode: 'text' });
    var userID = currentUser;
    var newPref = '';
    pyshell.send(userID.toString());
    pyshell.on('message', function(message) {
        newPref = message.toString('utf8');
        // Print to check the list
        console.log(newPref);

        (async function loop() {
            for (let i = 0; i < 1; i++) {
                var store = await db.prepare("insert or replace into Users (id, name, preference) values (?, ?, ?)");
                await new Promise(resolve => setTimeout(resolve, 100));
                store.run(currentUser, "User"+(currentUser+1), newPref);
                return getMain(response);
            }
        })();

    });
    pyshell.end(function (err,code,signal) {
//        if (err) throw err;
//        console.log('The exit code was: ' + code);
//        console.log('The exit signal was: ' + signal);
//        console.log('finished');
    });
}

function getLabelPage(url, response) {
    fs.readFile("./videomain.html", ready);
    function ready(err, content) {
        if (err) {
            return fail(response, NotFound, "File not found");
        }
        getLabelData(content, url, response);
    }
}

async function getLabelData(text, url, response) {
    var page='';
    text = text+'';
    var parts = text.split("$");
    var end = parts[38];
    page = page + parts[0];
    url = url+'';
    var labelID = url.split("=");
    var labels = [];

    for (var i = 0; i < labelNum; i++) {
        if (i === parseInt(labelID[1])) {
            labels[i] = 1;
        }
        else {
            labels[i] = 0;
        }
    }

    var labelStr = labels.join(";");
    var pyshell = new PythonShell('LabelVideo.py', { mode: 'text' });
    var contentlist = [];

    console.log(labelStr);

    pyshell.send(labelStr.toString());
    pyshell.on('message', function(message){
        var str = message.toString('utf8');
        // Print to check the list
        console.log(str);
        contentlist = str.split(",");
        for (var j = 0; j < contentlist.length; j++) {
            contentlist[j] = contentlist[j].replace("[","").replace("\'","").replace("]","").replace(" ","").
            replace("\'","");
        }

        var video_list = [];

        (async function loop() {
            for (let i = 0; i < contentlist.length; i++) {
 //               db = new sql.Database("data.db");
                var ps = await db.prepare("select * from Videos where id = ?");
                await new Promise(resolve => setTimeout(resolve, 10));
                //               console.log(contentlist[i]);
                ps.get(contentlist[i], (err, row) => {
                    if (!err && row) {
                        video_list.push(row);
                    }
                });
            }
 //           db.close();

            for (let cnt = 0; cnt < resSize; cnt++) {
                await new Promise(resolve => setTimeout(resolve, 10));
                page = prepareMain(video_list[cnt], page, parts, response, cnt, end, resSize-1, label_list);
            }
        })();
    });
    pyshell.end(function (err,code,signal) {
 //       if (err) throw err;
 //       console.log('The exit code was: ' + code);
 //       console.log('The exit signal was: ' + signal);
 //       console.log('finished');
    });
}


// Call videos from the database, calculate similarity to a user preference,
// and insert those videos to the HTML template
async function getMainData(text, response) {
    var pyshell = new PythonShell('Hybrid.py', { mode: 'text' });
    var page='';
    text = text+'';
    var parts = text.split("$");
    var end = parts[38];
    page = page + parts[0];
    //18 containers
    var videoLib = new Array(18);
    for (var i = 0; i < 18 ; i++) {
        videoLib[i] = new Array(0);
    }

    var contentlist = [];
    var userID = currentUser;

    pyshell.send(userID.toString());
    pyshell.on('message', function(message){
        var str = message.toString('utf8');
        // Print to check the list
        console.log(str);
        contentlist = str.split(",");
        for (var j = 0; j < contentlist.length; j++) {
            contentlist[j] = contentlist[j].replace("[","").replace("\'","").replace("]","").replace(" ","").
                replace("\'","");
        }

        var video_list = [];
        (async function loop() {
//            db = new sql.Database("data.db");
            for (let i = 0; i < contentlist.length; i++) {
                var ps = await db.prepare("select * from Videos where id = ?");
                await new Promise(resolve => setTimeout(resolve, 10));
 //               console.log(contentlist[i]);
                ps.get(contentlist[i], (err, row) => {
                    if (!err && row) {
                        video_list.push(row);
                    }
                });
            }
 //           db.close();

            for (let cnt = 0; cnt < resSize; cnt++) {
                await new Promise(resolve => setTimeout(resolve, 10));
                page = prepareMain(video_list[cnt], page, parts, response, cnt, end, resSize-1, label_list);
            }
        })();
    });
    pyshell.end(function (err,code,signal) {
//        if (err) throw err;
//        console.log('The exit code was: ' + code);
//        console.log('The exit signal was: ' + signal);
//        console.log('finished');
    });
}

// Return page with inserting data from the database
function prepareMain(data, page, parts, response, dbpos, end, videoNum, label_list) {
//    console.log(dbpos);
    var pos = (dbpos % 3 == 1) ? 13 : (dbpos % 3 == 2) ? 25 : 1;
    page = page + parts[pos] + data.id + parts[pos+1] + data.id + parts[pos+2] +
        data.id + parts[pos+3] + data.title.replace("& ", "&amp; ") + parts[pos+4] +
        data.owner.replace("& ", "&amp; ") + parts[pos+5] + data.view + parts[pos+6] + data.created + parts[pos+7];

    var str = data.labels;
    for (var i = 0; i < labelNum; i++) {
        if (str.charAt(i) == '1') {
            page = page + parts[pos+8] + i + parts[pos+9] + (i+1).toString() + parts[pos+10] + label_list[i] + parts[pos+11];
        }
    }

    if (dbpos %3 === 2) {
        page = page + parts[37];
    }
    if(dbpos === videoNum) {
        if (dbpos % 3 === 0 || dbpos % 3 === 1) {
            page = page + parts[37];
        }
        page = page + end;
        deliver(response, "application/xhtml+xml", null, page);
    }
    return page;
}

// To make second page showing individual video players + playlists
function getVideo(url, response) {
    fs.readFile("./video.html", ready);
    function ready(err, content) {
        getData(content, url, response);
    }
}

// Display other all videos (needs to be modified later) as the playlist
// Changed playlists according to similarity between videos
function getData(text, url, response) {
    var mainlabel = [];
    url = url+'';
    var parts = url.split("=");
    var id = parts[1];
    text = text+'';
    var textparts= text.split("$");
    var page = textparts[0] + id + textparts[1];
 //   db = new sql.Database("data.db");
    var preps = db.prepare("select * from Videos where id=?");
    preps.get(id, ready);

    function ready(err, row) {
        if (err || !row) {
            return fail(response, NotFound, "File not found");
        }
        page = readyVideo(row, page, textparts);
        mainlabel = row.labels.split("");
    }

    var dbsize = 0;
    var similThres = 0.5;
    var cnt = 0;
    var ps = db.prepare("select * from Videos");
    ps.each(async function ready(err, obj) {
        if (! (String(obj.id).valueOf() == id.valueOf())) {
            var relatedVideo = obj.labels.split("");
            // Similarity
            // mainlabel = user's preference label
            // obj.labels = each video's labels
            await new Promise(resolve => setTimeout(resolve, 100));
            var similarIndex = similarity(mainlabel, relatedVideo);
            if (dataSize-cnt <= dbsize*500) {
                similThres = 0.0;
            }
            if (similarIndex >= similThres) {
                page = prepare(obj, textparts, page, response, dbsize);
                dbsize ++;
            }
            cnt++;
        }
    });
}


function readyVideo(data, page, textparts) {
    page = page + data.title + textparts[2] + data.view + textparts[3] +
        data.owner + textparts[4];
    return page;
}

function prepare(data, textparts, page, response, dbsize) {
    var pos = 5;
    page = page + textparts[pos] + data.id + textparts[pos+1] + data.id +
        textparts[pos+2] + data.id + textparts[pos+3] + data.title + textparts[pos+4] + data.owner +
        textparts[pos+5] + data.view + textparts[pos+6] + data.created + textparts[pos+7];

    if (dbsize == 4) {
        page = page + textparts[13];
//        db.close();
        deliver(response, "application/xhtml+xml", null, page);
    }
    return page;
}

// Check that the site folder and index page exist.
function checkSite() {
    var path = "./public";
    var ok = fs.existsSync(path);
    if (ok) path = "./public/index.html";
    if (ok) ok = fs.existsSync(path);
    if (! ok) console.log("Can't find", path);
    return ok;
}

// Forbid any resources which shouldn't be delivered to the browser.
function isBanned(url) {
    for (var i=0; i<banned.length; i++) {
        var b = banned[i];
        if (url.startsWith(b)) return true;
    }
    return false;
}

// Find the content type to respond with, or undefined.
function findType(url) {
    var dot = url.lastIndexOf(".");
    var extension = url.substring(dot + 1);
    return types[extension];
}

// Deliver the file that has been read in to the browser.
function deliver(response, type, err, content) {
    if (err) return fail(response, NotFound, "File not found");
    var typeHeader = { "Content-Type": type };
    response.writeHead(OK, typeHeader);
    response.write(content);
    response.end();
}

// Give a minimal failure response to the browser
function fail(response, code, text) {
    var textTypeHeader = { "Content-Type": "text/plain" };
    response.writeHead(code, textTypeHeader);
    response.write(text, "utf8");
    response.end();
}

// Check a folder for files/subfolders with non-lowercase names.  Add them to
// the banned list so they don't get delivered, making the site case sensitive,
// so that it can be moved from Windows to Linux, for example. Synchronous I/O
// is used because this function is only called during startup.  This avoids
// expensive file system operations during normal execution.  A file with a
// non-lowercase name added while the server is running will get delivered, but
// it will be detected and banned when the server is next restarted.
function banUpperCase(root, folder) {
    var folderBit = 1 << 14;
    var names = fs.readdirSync(root + folder);
    for (var i=0; i<names.length; i++) {
        var name = names[i];
        var file = folder + "/" + name;
        if (name != name.toLowerCase()) {
            if (verbose) console.log("Banned:", file);
            banned.push(file.toLowerCase());
        }
        var mode = fs.statSync(root + file).mode;
        if ((mode & folderBit) == 0) continue;
        banUpperCase(root, file);
    }
}

// The most common standard file extensions are supported, and html is
// delivered as "application/xhtml+xml".  Some common non-standard file
// extensions are explicitly excluded.  This table is defined using a function
// rather than just a global variable, because otherwise the table would have
// to appear before calling start().  NOTE: add entries as needed or, for a more
// complete list, install the mime module and adapt the list it provides.
function defineTypes() {
    var types = {
        html : "application/xhtml+xml",
        css  : "text/css",
        js   : "application/javascript",
        mjs  : "application/javascript", // for ES6 modules
        png  : "image/png",
        gif  : "image/gif",    // for images copied unchanged
        jpeg : "image/jpeg",   // for images copied unchanged
        jpg  : "image/jpeg",   // for images copied unchanged
        svg  : "image/svg+xml",
        json : "application/json",
        pdf  : "application/pdf",
        txt  : "text/plain",
        ttf  : "application/x-font-ttf",
        woff : "application/font-woff",
        aac  : "audio/aac",
        mp3  : "audio/mpeg",
        mp4  : "video/mp4",
        webm : "video/webm",
        ico  : "image/x-icon", // just for favicon.ico
        xhtml: undefined,      // non-standard, use .html
        htm  : undefined,      // non-standard, use .html
        rar  : undefined,      // non-standard, platform dependent, use .zip
        doc  : undefined,      // non-standard, platform dependent, use .pdf
        docx : undefined,      // non-standard, platform dependent, use .pdf
    }
    return types;
}

//just changed spell! similarity
/*****************************************************/

//Calculate the similarity of two movie
/*
function similarity(preIndex, videoIndex) {
    //console.log(preIndex);
    //console.log(videoIndex);
    var numOfSame = 0;
    var simliarIndex = preIndex & videoIndex;
    while (simliarIndex !== 0) {
        numOfSame++;
        simliarIndex = simliarIndex & (simliarIndex - 1);
    }
    return numOfSame;
}
*/
//rank videos
function rankVideo(preIndex, videoIndex, videoAddress) {
    var videoLib = new Array(18);
    for (var i = 0; i < 18 ; i++) {
        videoLib[i] = new Array();
    }
    for (var i = 0; i < videoIndex.length; i++) {
        var similarIndex = similarity(preIndex, videoIndex);
        videoLib[similarIndex].push(videoAddress[i]);
    }
    return videoLib;
}

//check is number
function isNumber(val){
    return typeof val === 'number' && isFinite(val);
}

//65536 (2^16) is the largest number, if user choose all.
//7 is the smallest number, if user choose 1,2,4
function isValid(val) {
    if (val > 65536 || val < 7) {
        return false;
    }
    else {
        return true;
    }

}
