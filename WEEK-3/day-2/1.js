// step-1
const express = require("express");

// step-2
const app = express()

// step-3 Routes/Api
app.get("/",(req,res) => {
    res.send({ msg: "welcome to exprrss server"})
});

app.get("/home",(req,res) => {
    res.send({ msg: "welcome to home page"})
});

app.get("/about",(req,res) => {
    res.send({ msg: "welcome to about page"})
});

app.listen(8080, () => {
    console.log("Server started")
});
