require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const findOrCreate = require("mongoose-findorcreate");
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

const userSchema = new mongoose.Schema({
  googleId:String,
  facebookId: String,
  discordID: String,
  username:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

///////////// SOCIAL MEDIA LOGINS SET-UPS //////////////////////////////////


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile,email, cb) {

    console.log(email.emails[0].value);
    User.findOrCreate({ googleId: profile.id, username: email.emails[0].value}, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken,profile, cb) {
    // console.log(email);
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

var discordScopes = ['identify', 'email'];
var prompt = "consent";

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/discord/secrets",
    scope: discordScopes,
    prompt: prompt
},
function(accessToken, refreshToken, profile, done) {
  console.log(profile)
    User.findOrCreate({ discordId: profile.id }, function(err, user) {
        return done(err, user);
    });
}));


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

app.get("/auth/google",passport.authenticate("google", {scope:["profile", "email"] }));
app.get("/auth/google/secrets",
passport.authenticate("google", {failureRedirect: "/login"}),
(req,res) => {
  res.redirect("/secrets");
});

app.get("/auth/facebook",passport.authenticate("facebook", {scope:["public_profile"]}));
app.get("/auth/facebook/secrets",
passport.authenticate("facebook", { failureRedirect: "/login" }),
(req, res) => {
  res.redirect("/secrets");
});


app.get('/auth/discord', passport.authenticate('discord',{scopes:discordScopes, prompt:prompt}));
app.get('/auth/discord/secrets', passport.authenticate('discord', {
    failureRedirect: '/'
}), function(req, res) {
    res.redirect('/secrets') // Successful auth
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
