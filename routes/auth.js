var express = require('express');
var router = express.Router();

var passwordHash = require('password-hash');
var sanitize = require('mongo-sanitize');
var jwt = require('jsonwebtoken');

var db = require('../db');
var config = require('../config');



// POST username and password for login
router.post('/login', function(req, res, next) {
  // Look for the given username in db
  db.getUser(sanitize(req.body.username), function(user) {

    // If user not found
    if(!user) {
      res.json({success: false, message: 'Wrong username or password.'});

    } else {
      // If password doesn't match
      if(!passwordHash.verify(req.body.password, user.hash)) {
        res.json({success: false, message: 'Wrong username or password.'});

      } else {
        // Create a token and return a response
        var token = jwt.sign({user: user.username}, config.secret, {expiresIn: '7d'})
        res.json({success: true, message: 'Success!', token: token});
      }
    }
  });
});



module.exports = router;
