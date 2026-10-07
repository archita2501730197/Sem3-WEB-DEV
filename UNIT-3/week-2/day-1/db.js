const mongoose = require("mongoose"); // module import
const connection = mongoose.connect("mongodb+srv://Cluster11945:Cluster11945@cluster11945.v985kf2.mongodb.net/?appName=Cluster11945") // building connection

const userSchema = new mongoose.Schema({ // making structure
    name: String,
    age: Number,
});

const userModel = mongoose.model("user",userSchema); // making model

//combining server and database (export)
module.exports ={connection, userModel};