const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const userRoutes = require("./routes/user");
const capsuleRoutes = require("./routes/capsule");
const friendsRoutes = require("./routes/friends");
const notificationRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");

const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log('[INFO] Creating uploads directory:', uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
} else {
    console.log('[INFO] Uploads directory exists:', uploadsDir);
}

fs.access(uploadsDir, fs.constants.W_OK, (err) => {
    if (err) {
        console.error('[ERROR] Uploads directory is not writable:', err);
    } else {
        console.log('[INFO] Uploads directory is writable');
    }
});

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.get("/", (req, res) => {
    res.send("Server is running");
});

console.log('[INFO] Mounting routes...');
app.use("/user", userRoutes);
console.log('[INFO] Mounted userRoutes at /user');
app.use("/api", adminRoutes);
app.use('/api/queries', require('./routes/queries'));
console.log('[INFO] Mounted adminRoutes at /api');
app.use("/api/capsules", capsuleRoutes);
console.log('[INFO] Mounted capsuleRoutes at /api/capsules');
app.use("/api/friends", friendsRoutes);
console.log('[INFO] Mounted friendsRoutes at /api/friends');
app.use("/api/notifications", notificationRoutes);
console.log('[INFO] Mounted notificationRoutes at /api/notifications');

app.use((req, res, next) => {
    console.warn('[WARN] Endpoint not found:', req.originalUrl);
    res.status(404).json({ message: 'Endpoint not found' });
});

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017", {
            dbName: "echo",
        });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        process.exit(1);
    }
}

connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});