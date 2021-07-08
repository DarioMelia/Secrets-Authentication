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
const sha512 = require('js-sha512').sha512;         //Hashing, better than MD5
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
  discordId: String,
  username:String,
  secretsId:[String]
});

const secretSchema = new mongoose.Schema({
  authId: String,
  text: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);
const Secret = new mongoose.model("Secret", secretSchema);

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
  function(accessToken, refreshToken,email, cb) {  //Once yo gott more scopes profile has les information, it is in email
    User.findOrCreate({username: sha512(email.emails[0].value)}, function (err, user) {
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

    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

let discordScopes = ['identify', 'email'];

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/discord/secrets",
    scope: discordScopes
},
function(accessToken, refreshToken, profile, done) {

  User.findOrCreate({username: sha512(profile.email) }, function (err, user) {
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


app.get('/auth/discord', passport.authenticate('discord', { scope: discordScopes}), function(req, res) {});
app.get('/auth/discord/secrets',
    passport.authenticate('discord', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/secrets') } // auth success
);


app.get("/secrets", function(req, res){
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');
  if(req.isAuthenticated()){
  Secret.find((err,foundSecrets)=>{

    res.render("secrets",{
      secrets: foundSecrets,
      userId: req.user.id
    })
  })
  }else {
    res.redirect("/login");
  }
});


app.get("/submit", function (req, res){
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');
  if(req.isAuthenticated()){
    res.render("submit");
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
req.body.username = sha512(req.body.username);
User.register(new User({username: req.body.username }), req.body.password, function(err, user){
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
  req.body.username = sha512(req.body.username);
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


app.post("/submit", (req, res) => {
  const secretText = req.body.secret;
  let authId;
  const newSecret = new Secret();

  User.findById(req.user.id, (err, foundUser) => {
    if(err){
      console.log(err);
    }
    newSecret.text = secretText;
    newSecret.authId = req.user.id;
    newSecret.save((err, result)=>{
      if(err){
        console.log(err);
      }else{
        foundUser.secretsId.push(result._id);
        foundUser.save((err)=>{
          if(err){
            console.log(err);
          }else{
            res.redirect("/secrets");
          }
        })
      }
    })
    });
  })


  app.post("/delete",(req,res)=>{
    const secretId = req.body.secretId;
    let userId;

    Secret.findById(secretId, (err, foundSecret) =>{
      if(err){console.log(err)}
      else{
        userId = foundSecret.authId;
        
        Secret.deleteOne({_id:secretId}, (err)=>{
          if(err){console.log(err)}
        })

        User.findOne({_id:userId},(err, foundUser)=>{
          if(err){console.log(err)}
          else{
            const secrets = foundUser.secretsId;
            const index = secrets.findIndex(secret => secret === secretId);
            secrets.splice(index, 1);
            foundUser.save(err=>{
              if(err){console.log(err)}
              else{res.redirect("/secrets")}
            })
          }

        })
      }
    });



  })





app.listen(3000, err => {
  if (!err) {
    console.log("Succesfully started on port 3000")
  } else {
    console.error(err)
  }
})
