require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// const sha512 = require('js-sha512').sha512;         //Hashing, better than MD5
// const encrypt = require("mongoose-encryption");     //Encryption

const app = express();

const saltRounds = 10;

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

if(req.body.password != ""){

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

    if (!err) {
      const newUser = new User({
        email: req.body.username,
        password: hash
      })

      if(newUser){

      User.findOne({email: newUser.email}, function(err, foundUser){

        if(!err){

          if(foundUser){
           console.log("Already a user with that email");

           res.render("validationError",{
             text: "Already an existing account with that email"
           })

          } else {

            newUser.save(err => {

              if (!err) {

                console.log("Succesfully added new user");
                res.render("secrets")

              } else {

                console.error(err);

                res.render("validationError", {
                  text: "Email AND password is needed"
                });
              }

            });
          }
        }
      })
    }



    } else {
      console.error(err);   //Hashing error
    }

  })
} else {
  res.render("validationError", {              //If password of ""
    text: "Email AND password is needed"
  });
}


});





app.post("/login", function(req, res) {

  const logUser = {
    email: req.body.username,
    password: req.body.password
  }

  if (logUser.email === "" || logUser.password === "") {

    res.render("validationError", {
      text: "Email AND password is needed"
    })

  } else {

    User.findOne({email: logUser.email}, function(err, foundUser) {
      if (foundUser) {

        if (!err) {

          bcrypt.compare(logUser.password, foundUser.password, function(err, result){
            if (result) {
              console.log("Succes, loged in");
              res.render("secrets");

            } else {

              res.render("validationError", {
                text: "Incorrect Password"
              });
            }
          })

        } else {
          console.error(err);   //FindOne error
        }


      } else {
        res.render("validationError", {
          text: "No user name matches that name"       //If no foundUser
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
