const express = require("express"); // import module
const { connection, userModel } = require("./db");

const app = express();
app.use(express.json()) // building application via express

//API
app.get("/", (req, res) => {
  res.send({ msg: "welcome to my application" });
});

// GET Route: for read all user document
app.get("/read", async (req, res) => {
  try {
    const user = await userModel.find();
    res.send(user);
  } catch (error) {
    res.send({ msg: "Something went wrong" });
  }
});

// GET Route: for read user document based upon ID
app.get("/read/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const user = await userModel.findById({ _id: id }); // using id we are finding document
    res.send(user);
  } catch (error) {
    res.send({ msg: "Something went wrong" });
  }
});

// Post Route: for creating user
app.post("/create", (req, res) => {
    const payload = req.body;
  try {
    const newUser = new userModel(payload);
    await newUser.save();
    res.send({msg:"New user created Successfully"})
  } catch (error) {
    res.send({ msg: "Something went wrong" });
  }
});

app.listen(8080, async () => {
  // run on port
  try {
    await connection; // building connection
    console.log("DB Connected");
  } catch (error) {
    console.log(error);
  }
  console.log("Server Started");
});
