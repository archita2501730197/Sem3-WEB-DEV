const express = require("express");
const { userModel } = require("../model/user.model");

const userRouter = express.Router();

userRouter.post("/register", async (req, res) => {
  // Logic for register

  const { name, email, password } = req.body;

  const newuser = new userModel({ name, email, password });
  await newUser.save();
  res.send({ msg: "New user Created successfully" });
});

userRouter.post("/login", (req, res) => {
  // Logic for login
  res.send({ msg: "Login success" });
});

module.exports = { userRouter };
