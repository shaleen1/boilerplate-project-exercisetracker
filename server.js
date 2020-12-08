const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
console.log(mongoose.connection.readyState);

if (typeof String.prototype.trim === "undefined") {
  String.prototype.trim = function() {
    return String(this).replace(/^\s+|\s+$/g, "");
  };
}

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(bodyParser.urlencoded({ extended: false }));

var userSchema = new mongoose.Schema({
  username: String
});
var User = mongoose.model("User", userSchema);

var userLogSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
});
var UserLog = mongoose.model("UserLog", userLogSchema);

app.post(
  "/api/exercise/new-user",
  async function(req, res, next) {
    console.log("POST NEW USER", "\n--------------------");
    var username = req.body.username;
    console.log("FUNCTION ONE. USERNAME: ", username);
    var matches = await User.find({ username: username });
    if (matches.length > 0) {
      console.log("MATCHES FOUND FOR USERNAME");
      res.json(matches[0]);
      return;
    } else {
      console.log("NO MATCHES FOUND FOR USERNAME. PROCEED");
      next();
    }
  },
  function(req, res) {
    var username = req.body.username;
    var data = new User({ username: username });
    data.save(function(err) {
      if (err) {
        console.log("ERROR SAVING USER");
        res.send("ERROR");
        return;
      }
    });
    console.log("USER SAVED");
    console.log("DATA INIT: ", data);
    res.json(data);
  }
);

app.get("/api/exercise/users", async function(req, res) {
  console.log("GET ALL USERS", "\n--------------------");
  var allUsers = await User.find({});
  res.send(allUsers);
});

app.post("/api/exercise/add", async function(req, res, next) {
  console.log("POST NEW EXERCISE", "\n--------------------");
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = req.body.duration;

  var date = req.body.date;
  if (date == undefined) {
    date = new Date().toString();
  } else if (date.trim() == "") {
    date = new Date().toString();
  } else {
    date = new Date(req.body.date).toString();
  }
  date = date
    .split(" ")
    .slice(0, 4)
    .join(" ");

  var matchForId = await User.find({ _id: userId });
  if (matchForId == undefined || matchForId.length == 0) {
    console.log("NO MATCH FOR ID");
    res.send("ERROR: NO MATCH FOR ID");
    return;
  }
  var match = matchForId[0];

  var data1 = {
    username: match["username"],
    description: description,
    duration: duration,
    date: date
  };
  var data = new UserLog(data1);
  console.log("DATA (IGNORE ID): ", data);
  data.save(function(err) {
    if (err) {
      console.log("ERROR SAVING EXERCISE");
      res.send(err);
      return;
    }
  });
  console.log("USER EXERCISE SAVED");
  console.log("DATA1: ", data1);
  let sendObj = { ...data1 };
  console.log("SEND OBJ: ", sendObj);
  sendObj._id = userId;
  if (match['_v'] != undefined){
    sendObj._v = match['_v'];
  }
  console.log("SEND OBJ FINAL: ", sendObj);
  res.json(sendObj);
});

app.get("/api/exercise/log", async function(req, res, next) {
  console.log("GET USER EXERCISE LOG", "\n--------------------");
  var userId = req.query.userId;

  var match = await User.find({ _id: userId });
  if (match == undefined || match.length == 0) {
    console.log("NO MATCH FOUND");
    res.send("ERROR: NO MATCH FOR ID");
    return;
  } else {
    console.log("MATCH FOUND");
  }
  var username = match[0]["username"];
  var logMatch = await UserLog.find({ username: username });
  var data = {};
  data._id = userId;
  data.username = username;
  if (logMatch == undefined || logMatch.length == 0) {
    console.log("USER HAS NO EXERCISES");
    data.count = 0;
    data.log = [];
    res.json(data);
    return;
  }

  // ADD LIMIT FUNCTIONALITY
  var limit = req.query.limit;
  if (limit == undefined || limit > logMatch.length || limit < 0) {
    console.log("NO VALID LIMIT PROVIDED");
    limit = logMatch.length;
  }
  if (req.query.from == undefined && req.query.to == undefined) {
    console.log("NOT GIVEN FROM OR TO");
    var log = [];
    var count = 0;

    for (let i = 0; i < logMatch.length; i++) {
      if (count >= limit) {
        break;
      }
      let logI = {};
    
      logI["description"] = logMatch[i].description;
      logI["duration"] = logMatch[i].duration;
      logI["date"] = logMatch[i].date;
      log[i] = logI;
      count++;
    }
    data.count = count;
    data.log = log;
    res.json(data);
    return;
  } else if (req.query.from == undefined) {
    console.log("GIVEN TO BUT NOT FROM");
    var log = [];
    var count = 0;
    var to = new Date(req.query.to); //latest possible date
    for (let i = 0; i < logMatch.length; i++) {
      if (count >= limit) {
        break;
      }
      let logI = {};
      let thisDate = new Date(logMatch[i].date); 
      if (thisDate > to) {
        continue;
      }
      logI["description"] = logMatch[i].description;
      logI["duration"] = logMatch[i].duration;
      logI["date"] = logMatch[i].date;
      log[i] = logI;
      count++;
    }
    data.count = count;
    data.log = log;
    res.json(data);
  } else if (req.query.to == undefined) {
    console.log("GIVEN FROM BUT NOT TO");
    var log = [];
    var count = 0;
    var from = new Date(req.query.from); //earliest possible date
    for (let i = 0; i < logMatch.length; i++) {
      if (count >= limit) {
        break;
      }
      let logI = {};
      let thisDate = new Date(logMatch[i].date); 
      if (thisDate < from) {
        continue;
      }
      logI["description"] = logMatch[i].description;
      logI["duration"] = logMatch[i].duration;
      logI["date"] = logMatch[i].date;
      log[i] = logI;
      count++;
    }
    data.count = count;
    data.log = log;
    res.json(data);
  } else {
    console.log("GIVEN BOTH FROM AND TO");
    var log = [];
    var count = 0;
    var from = new Date(req.query.from);
    var to = new Date(req.query.to);
    for (let i = 0; i < logMatch.length; i++) {
      if (count >= limit) {
        break;
      }
      let logI = {};
      let thisDate = new Date(logMatch[i].date); 
      if (thisDate < from || thisDate > to) {
        continue;
      }
      logI["description"] = logMatch[i].description;
      logI["duration"] = logMatch[i].duration;
      logI["date"] = logMatch[i].date;
      log[i] = logI;
      count++;
    }
    data.count = count;
    data.log = log;
    res.json(data);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
