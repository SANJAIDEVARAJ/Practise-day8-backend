const { check, validationResult } = require('express-validator/check');
var express = require('express');
var cors = require('cors');
require("dotenv").config();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var User = require('./models/User');
var Post = require('./models/Post');


//mongoDB'
mongoose.connect(process.env.DB);
//express
var app = express();

//middelware
app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true // enable set cookie
}));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(session({
    secret: 'supersecretstring12345!',
    saveUninitialized: false,
    resave: true,
    cookie: { maxAge: (60000 * 30) },
}))


////////////////////USER controller

// Registeration
var register = (req, res) => {
  const user = new User(req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.send({ status: "error", errors: errors.mapped() });
  }
  user.password = user.hashPassword(user.password);
  user
    .save()
    .then(user => {
      return res.send({ status: "success", message: "registerd successfuly" });
    })
    .catch(error => {
      console.log(error);
      return res.send({ status: "error", message: error });
    });
};

app.post(
  "/api/register",
  [
    check("name", "please enter your name")
      .not()
      .isEmpty(),
    check("name", "your name must not contain any numbers").matches(
      /^[a-z''., ]+$/i
    ),
    check("email", "your email is not valid").isEmail(),
    check("email", "email already exist").custom(function(value) {
      return User.findOne({ email: value }).then(user => !user);
    }),
    check(
      "password",
      "your password should be at least 9 characters"
    ).isLength({ min: 9 }),
    check("con_password", "your password confirmation does not match").custom(
      (value, { req }) => value === req.body.password
    )
  ],
  register
);

// Login
var login = (req, res) => {
  console.log(`You are loged and the session is kept as: ${req.body.email} `);
  User.findOne({
    email: req.body.email
  })
    .then(function(user) {
      if (!user) {
        return res.send({ error: true, message: "User does not exist!" });
      }
      if (!user.comparePassword(req.body.password, user.password)) {
        return res.send({ error: true, message: "Wrong password!" });
      }
      req.session.user = user;
      req.session.isLoggedIn = true;
      return res.send({ message: "You are signed in" });
      res.send(user);
    })
    .catch(function(error) {
      console.log(error);
    });
};

app.post(
  "/api/login", 
  [ 
  check("email", "please enter your email")
    .not()
    .isEmpty(),
   
  check("password", "please enter your password")
    .not()
    .isEmpty()
   
  ],  
login);


//logout
var logout = (req, res) => {
  req.session.destroy();
  res.json({ logout: true });
};
app.get("/api/logout", logout);

//current user / session for the user
var current = (req, res) => {
  if (req.session.user)
    User.findById(req.session.user._id)
      .then(user => {
        return user
          ? res.json(user)
          : res.status(422).json({ msg: "The authentication failed." });
      })
      .catch(err => console.log(err));
  else res.status(422).json({ msg: "The authentication failed" });
};
app.get("/api/currentuser", current);


////////////////////post new article////////////////////////////
//post a article
var postLising = (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
      return res.send({ status: 'error', errors: errors.mapped() })
  }
  var post = new Post(req.body);
  console.log(post);
  post.user = req.session.user._id;
  console.log(post);    
  post.save()
  .then(post => {return res.send({ status: 'success', message: 'List created successfuly' }) })
      .catch(error => {
          console.log(error);
          return res.send({ status: 'error', message: error })
      })
}


app.post(
  "/api/postlist",
  [
    check("title", "please enter your post")
      .not()
      .isEmpty(),
  ],
  postLising
);

//show Allposts in home page
app.get('/api/Allposts', function (req, res, next) {
    Post.find().populate('user')
      .sort({ vote: "desc" })
      .then(articles => {
        res.json(articles);
      })
      .catch(err => res.json(err));
  });



app.put('/api/post/vote/:id', function(req, res){
  Post.findByIdAndUpdate(req.params.id, {$inc: {vote:1}})      
      .then(result => {res.status(200).json({status:'success', message:'your vote was added'})})
      .catch(error => res.status(422).json({status:'error', message: error}))
})





app.listen(process.env.PORT || 8000, function() {
  console.log('Express server is up and running!');
});