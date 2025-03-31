const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("./../db/user");
const { loginUser } = require("../handlers/user-handler");
const { model } = require("mongoose");

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, isAdmin, dob, gender, phone } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create and save user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            isAdmin,
            dob,
            gender,
            phone,
        });

        await user.save();

        return res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const result = await loginUser(email, password); // Pass email and password separately

        if (result.error) {
            return res.status(401).json({ message: result.error });
        }

        return res.status(200).json({
            message: "User logged in successfully",
            token: result.token,
            user: result.user
        });
    } catch (error) {
        console.error("Error logging in user:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/forgot-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        // Check if email and new password are provided
        if (!email || !newPassword) {
            return res.status(400).json({ message: "Email and new password are required" });
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });

    } catch (error) {
        console.error("Error in forgot password:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


module.exports = router;
