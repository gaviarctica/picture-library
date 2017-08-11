// Create a new user for the app

var passwordHash = require('password-hash');
var prompt = require('prompt');

var db = require('./db');


var schema = {
  properties: {
    name: {
      required: true
    },
    password: {
      required: true,
      hidden: true
    }
  }
}

prompt.start();

prompt.get(schema, function(err, result) {
  // Hash the password
  var passHash = passwordHash.generate(result.password);

  db.createUser(result.name, passHash, function(err) {
    if (err) throw err;
    console.log('New user created.');
  });
});
