const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;
const userRoutes = require("./routes/user");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.use("/user", userRoutes);

// MongoDB connection
async function connectDB() {
  await mongoose.connect("mongodb://localhost:27017", {
    dbName : "echo",
  })
  console.log("Connected to MongoDB");
}

connectDB().catch((err)=> {
  console.error(err);
})
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
