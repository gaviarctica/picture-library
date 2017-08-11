var express = require('express');
var router = express.Router();

var fs = require('fs');

var db = require('../db');
var token = require('./token');



// GET a listing of camera names as JSON
router.get('/', function(req, res, next) {
  // Auth required
  token.check(req, res, function(success) {
    if(!success) {return;}

    db.getAllCameras(function(cameras) {
      res.json(cameras);
    });

  });
});



module.exports = router;
