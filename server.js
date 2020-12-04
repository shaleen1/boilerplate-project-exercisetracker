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
  username: String,
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
    res.json(data);
  }
);

app.get("/api/exercise/users", async function(req, res) {
  var allUsers = await User.find({});
  res.send(allUsers);
});

app.post("/api/exercise/add", async function(req, res, next) {
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
  }
  var data = new UserLog(data1);
  console.log(data);
  data.save(function(err) {
    if (err) {
      console.log("ERROR SAVING EXERCISE");
      res.send(err);
      return;
    }
  });
  console.log("USER EXERCISE SAVED");
  data1['_id'] = match['_id'];
  res.json(data1);
});

app.get("/api/exercise/log", async function(req, res, next) {
  var userId = req.query.userId;

  var match = await User.find({ _id: userId });
  if (match == undefined || match.length == 0) {
    console.log("NO MATCH FOUND");
    res.send("ERROR: NO MATCH FOR ID");
    return;
  } else {
    console.log("MATCH FOUND");
  }
  var username = match[0]['username'];
  var logMatch = await UserLog.find({ username: username });
  var data = {};
  data.id_ = userId;
  data.username = username;
  if (logMatch == undefined || logMatch.length == 0) {
    console.log("USER HAS NO EXERCISES");
    data.count = 0;
    data.log = [];    
    res.json(data);
    return;
  }
  data.count = logMatch.length;
  var log= logMatch.slice();
  for (let i=0; i<log.length; i++){
    let logI = {};
    logI['description']=logMatch[i].description;
    logI['duration']=logMatch[i].duration;
    logI['date']=logMatch[i].date;
    log[i] = logI;
  }
  data.log = log;
  res.json(data);
});

//ISSUE TO RESOLVE: WHEN AN EXERCISE IS CREATED IT OVERRIDES EXISTING EXERCISE LOGS DUE TO THE _ID SO THERE IS ALWAYS 0 OR 1 EXERCISE FOR A USER


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
