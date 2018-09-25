"use strict";

var sql = require("sqlite3");
var db = new sql.Database("data_logistic.db");
db.all("select * from Videos", show);

function show(err, rows) {
    if (err) throw err;
    console.log(rows);
}