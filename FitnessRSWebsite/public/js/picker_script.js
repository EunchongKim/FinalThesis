"use strict"
//this is for the index.html
//It contains two part: picker and
var preIndex = 0;
var clickNum = 1;
var labelNum = 16;
var userNum = 10;

addEventListener('load', pickerstart, sendRefresh, skipcontinue);

function skipcontinue() {
    var continueButton = document.getElementById("sendcont");
    continueButton.onclick = checkCookie(continueButton);
}

function sendRefresh() {
    var re = document.getElementById("sendref");
    re.onclick = isRefresh();
}

function isRefresh() {
    var isGo = confirm("Do you want to refresh your data?");
    if (isGo) {
        window.location.href="/";
        alert("Refresh Completed!");
    }
}

//closure are used to set onclick
function pickerstart() {
    var drawCanvas = new Draw();
    drawCanvas.putSeed();

    for (let i = 1; i <= labelNum; i++) {
        var b = document.getElementById("b" + i.toString());
        b.onclick = mypop(i, b, drawCanvas);
        //b.onclick = test("kk");
    }
    var subButton = document.getElementById("submit");
    subButton.onclick = submitPreIndex(subButton, drawCanvas);
}

function checkDB() {
    var ps = db.prepare("select * from Users");
    var cnt = 1;
    ps.all((err, rows) => {
        if (err || !rows) {
            return fail(response, NotFound, "User not found");
        }
        rows.forEach(function (row) {
            cnt++;
        });
        if (cnt == userNum) {
            return true;
        }
    });
    return false;
}

function test(str) {
    function t(event) {
        alert(str);
    }
    return t;
}

function Draw() {
    var seedNum = 150;
    var wwidth = window.innerWidth;
    var wheight = window.innerHeight;
    var canvas = document.getElementById('canvas');
    canvas.width = 0;
    canvas.height = 0;
    var dotSet = [];
    var dotOrig = [];
    var ctx = canvas.getContext('2d');

    canvas.addEventListener('click', function(e) {
        var mousePos = getMousePos(e);
        let timeCome = 0;
        let interval = setInterval(function () {
            timeCome++;
            if (timeCome === 100) {
                clearInterval(interval);
            }
            else if (timeCome < 25) {
                moveDotsToMousePer(mousePos);
            }
            else if (timeCome >=25) {
                moveDotsToOrig();
            }

        }, 10);
    }, false);

    // move to mouse is limited by the original postion in case all dots assemble together
    function moveDotsToMousePer(mousePos) {
        ctx.clearRect(0,0,wwidth , wheight);
        var mouseX = mousePos.x, mouseY = mousePos.y;
        for (let i = 0; i < seedNum; i++) {
            var currentDot = dotSet[i];
            moveToMouse(currentDot, mouseX, mouseY);
        }
    }

    function moveDotsToOrig() {
        ctx.clearRect(0,0,wwidth , wheight);
        for (let i = 0; i < seedNum; i++) {
            var currentDot = dotSet[i];
            var origDot = dotOrig[i];
            if (currentDot.x !== origDot.x || currentDot.y !== origDot.y) {
                currentDot.x = currentDot.x + (origDot.x - currentDot.x) / 20;
                currentDot.y = currentDot.y + (origDot.y - currentDot.y) / 20;
            }
            drawDot(ctx, currentDot);
        }
    }

    function moveToMouse(dot, mouseX, mouseY) {
        dot.x = dot.x + (mouseX - dot.x) / 30;
        dot.y = dot.y + (mouseY - dot.y) / 30;
        drawDot(ctx, dot);
    }

    this.moveToOnePosAndGoBack = function (pos) {
        var timeCome = 0;
        var interval = setInterval(function () {
            timeCome++;
            if (timeCome === 100) {
                clearInterval(interval);
            }
            else if (timeCome < 25) {
                moveDotsToMousePer(pos);
            }
            else if (timeCome >=25) {
                moveDotsToOrig();
            }}, 10);

    }

    this.moveAllDotsTogether = function (pos) {
        var timeCome = 0;
        setInterval(function () {
            timeCome++;
            if (timeCome === 100) {
                clearInterval(interval);
            }
            moveDotsToMousePer(pos)
        }, 10)
    }

    this.putSeed = function() {
        for (let i = 0; i < seedNum; i++) {
            var x = random(wwidth);
            var y = random(wheight);
            var dot = new Dot(x, y, 5);
            var dot_back = new Dot(x, y, 5);
            dotSet.push(dot);
            dotOrig.push(dot_back);
        }

    }

    function Dot (x, y, r) {
        this.x = x;
        this.y = y;
        this.r = r;
        return this
    }

    function random(limit) {
        return Math.floor((Math.random() * limit) + 1);
    }

    function getMousePos(e) {
        var cRect = canvas.getBoundingClientRect();
        return {
            x :e.clientX - cRect.left,
            y : e.clientY - cRect.top
        };
    }

    function dotDist(dot1, dot2) {
        return Math.sqrt((dot1.x - dot2.x) * (dot1.x - dot2.x) + (dot1.y - dot2.y) * (dot1.y - dot2.y));
    }
}

