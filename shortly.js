var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

// create session
app.use(session({
  secret:'1234',
  resave: false,
  saveUninitialized: false
}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/', 
function(req, res) {
  // check if logged in
  if( req.session.username ) {
    res.render('index');
  } else {
    res.redirect('/login');
  } 
});

app.get('/create', 
function(req, res) {
  // check if logged in
  if( req.session.username ) {
    res.render('index');
  } else {
    res.redirect('/login');
  } 
});

app.get('/links', 
function(req, res) {
  // check if logged in
  if( req.session.username ) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  } else {
    res.redirect('/login');
  } 
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
// Specify which routes should exist on request to server
/************************************************************/

/* Login GET request*/
/*When the login page is requested, we are going to render/create the login page. This render will be the response to the 
  initial request for the page itself. */
app.get('/login', 
  function(req, res) {
    res.render('login');
});

// login POST request
app.post('/login',
  function(req, res){
  // assign username to req.body.username
  var username = req.body.username;
  // assign password to req.body.password
  var password = req.body.password;
  // create a new User
  new User({username: username, password: password}).fetch().then(function(found){
    // if user is found
    if (found){
      // save username and password to session
      req.session.username = username;
      req.session.password = password;
      // redirect to the root (/)
      res.redirect('/');
    } else{
      // else redirect to login
      res.redirect('/login');
    }
    
  });
});
 
// signup GET request
app.get('/signup', 
function(req, res) {
  res.render('signup');
}); 

// signup POST request
app.post('/signup',
  function(req, res){
  // assign username to req.body.username
  var username = req.body.username;
  // assign password to req.body.password
  var password = req.body.password;
  // create a new User
  new User({username: username, password: password}).fetch().then(function(found){
    // check is user exists
    if (found){
      // save existing username and password to session
      req.session.username = username;
      req.session.password = password;
      // redirect to the index (/)
      res.redirect('/');
    } else {
      // else create user
      var newUser = new User({
        username: username,
        password: password
      });
      // save new username and password to session 
      req.session.username = username;
      req.session.password = password;
      // save user info to db
      newUser.save().then(function(newUser){
        Users.add(newUser);
        // redirect to index
        res.redirect('/');
      });
    }
  });
});


// logout GET request
app.get('/logout', 
function(req, res) {
  // clear users session (break ties with user)
  req.session.username = undefined;
  res.render('login');
}); 

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
