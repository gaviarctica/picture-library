var express = require('express');
var router = express.Router();

var fs = require('fs');
var dirTree = require('directory-tree');

var db = require('../db');
var token = require('./token');



// GET image paths and dates as JSON
// Params:
//    camera: camera, empty for all cameras
router.get('/', function(req, res, next) {
  // Auth required
  token.check(req, res, function(success) {
    if(!success) {return;}

    if(req.query.camera) {
      db.getImagesFromCamera(req.query.camera, function(images) {
        // Sort ascending by date
        images.sort(function(a, b) {
          return a.date - b.date;
        });
        res.json(images);
      });

    } else {
      db.getAllImages(function(images) {
        // Sort ascending by date
        images.sort(function(a, b) {
          return a.date - b.date;
        });
        res.json(images);
      });
    }

  });
});



// GET newest images' paths and dates as JSON
// Params:
//    n: the amount of pictures
//    camera: camera, empty for all cameras
//    before: get images before this id (for loading more)
router.get('/new', function(req, res, next) {
  // Auth required
  token.check(req, res, function(success) {
    if(!success) {return;}

    var amount = req.query.n;

    if(req.query.camera) {
      db.getImagesFromCamera(req.query.camera, function(images) {
        // Sort descending by date
        images.sort(function(a, b) {
          return b.date - a.date;
        });
        if(!req.query.before) {
          res.json(images.slice(0, amount));
        } else {
          var start = indexByAttr(images, '_id', req.query.before, true);
          res.json(images.slice(start + 1, start + parseInt(amount) + 1));
        }
      });
      
    } else {
      db.getAllImages(function(images) {
        // Sort descending by date
        images.sort(function(a, b) {
          return b.date - a.date;
        });
        if(!req.query.before) {
          res.json(images.slice(0, amount));
        } else {
          var start = indexByAttr(images, '_id', req.query.before, true);
          res.json(images.slice(start + 1, start + parseInt(amount) + 1));
        }
      });
    }

  });
});



// GET image paths and dates organized by date as JSON
// Params:
//    order: 'descending' for descending order
router.get('/organized', function(req, res, next) {
  // Auth required
  token.check(req, res, function(success) {
    if(!success) {return;}

    if(req.query.camera) {
      db.getImagesFromCamera(req.query.camera, function(images) {
        // Sort ascending by date
        images.sort(function(a, b) {
          return a.date - b.date;
        });

        if(req.query.order === 'descending') {
          images = images.reverse();
        }

        images = sortByDate(images);

        res.json(images);
      });
      
    } else {
      db.getAllImages(function(images) {
        // Sort ascending by date
        images.sort(function(a, b) {
          return a.date - b.date;
        });

        if(req.query.order === 'descending') {
          images = images.reverse();
        }

        images = sortByDate(images);

        res.json(images);
      });
    }

  });
});



// Organize images by date
function sortByDate(images) {
  var sortedImages = [];
  var time;
  var year;
  var month;
  var day;
  var indexOfYear;
  var indexOfMonth;
  var indexOfDay;

  images.forEach(function(pic) {
    time = new Date(pic.date);
    year = time.getFullYear();
    month = time.getMonth();
    day = time.getDate();
    indexOfYear = -1;
    indexOfMonth = -1;
    indexOfDay = -1;

    // If no object with this year exists, create one
    if(indexByAttr(sortedImages, 'year', year) === -1) {
      sortedImages.push({
        'year': year,
        'months': []
      });
      indexOfYear = sortedImages.length - 1;
    }

    // If no object with this month exists in this year, create one
    if(indexOfYear === -1) { // If -1, must find it first
      indexOfYear = indexByAttr(sortedImages, 'year', year);
    }
    if(indexByAttr(sortedImages[indexOfYear].months, 'month', month) === -1) {
      sortedImages[indexOfYear].months.push({
        'month': month,
        'days': []
      });
      indexOfMonth = sortedImages[indexOfYear].months.length - 1;
    }

    // If no object with this day exists in this month, year, create one
    if(indexOfMonth === -1) { // If -1, must find it first
      indexOfMonth = indexByAttr(sortedImages[indexOfYear].months, 'month', month);
    }
    if(indexByAttr(sortedImages[indexOfYear].months[indexOfMonth].days, 'day', day) === -1) {
      sortedImages[indexOfYear].months[indexOfMonth].days.push({
        'day': day,
        'pics': []
      });
      indexOfDay = sortedImages[indexOfYear].months[indexOfMonth].days.length - 1;
    }

    // Push the picture
    if(indexOfYear === -1) {
      indexOfYear = indexByAttr(sortedImages, 'year', year);
    }
    if(indexOfMonth === -1) {
      indexOfMonth = indexByAttr(sortedImages[indexOfYear].months, 'month', month);
    }
    if(indexOfDay === -1) {
      indexOfDay = indexByAttr(sortedImages[indexOfYear].months[indexOfMonth].days, 'day', day);
    }
    sortedImages[indexOfYear].months[indexOfMonth].days[indexOfDay].pics.push(pic);
  });

  return sortedImages;
}



function indexByAttr(arr, attr, value, compareStrings) {
  if(compareStrings) {
    value = value.toString();
  }
  for(var i = 0; i < arr.length; i++) {
    if(compareStrings && arr[i][attr].toString() === value) {
      return i;
    }
    if(arr[i][attr] === value) {
      return i;
    }
  }
  return -1;
}



module.exports = router;
