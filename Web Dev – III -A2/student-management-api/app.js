const express = require("express");

const logger = require("./middleware/logger");

const studentRoutes = require("./routes/studentRoutes");

const app = express();


// Middleware
app.use(express.json());

app.use(logger);


// Routes
app.use("/students", studentRoutes);


// Home route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Student Management API is running"
    });
});


// Error handling middleware
app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({
        message: "Something went wrong"
    });
});


// Start server


app.listen(3000, () => {
    console.log(`Server running `);
});