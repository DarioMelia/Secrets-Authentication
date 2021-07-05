require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// const bcrypt = require("bcryptjs");                  //Salting and Hashing
// const sha512 = require('js-sha512').sha512;         //Hashing, better than MD5
// const encrypt = require("mongoose-encryption");    //Encryption

const app = express();

const saltRounds = 10;
let regErrorMessage;
let logErrorMessage;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({
  extended: true
}));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

///////////// MONGOOOSE /////////////

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

const userSchema = new mongoose.Schema({});

userSchema.plugin(passportLocalMongoose);


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


////////////// REQUESTS ////////////////

app.get("/", function(req, res) {
  res.render("home");
});


app.get("/register", function(req, res) {
  res.render("register",{
    errorMessage:regErrorMessage
  });
regErrorMessage=undefined;
});


app.get("/login", function(req, res) {
  res.render("login",{
  errorMessage: logErrorMessage
});
logErrorMessage = undefined;
});

app.get("/secrets", function(req, res){
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');
  if(req.isAuthenticated()){
    res.render("secrets");
  }else {
    res.redirect("/login");
  }
});

app.get("/logout", (req,res) => {
  req.logout();
  req.session.destroy(err => {
    if(!err){
      res
         .status(200)
         .clearCookie("connect.sid", { path: "/" })
         .redirect("/")
    }else{
      console.error(err);
    }

  });
})



app.post("/register", function(req, res) {

User.register(new User({username: req.body.username}), req.body.password, function(err, user){
  if(err){
    console.error(err);
    regErrorMessage = err.message;
    res.redirect("/register");

  }else{
    passport.authenticate("local")(req, res, function(){
    res.redirect("/secrets");
    })
  }
})
});



// app.post('/login',
//
//   passport.authenticate('local', { failureRedirect: '/login', successRedirect: "/secrets"})
//
// );

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err); // will generate a 500 error
    }
    // Generate a JSON response reflecting authentication status
    if (! user) {
      logErrorMessage = "Incorrect username or password";
      return res.redirect("/login");
    }
    req.login(user, function(err){
      if(err){
        return next(err);
      }
      return res.redirect("/secrets");
    });
  })(req, res, next);
});


app.listen(3000, err => {
  if (!err) {
    console.log("Succesfully started on port 3000")
  } else {
    console.error(err)
  }
})
