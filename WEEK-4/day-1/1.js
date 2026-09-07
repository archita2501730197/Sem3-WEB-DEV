const express = require("express");
const fs = require("fs");

const app = express();

app.get("/", (req,res)=>{
    res.send("Home Page");
});

app.get("/read", (req,res)=>{
   const data = JSON.parse(fs.readFileSync("./1.json","utf-8"));
res.send(data.student);
});


app.listen(8080,()=>{
    console.log("Server Started")
});

