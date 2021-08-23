const express = require('express')
const crypto = require('crypto');
const path = require('path');
// var bodyParser = require('body-parser');
const app = express()
const multer = require('multer')
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream')
// const methodOverride = require('method-override')
const mongoose = require('mongoose')


//Mongo Uri
let mongoUri = 'mongodb://localhost:27017/mydb'

// mongodb://localhost/mydb
//Create Mongo connection 
const conn = mongoose.createConnection(mongoUri)


//Middleware
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//Init gfs
let gfs;

conn.once('open',()=>{
    //Init stream 
    console.log("here ")
    gfs = Grid(conn.db, mongoose.mongo)
    gfs.collection('uploads');

})

//Create storage engine
const storage = new GridFsStorage({
    url: mongoUri,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });

app.post('/upload', upload.single('inputFile'),  function (req, res) {    
    res.json({ file: req.file })
})


app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});



app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'video/mp4') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});


app.listen(5000, function () {
    console.log('App is running on port 5000')
})