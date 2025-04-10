require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());

const SECRET = 'CourseScre3t';

const dbURL = process.env.MONGODB_URI|| 'mongodb://localhost:27017';

mongoose.connect(dbURL, {
     useNewUrlParser: true, 
     useUnifiedTopology: true, 
     dbName: "course-selling-backend" 
  }).then(() => {
    console.log('Connected to MongoDB successfully!');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});


const authenticateJwt = (req,res,next) =>{
    const authHeader = req.headers.authorization;
    if(authHeader){
         const token = authHeader.split(' ')[1];
         jwt.verify(token,SECRET,(err,user)=>{
            if(err){
                res.status(403).json({message:"Forbidden"})
            }else{
                req.user = user;
                next();
            }
         })
    }else{
        res.status(401).json("unauthorized")
    }
}


const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
})

const AdminSchema = new mongoose.Schema({
    username: String,
    password: String
})

const CourseSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    imageLink: String,
    published: Boolean,
})


//Mongoose Model
const User = mongoose.model('User', UserSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const Course = mongoose.model('Course', CourseSchema);


app.post('/admin/signup', async (req, res) => {
    const { username, password } = req.body;
    const adminExist = await Admin.findOne({ username });
    console.log(adminExist)
    if (adminExist) {
        res.status(403).json({ message: "Admin already exists" })
    } else {
        const newAdmin = new Admin({ username: username, password: password });
        await newAdmin.save();
        const token = jwt.sign({ username, role: 'admin' }, SECRET, { expiresIn: '1h' })
        res.status(201).json({ message: "Admin created successfully", token: token })
    }
})

app.post("/admin/login",async(req,res) =>{
    const {username,password} = req.body;

   const adminExist = await Admin.findOne({username,password});
   if(!adminExist){
    res.status(400).json({message:"Admin does not exists"})
   }else{
      const token = jwt.sign({username,role:"admin"},SECRET,{expiresIn:"1h"})
      res.status(200).json({message:"logged in successfully",token})
   }
})

app.post("/admin/courses",authenticateJwt,async(req,res)=>{
  const course = new Course(req.body);
  await course.save();

  res.status(201).json({message:"Course created successully",id:course.id})

})

app.get("/admin/courses",authenticateJwt,async(req,res)=>{
    const courses = await Course.find({})
    res.status(200).json({courses})
})

app.put("/admin/courses/:courseId",authenticateJwt,async(req,res) =>{
      const course = await Course.findByIdAndUpdate(req.params.courseId,req.body,{new:true})
      if(course){
        res.status(202).json({message:"Course updated successfully"})
      }else{
        res.status(404).json({message:"Course not found"})
      }
})


app.post("/users/signup",async(req,res) =>{
    const {username,password} = req.body;
    const userExist = await User.findOne({username});
    if(userExist){
        res.status(403).json({message:"User already exists"})
    }else{
        const newUser = new User({username,password});
        await newUser.save();
        const token = jwt.sign({username,role:"user"},SECRET,{expiresIn:"1h"})
        res.status(201).json({message:"User Created Successfully",token})
    }
})

app.post("/users/login",async(req,res) =>{
    const {username,password} = req.body;
    const userExist = await User.findOne({username,password});
    if(!userExist){
        res.status(400).json({message:"User doesn't exist"})
    }

    const token = jwt.sign({username,role:"user"},SECRET,{expiresIn:"1h"})
    res.status(200).json({message:"User Logged in successfully",token})
})

app.get("/users/courses",authenticateJwt,async(req,res)=>{
    const courses = await Course.find({published:true})
    res.status(200).json({courses})
})

app.post('/users/courses/:courseId', authenticateJwt, async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    console.log(course);
    if (course) {
      const user = await User.findOne({ username: req.user.username });
      if (user) {
        user.purchasedCourses.push(course);
        await user.save();
        res.json({ message: 'Course purchased successfully' });
      } else {
        res.status(403).json({ message: 'User not found' });
      }
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  });

app.get('/users/purchasedCourses', authenticateJwt, async (req, res) => {
    const user = await User.findOne({ username: req.user.username }).populate('purchasedCourses');
    if (user) {
      res.json({ purchasedCourses: user.purchasedCourses || [] });
    } else {
      res.status(403).json({ message: 'User not found' });
    }
  });


app.listen(3000, () => { console.log("server is running on 3000 port") })