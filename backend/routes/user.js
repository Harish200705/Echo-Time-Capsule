const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../db/user');
const Query = require('../db/query');
const { verifyToken } = require('../middleware/auth-middleware');

const JWT_SECRET = 'mySecureJwtSecret1234567890';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Images only (jpeg, jpg, png)'));
    }
  }
});

router.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  next();
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, isAdmin, dob, gender, phone, profilePhotoUrl } = req.body;
    console.log('[INFO] Register request:', { name, email, isAdmin, dob, gender, phone, profilePhotoUrl });

    const existingUserByName = await User.findOne({ name });
    if (existingUserByName) {
      console.warn('[WARN] Username already exists:', { name });
      return res.status(409).json({ message: 'Username already exists' });
    }

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      console.warn('[WARN] Email already exists:', { email });
      return res.status(409).json({ message: 'Email already exists' });
    }

    if (!name || !email || !password || !dob || !gender || !phone) {
      console.warn('[WARN] Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('[WARN] Invalid email format:', { email });
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 6) {
      console.warn('[WARN] Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      console.warn('[WARN] Invalid phone number:', { phone });
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('[INFO] Password hashed');

    const user = new User({
      name,
      email,
      password: hashedPassword,
      isAdmin: isAdmin || false,
      dob: new Date(dob),
      gender,
      phone,
      profilePhotoUrl: profilePhotoUrl || '/assets/profile-2.png',
      friends: []
    });

    await user.save();
    console.log('[INFO] User saved:', { id: user._id, name, email });

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('[ERROR] Registration error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[DEBUG] Login attempt for:', email);
    if (!email || !password) {
      console.log('[ERROR] Email or password missing');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      console.log('[ERROR] User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.password) {
      console.log('[ERROR] No password set for user:', email);
      return res.status(500).json({ message: 'User account is corrupted: No password set' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('[ERROR] Password mismatch for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        profilePhotoUrl: user.profilePhotoUrl
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('[DEBUG] Token generated for:', user._id);
    res.json({
      message: 'User logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        profilePhotoUrl: user.profilePhotoUrl
      }
    });
  } catch (error) {
    console.error('[ERROR] Login error:', error.message, error.stack);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    console.log('[DEBUG] Forgot password request:', { email });

    // Validate input
    if (!email || !newPassword) {
      console.warn('[WARN] Missing required fields:', { email, newPassword });
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('[WARN] Invalid email format:', { email });
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password length
    if (newPassword.length < 6) {
      console.warn('[WARN] Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.warn('[WARN] Email not registered:', { email });
      return res.status(404).json({ message: 'Email not registered' });
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      console.warn('[WARN] New password same as old:', { email });
      return res.status(400).json({ message: 'New password cannot be the same as the old password' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('[INFO] New password hashed for user:', { email });

    // Update user's password
    user.password = hashedPassword;
    await user.save();
    console.log('[INFO] Password updated for user:', { id: user._id, email });

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('[ERROR] Forgot password error:', error.message);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    console.log('[DEBUG] Fetching profile for user:', req.user.id);
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[ERROR] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('[DEBUG] Raw user data from DB:', user.toObject());
    res.json({
      id: user._id.toString(),
      name: user.name || '',
      email: user.email || '',
      dob: user.dob || null,
      gender: user.gender || '',
      phone: user.phone || '',
      profilePhotoUrl: user.profilePhotoUrl || '/assets/profile-2.png',
      friends: user.friends ? user.friends.map(id => id.toString()) : []
    });
  } catch (error) {
    console.error('[ERROR] Fetch profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, dob, gender, phone } = req.body;
    console.log('[DEBUG] Updating profile for user:', req.user.id, { name, email, dob, gender, phone });

    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[ERROR] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.dob = dob ? new Date(dob) : user.dob;
    user.gender = gender || user.gender;
    user.phone = phone || user.phone;

    await user.save();
    console.log('[DEBUG] Profile updated:', { id: user._id, email: user.email });

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      dob: user.dob,
      gender: user.gender,
      phone: user.phone,
      profilePhotoUrl: user.profilePhotoUrl,
      friends: user.friends.map(id => id.toString())
    });
  } catch (error) {
    console.error('[ERROR] Update profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/upload-profile-photo', verifyToken, upload.single('profilePhoto'), async (req, res) => {
  try {
    console.log('[DEBUG] Upload profile photo for user:', req.user.id);
    if (!req.file) {
      console.log('[ERROR] No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const profilePhotoUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhotoUrl },
      { new: true }
    );
    if (!user) {
      console.log('[ERROR] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('[DEBUG] Profile photo updated for:', user._id);
    res.json({
      message: 'Profile photo uploaded successfully',
      profilePhotoUrl
    });
  } catch (error) {
    console.error('[ERROR] Upload profile photo error:', error.message);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

router.get('/search', verifyToken, async (req, res) => {
  try {
    const { term } = req.query;
    console.log('[DEBUG] Search users with term:', term);
    if (!term || typeof term !== 'string') {
      console.log('[ERROR] Invalid search term');
      return res.status(400).json({ message: 'Search term is required' });
    }
    const regex = new RegExp(term.trim(), 'i');
    const users = await User.find(
      {
        $or: [{ name: regex }, { email: regex }],
        _id: { $ne: req.user.id }
      },
      { _id: 1, name: 1, email: 1, profilePhotoUrl: 1 }
    ).limit(10);
    console.log('[DEBUG] Search results:', users.length);
    res.json(users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      profilePhotoUrl: user.profilePhotoUrl
    })));
  } catch (error) {
    console.error('[ERROR] Search users error:', error.message);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

router.post('/queries', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    console.log('[DEBUG] Submit query request:', { userId: req.user.id, message });

    if (!message || !message.trim()) {
      console.warn('[WARN] Query message is required');
      return res.status(400).json({ message: 'Query message is required' });
    }

    const query = new Query({
      message: message.trim(),
      userId: req.user.id,
      timestamp: new Date(),
      resolved: false,
      response: '',
    });

    await query.save();
    console.log('[INFO] Query saved:', { id: query._id, message });

    // Optionally update User to store query reference
    await User.findByIdAndUpdate(req.user.id, { $push: { queries: query._id } });

    res.status(201).json({ message: 'Query submitted successfully', query: {
      id: query._id.toString(),
      message: query.message,
      timestamp: query.timestamp,
      userId: query.userId.toString(),
      resolved: query.resolved,
      response: query.response
    } });
  } catch (error) {
    console.error('[ERROR] Submit query error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;