// MVC - model view controller
// tells us which analogy to follow in backend - model
// view is frontend - view
// contoller handles API - controller
// mvc mdn - search in chrome and see diagram on first website

// rest api with crud operation

// copied day-1 1.js, db.js and package json file
// npm i - in terminal
// npm run server

// in 1.js, change url from atlas dstabase website connection to file in vs code
//write password in url
// now data saved in atlas mongodb

// to avoid url upload in github for security so we make .env file
// make file .env and paste url there
// .gitignore file, ignore file and folder from git  - .env and node_modules

// to read .env data so we install module - npm i dotenv
// import - require("dotenv").config();

// step-2 code connection building write this 
// const connection = mongoose.connect(process.env.mongourl);

// student file in model folder paste making sturucture code from 1.js there
// const mongoose = reuire("mongooose");
// const studentSchema = new mongoose.schema(
//     {
//         name:String,
//         age:Number,
//     },
//     { versionkey: false,

//     }
// );
//  step 4 making model
//  const studentModel = mongoose.model("student")

// make route folder and filer student.route.js there
// code (replace user with student)

// const express = require("express");
// const { StudentModel }  = require("../model/stuent.model")
// const StudentRouter = express.Router();

// GET Route: for read all user document
// app.get("/read", async (req, res) => {
//   try {
//     const user = await userModel.find();
//     res.send(user);
//   } catch (error) {
//     res.send({ msg: "Something went wrong" });
//   }
// });

// GET Route: for read user document based upon ID
// app.get("/read/:id", async (req, res) => {
//   const id = req.params.id;
//   try {
//     const user = await userModel.findById({ _id: id }); // using id we are finding document
//     res.send(user);
//   } catch (error) {
//     res.send({ msg: "Something went wrong" });
//   }
// });

// Post Route: for creating user
// app.post("/create", (req, res) => {
//     const payload = req.body;
//   try {
//     const newUser = new userModel(payload);
//     await newUser.save();
//     res.send({msg:"New user created Successfully"})
//   } catch (error) {
//     res.send({ msg: "Something went wrong" });
//   }
// });
// module.exports = {StudentRouter};

// similary for trainer