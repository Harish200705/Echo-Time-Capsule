const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other']
  },
  phone: {
    type: String,
    match: /^[0-9]{10}$/
  },
  profilePhotoUrl: { type: String, default: 'profile-2.png' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  queries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Query' }]
}, { timestamps: true }); // Add timestamps to include createdAt and updatedAt

const User = mongoose.model('User', userSchema);
module.exports = User;