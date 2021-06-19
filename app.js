require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const sha512 = require('js-sha512').sha512;         //Hashing, better than MD5
// const encrypt = require("mongoose-encryption");  //Encryption

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({
  extended: true
}));

///////////// MONGOOOSE /////////////

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email required"]
  },
  password: {
    type: String,
    required: [true, "Password required"]
  }
});



// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);



////////////// REQUESTS ////////////////

app.get("/", function(req, res) {
  res.render("home");
});


app.get("/register", function(req, res) {
  res.render("register");
});


app.get("/login", function(req, res) {
  res.render("login");
});



app.post("/register", function(req, res) {
  const newUser = new User({
    email: req.body.username,
    password: sha512(req.body.password)
  })

  if (newUser) {
    newUser.save(err => {
      if (!err) {
        console.log("Succesfully added new user");
        res.render("secrets")
      } else {
        console.error(err);
        res.render("validationError",{
          text: "Email AND password is needed"
        });
      }
    });

  }

});





app.post("/login", function(req, res) {
  const logUser = {
    email: req.body.username,
    password: sha512(req.body.password)
  }

  if (logUser.email === "" || logUser.password === "") {

    res.render("validationError",{
      text: "Email AND password is needed"
    })

  } else {

    User.findOne({email: logUser.email}, function(err, foundUser) {
      if (foundUser) {

        if (!err) {

          if (foundUser.password === logUser.password) {

            console.log("Succes, loged in");
            res.render("secrets");

          } else {

            res.render("validationError",{
              text: "Incorrect Password"
            });
          }

        } else {
          console.error(err);
        }

      } else {
        res.render("validationError",{
          text: "No user name matches that name"
        });
      }
    })
  }
});



app.listen(3000, err => {
  if (!err) {
    console.log("Succesfully started on port 3000")
  } else {
    console.error(err)
  }
})
