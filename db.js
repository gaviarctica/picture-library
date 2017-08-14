var MongoClient = require('mongodb').MongoClient;
var config = require('./config');
var dbUrl = config.database;

var fs = require('fs');
var dirTree = require('directory-tree');


exports.updateImages = function() {
  console.log(ts() + 'Updating image collection.');
  if(config.removeCorruptedImages){
    console.log(ts() + 'config.removeCorruptedImages is set to true.');
  }  
  const updateStarted = new Date();

  const path = 'public';
  var imageCount = 0;
  var imagesAdded = 0;
  var imagesRemoved = 0;
  var corruptedRemoved = 0;
  var imagesToInsert = [];
  var imagesToRemove = [];
  var imagesToUnlink = [];

  var cameras = [];

  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    // Check for removed images
    db.collection('image').find({}).toArray(function(err, imgsInDb) {
      if (err) throw err;

      console.log(ts() + 'Images in DB: ' + imgsInDb.length);

      var imgsInDir = [];

      // Add new images
      dirTree(path, {extensions: /\.jpg$/}, (item, PATH) => {
        // Replace windows style separators
        item.path = item.path.replace(/\\/g, '/');

        // Get file date and size
        var mtime = fs.statSync(item.path).mtime;
        var size = fs.statSync(item.path).size;

        // Remove base path
        item.path = item.path.replace(path, '');

        // Get camera name
        var camera = item.path.split('/')[2];
        // Add camera to array if new
        if(!inArray(camera, cameras)) {
          cameras.push(camera);
        }

        if(!config.removeCorruptedImages) {
          var newImgInDir = {
            camera: camera,
            name: item.path.split('/')[5],
            path: item.path,
            thumbnailPath: '',
            date: mtime,
            size: size,
            pinned: false
          }

          imgsInDir.push(newImgInDir);

          ++imageCount;

        } else{
          if(config.corruptedImageSizeThreshold === undefined) {
            throw new Error('config.corruptedImageSizeThreshold needs to be defined with removeCorruptedImages');
          }

          if(size < config.corruptedImageSizeThreshold) {
            imagesToUnlink.push(item.path);

          } else {
            var newImgInDir = {
              camera: camera,
              name: item.path.split('/')[5],
              path: item.path,
              thumbnailPath: '',
              date: mtime,
              size: size,
              pinned: false
            }

            imgsInDir.push(newImgInDir);

            ++imageCount;
          }          
        }
      });

      // Unlink (delete) corrupted images
      if(config.removeCorruptedImages) {
        corruptedRemoved = imagesToUnlink.length;

        imagesToUnlink.forEach(function(imgPath) {
          fs.unlink(path + imgPath);
        });
      }

      console.log(ts() + 'Images in Dir: ' + imgsInDir.length);

      // Check for images that need to be added to db
      var imgFound = false;
      var imgsMatch = 0;

      for(var i = 0; i < imgsInDir.length; ++i) {
        imgFound = false;

        for(var j = 0; j < imgsInDb.length; ++j) {
          if(imgsInDir[i].path === imgsInDb[j].path) {
            imgFound = true;
            ++imgsMatch;

            break;
          }
        }

        if(!imgFound){
          imagesToInsert.push(imgsInDir[i]);
        }
      }

      // If all images match, no need to check other way later
      var allImgsMatch = false;
      if(imgsInDir.length === imgsInDb.length === imgsMatch) {
        allImgsMatch = true;
      }

      // If new images, insert, otherwise just continue
      if(imagesToInsert.length > 0) {
        db.collection('image').insertMany(imagesToInsert, function(err, res) {
          if (err) throw err;

          imagesAdded = res.insertedCount;

          updateImages2(db, updateStarted, imgsInDb, imgsInDir, imagesToRemove, imagesRemoved, imageCount, imagesAdded, imagesRemoved, cameras, corruptedRemoved, allImgsMatch);                  
        });
      } else {
        updateImages2(db, updateStarted, imgsInDb, imgsInDir, imagesToRemove, imagesRemoved, imageCount, imagesAdded, imagesRemoved, cameras, corruptedRemoved, allImgsMatch);
      }
    });    
  });
}



