const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isAdmin: Boolean,
    dob: Date,
    gender: String,
    phone: String,
});

const User = mongoose.model('User', userSchema);
module.exports = User; 
