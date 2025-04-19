const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const userRoutes = require("./routes/user");
const capsuleRoutes = require("./routes/capsule");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server is running");
});

// Route imports
app.use("/user", userRoutes);
app.use("/api/capsules", capsuleRoutes);

// MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017", {
      dbName: "echo",
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);  // Exit process on error
  }
}

connectDB();

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