// Every button has an index, could be only clicked once
// If the button is clicked, then like. If click it again, then cancel.
function mypop(index, button, drawCanvas) {
    var pos = {
        x: button.offsetLeft,
        y: button.offsetTop
    };

    var buttonClickNum = 0;
    function popup(event) {
        //move to pose
        drawCanvas.moveToOnePosAndGoBack(pos);
        if (buttonClickNum % 2 === 1) {
            if (index % 6 == 1) {
                button.style.backgroundColor = '#f2849e';
            }
            if (index % 6 == 2) {
                button.style.backgroundColor = '#7ecaf6';
            }
            if (index % 6 == 3) {
                button.style.backgroundColor = '#7bd0c1';
            }
            if (index % 6 == 4) {
                button.style.backgroundColor = '#c75b9b';
            }
            if (index % 6 == 5) {
                button.style.backgroundColor = '#ae85ca';
            }
            if (index % 6 == 0) {
                button.style.backgroundColor = '#8499e7';
            }
        }
        if (buttonClickNum % 2 === 0) {
            button.style.backgroundColor = '#000000';
        }
        preIndex += (1 << (index - 1)) * (Math.pow(-1, buttonClickNum % 2) );
        clickNum++;
        console.log(Math.pow(-1, buttonClickNum % 2));
        buttonClickNum++;
    }
    return popup
}

// Submit the preIndex to server
function submitPreIndex(button, drawCanvas) {
    var pos = {
        x: button.offsetLeft,
        y: button.offsetTop
    };
    function jump(event) {
        if (preIndex === 0) {
            alert("You should choose at least one");
        }
        else if (clickNum < 3) {
            alert("You should choose at least 2 different preferences!")
        }
        else {
//            var count = 0;
            setCookie(preIndex, 365);
//            setInterval(function () {
//                count++;
//                if (count === 3) {
                    window.location.href="prefer_videos";
//                }
//                drawCanvas.moveAllDotsTogether(pos);
//            },300);
        }
    }
    return jump;
}

//for cookie!
function setCookie(value, duration)
{
    //document.cookie = "expires=" + new Date(new Date().getTime()+86409000).toUTCString();
    document.cookie = "preIndex=" + value + ";expires=" + new Date(new Date().getTime()+86409000).toUTCString();
}

function getPreIndexCookie()
{
    var cookies = document.cookie.split(";");
    if (document.cookie.length>0)
    {
        for (let k = 0; k < cookies.length; k++) {
            if(cookies[k].includes("preIndex")) {
                return cookies[k].split("=")[1];
            }
        }
    }
    return "";
}

//If user want, they do not need to choose again.
function checkCookie(button)
{
    var pos = {
        x: button.offsetLeft,
        y: button.offsetTop
    };
    function jump(event) {
        var userIndex=getPreIndexCookie();
        console.log(userIndex);
        if (userIndex == null || userIndex.length == 0) {
            alert("You don't have a previous choice. Please choose now!");
        }
        else if (userIndex !== null && userIndex.length > 0) {
            userIndex = "previous";
            setCookie(userIndex, 365);
            window.location.href="prefer_videos";
 //           var isGo = confirm("Do you want to use last time's choice?");
 //           if (isGo) {
//                var count = 0;
/*                setInterval(function () {
                    count++;
                    if (count === 3) {
                        //window.location.href="video_pre_index=" + preIndex;
                        window.location.href="prefer_videos";                }
//                    drawCanvas.moveAllDotsTogether(pos);
                },300); */
 //           }
        }
//        else {
//            alert("There is no information about you! Please choose!");
//        }
    }
    return jump;
}