function updateImages2(db, updateStarted, imgsInDb, imgsInDir, imagesToRemove, imagesRemoved, imageCount, imagesAdded, imagesRemoved, cameras, corruptedRemoved, allImgsMatch) {
  // Check for images that need to be removed from db
  if(!allImgsMatch){
    var imgFound = false;

    for(var i = 0; i < imgsInDb.length; ++i) {
      imgFound = false;

      for(var j = 0; j < imgsInDir.length; ++j) {
        if(imgsInDb[i].path === imgsInDir[j].path) {
          imgFound = true;

          break;
        }
      }

      if(!imgFound){
        imagesToRemove.push(imgsInDb[i]._id);
      }
    }
  }

  db.collection('image').remove({_id: {$in: imagesToRemove}}, function(err, res) {
    if (err) throw err;

    imagesRemoved = res.result.n;

    var updateFinished = new Date();
    var updateTime = (updateFinished - updateStarted) / 1000; // In seconds

    // Create new update
    var newImgUpdate = {
      timestamp: updateFinished,
      updateTime: updateTime,
      success: true,
      imageCount: imageCount,
      imagesAdded: imagesAdded,
      imagesRemoved: imagesRemoved
    }

    // Insert new update to db
    db.collection('update').insertOne(newImgUpdate, function(err, res) {
      if (err) throw err;

      console.log(ts() + 
        'Image collection update finished in ' + 
        updateTime + 
        ' seconds. Images: ' + 
        imageCount + 
        ', added: ' + 
        imagesAdded + 
        ', removed: ' + 
        imagesRemoved + 
        ', corrupted unlinked: ' +
        corruptedRemoved
      );

      db.close();

      // Update cameras
      updateCameras(cameras);
    });
  });
}



function updateCameras(cameras) {
  var dbCameras = [];

  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('camera').find({}).toArray(function(err, res) {
      if (err) throw err;

      res.forEach(function(cam) {
        dbCameras.push(cam.name);
      });

      var found = false;

      for(var i = 0; i < cameras.length; ++i) {
        for(var j = 0; j < dbCameras.length; ++j) {
          found = false;
          if(cameras[i] === dbCameras[j]) {
            found = true;
            break;
          }
        }
        if(!found) {
          addCamera(cameras[i]);
        }
      }

      db.close();
    });
  });
}



function addCamera(cameraName) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    var newCam = {
      name: cameraName,
      dateCreated: new Date()
    }

    db.collection('camera').insertOne(newCam, function(err, res) {
      if (err) throw err;

      console.log(ts() + 'New camera ' + cameraName + ' inserted.');
      db.close();
    });
  });
}



exports.addImage = function(camera, name, path, thumbnailPath, date, size) {
  if(config.removeCorruptedImages) {
    if(config.corruptedImageSizeThreshold === undefined) {
      throw new Error('config.corruptedImageSizeThreshold needs to be defined with removeCorruptedImages');
    
    } else if(size < config.corruptedImageSizeThreshold) {
      fs.unlink('public' + path);
      console.log(ts() + 'Image ' + path + ' corrupted. File removed.');

      return;
    }
  }

  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    var newImg = {
      camera: camera,
      name: name,
      path: path,
      thumbnailPath: thumbnailPath,
      date: date,
      size: size,
      pinned: false
    }

    db.collection('image').insertOne(newImg, function(err, res) {
      if (err) throw err;

      db.close();

      console.log(ts() + 'Image ' + path + ' added to database.');
    });
  });
}



exports.removeImage = function(path) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('image').remove({path: path}, function(err, res) {
      if (err) throw err;
      db.close();
      console.log(ts() + 'Image ' + path + ' removed from database.');
    });
  });
}



exports.getOneImage = function(query, callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('image').findOne(query, function(err, res) {
      if (err) throw err;
      db.close();
      callback(res);
    });
  });
}



exports.getAllImages = function(callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('image').find().toArray(function(err, res) {
      if (err) throw err;
      db.close();
      callback(res);
    });
  });
}



exports.getImagesFromCamera = function(cameraName, callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('image').find({camera: cameraName}).toArray(function(err, res) {
      if (err) throw err;
      db.close();
      callback(res);
    });
  });
}



exports.getAllCameras = function(callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('camera').find().toArray(function(err, res) {
      if (err) throw err;
      db.close();
      callback(res);
    });
  });
}



exports.createUser = function(username, passHash, callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('user').find({username: username}).toArray(function(err, res) {
      if(res.length === 0) {
        db.collection('user').insertOne({username: username, hash: passHash}, function(err, res) {
          if (err) throw err;
          db.close();
          callback();
        });
      } else {
        db.close();
        callback('Username already exists!');
      }
    });
        
  });
}



exports.getUser = function(username, callback) {
  MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;

    db.collection('user').findOne({username: username}, function(err, res) {
      if (err) throw err;
      db.close();
      callback(res);
    });
  });
}



// Return a timestamp for log messages
function ts() {
  var date = new Date();
  var year = date.getFullYear();
  var month = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1);
  var day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
  var hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
  var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
  var seconds = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();

  return '[' + year + '-' + month + '-' + day + ' ' + hours + '.' + minutes + '.' + seconds + '] ';
}



// Check if object in array
function inArray(object, array) {
  for(var i = 0; i < array.length; ++i) {
    if(array[i] === object) {
      return true;
    }
  }
  return false;
}
