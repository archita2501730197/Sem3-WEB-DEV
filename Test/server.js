
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(express.json());

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully!");

    app.listen(process.env.PORT, () => {
      console.log(
        `Server running at http://localhost:${process.env.PORT}`
      );
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

// Test route
app.get("/", (req, res) => {
  res.send("Server is running and ready!");
});

startServer();
