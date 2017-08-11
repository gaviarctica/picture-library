var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var chokidar = require('chokidar');
var fs = require('fs');

// Routes
var images = require('./routes/images');
var cameras = require('./routes/cameras');
var auth = require('./routes/auth');

var db = require('./db');

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Built React app
app.use(express.static(path.join(__dirname, 'client/build')));


// Routes
app.use('/api/images', images);
app.use('/api/cameras', cameras);
app.use('/api/auth', auth);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



// Update database in case of file changes when server was down
db.updateImages();



// Create watcher
var watcher = chokidar.watch('public/images', {
  ignored: /^\./,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

watcher
  .on('add', function(path) {
    var date = fs.statSync(path).mtime;
    var size = fs.statSync(path).size;
    path = formatPath(path);
    var camera = path.split('/')[2];
    var name = path.split('/')[5];
    var thumbnailPath = '';
    // Only add jpg files
    if(path.endsWith('.jpg')) {
      db.addImage(camera, name, path, thumbnailPath, date, size);
    }
  })
  .on('unlink', function(path) {
    path = formatPath(path);
    db.removeImage(path);
  })
  .on('error', function(error) {
    console.error('Error happened', error);
  })


// Format a path to be compatible with web src
function formatPath(path) {
  // Replace windows style separators
  path = path.replace(/\\/g, '/');

  // If path starts with 'public', remove that part
  if(path.startsWith('public')) {
    path = path.replace('public', '');
  }

  return path;
}



module.exports = app;
