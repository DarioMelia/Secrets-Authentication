require("dotenv").config();   //environmental variables en el archivo .env
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

let regErrorMessage;    //Los mensajes a mostrar cuando hay algun problema en el registro o inicio de sesion
let logErrorMessage;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({
  extended: true
}));
app.use(session({                      //express-session para iniciar una sesión, guardada por cockies
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized:false
}));
app.use(passport.initialize());        //inicializar y configurar passport para trabajar con la sesión previamente creada
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

userSchema.plugin(passportLocalMongoose);     //plugins que se traducen en metodos a usar dentro de los esquemas de mongoose
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);
const Secret = new mongoose.model("Secret", secretSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {     //Nos transforma los datos para que la sesion pueda guardarlos y usarlos
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {    //MIsmo proceso a la inversa, estan en la sesión y los volvemos a traducir a objetos
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

///////////// SOCIAL MEDIA LOGINS SET-UPS //////////////////////////////////


passport.use(new GoogleStrategy({                                    //Para iniciar sesión con google
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken,email, cb) {  //Esta función solo se ejecuta una vez autenticado
    User.findOrCreate({username: sha512(email.emails[0].value)}, function (err, user) {   //Once yo gott more scopes profile has les information, it is in email
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
    errorMessage:regErrorMessage           //Este mensaje es seteado cuando algo va mal en el post
  });
regErrorMessage=undefined;
});


app.get("/login", function(req, res) {
  res.render("login",{
  errorMessage: logErrorMessage
});
logErrorMessage = undefined;
});

app.get("/auth/google",passport.authenticate("google", {scope:["profile", "email"] }));  //google autentica al usuario y en el scope pedimos la información
app.get("/auth/google/secrets",                                                          //Esta es la callback si ha salido bien
passport.authenticate("google", {failureRedirect: "/login"}),                            //Terminamos de autenticar al usiario dentro de la página y redirigimos en consecuencia
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
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0'); //Evitamos que cacheé esta pagina, y si deslogea no puede volver atrás
  if(req.isAuthenticated()){             //comprobamos si el usuario está autentificado
  Secret.find((err,foundSecrets)=>{

    res.render("secrets",{
      secrets: foundSecrets,
      userId: req.user.id
    })
  })
}else {                                //Si no está autentificado volvemos a login
    res.redirect("/login");
  }
});


app.get("/submit", function (req, res){
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');  //para que no cacheé la página
  if(req.isAuthenticated()){
    res.render("submit");
  }else {
    res.redirect("/login");
  }
});

app.get("/logout", (req,res) => {                   //Deslogeamos al usuario y destruimos la session y sus datos
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
User.register(new User({username: req.body.username }), req.body.password, function(err, user){     //Creamos el usuario
  if(err){
    console.error(err);
    regErrorMessage = err.message;   //el menaje rojp bajo el input
    res.redirect("/register");

  }else{                                                                    //Si no ha habido ningún error autenticamos a nivel local y redirigimos a secrets
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
  passport.authenticate('local', function(err, user, info) {                    //Autenticamos al usuario
    if (err) {
      return next(err); // will generate a 500 error
    }
    // Generate a JSON response reflecting authentication status
    if (! user) {
      logErrorMessage = "Incorrect username or password";
      return res.redirect("/login");
    }
    req.login(user, function(err){                                              //logeamos al usurio y si es succes redirigimos a secrets
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
    newSecret.text = secretText;             //Si todo sale bien seteamos y guardamos el secreto
    newSecret.authId = req.user.id;
    newSecret.save((err, result)=>{
      if(err){
        console.log(err);
      }else{                                            //Si todo sale bien añadimos el id del secreto al array de secretos en el documento de la db del usuario.
        foundUser.secretsId.push(result._id);
        foundUser.save((err)=>{
          if(err){
            console.log(err);
          }else{
            res.redirect("/secrets");                  //Solo si despues de todo conseguim,os guardar este cambio vamos a secrets
          }
        })
      }
    })
    });
  })


  app.post("/delete",(req,res)=>{                     //Buscamos el secreto a burrar y dentro conseguimos el id del autor. Borramos el secreto de la collecion de secretos
    let userId;                                       //y buscamos al usuario para borrar el id de su array de secretos
    const secretId = req.body.secretId;

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
            const index = secrets.findIndex(secret => secret === secretId);  //buscamos el secreto con ese Id y lo borramos
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
