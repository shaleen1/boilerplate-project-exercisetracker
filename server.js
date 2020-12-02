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

app.get('/api/exercise/users',async function(req,res){
  var allUsers = await User.find({});
  res.send(JSON.stringify(allUsers));
})

app.post("/api/exercise/add", function(req, res, next) {});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
