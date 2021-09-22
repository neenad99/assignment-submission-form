const express = require("express");
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv').config();
const morgan = require('morgan');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const port = process.env.PORT;


const app = express();
//middleware
app.use(express.json());
app.use(express.urlencoded({extended:false})); 
app.use(morgan('dev'));
app.use(methodOverride('_method'));
app.set('view engine','ejs');
//connect mongo db

const conn = mongoose.createConnection(process.env.MONGO_DB_URL);

let gfs;

conn.once('open',()=>{
    // initialize stream
    console.log("mongodb connected")
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
});

//create storage engine

const storage = new GridFsStorage({
    url: process.env.MONGO_DB_URL,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads' // bucket name should match the collection name
          };
          resolve(fileInfo);
        });
      });
    }
  });

  const upload = multer({ storage });


// routes 

app.get('/',(req,res)=>{
    res.render('index');
});

app.post('/upload',upload.single('file'),(req,res)=>{ // name passed in single must match name field in input type file
    res.redirect('/');
});

app.get('/files',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        //check if files 
        if(!files || files.length === 0){
            res.status(404).json({error:'no files exist'});
        }

        //files exist 

         return res.json(files);
    });
});

app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({filename: req.params.filename},(err,file)=>{
        if(!file || file.length === 0){
            res.status(404).json({error:'no files exist'});
        }

        //files exist 

         return res.json(file);
    })
});

app.delete('/files/:id',(req,res)=>{
    gfs.remove({_id : req.params.id,root:'uploads'},(err,gridStore)=>{
        if(err){
            return res.status(404).json({err:err});
        }

        res.redirect('/'); 
    });
})

app.listen(port,()=>{
    console.log(`server running on port ${port}`);
});