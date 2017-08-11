var jwt = require('jsonwebtoken');

var config = require('../config');



// Check for json web token and verify
exports.check = function(req, res, callback) {
  // check header, url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  if(token) {
    // Verify token
    jwt.verify(token, config.secret, function(err, decoded) {
      if(err) {
        res.json({success: false, message: 'Failed to authenticate token.'});
        callback(false);
      } else {
        // Token verified
        callback(true);
      }
    });
  } else {
    // If no token given
    res.status(403).send({
      success: false,
      message: 'Token required.'
    });
    callback(false);
  }
}