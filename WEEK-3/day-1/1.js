// step-0 npm init -y , npm i express nodemon and 
// in package json write in script "server/chintu/pintu": "nodemon 1.js" and
// in integrated terminal npm run server/chintu/pintu 

// step-1 import expressjs
const express = require("express");

// step-2 create application through epressjs
const app = express();

// step 4 create API/Routing
app.get("/", (req,res) => {
    res.send("home page");
});

app.get("/about", (req,res) => {
    res.send("about page");
});

// step 3 listen/run application on port address
app.listen(8080, () => {
    console.log("server started");
});