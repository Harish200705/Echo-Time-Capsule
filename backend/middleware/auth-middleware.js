const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = 'mySecureJwtSecret1234567890';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('[DEBUG] Authorization header:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[ERROR] No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[DEBUG] Token decoded:', {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      isAdmin: decoded.isAdmin
    });
    if (!mongoose.isValidObjectId(decoded.id)) {
      console.log('[ERROR] Invalid user ID in token:', decoded.id);
      return res.status(401).json({ message: 'Invalid user ID in token' });
    }
    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      isAdmin: decoded.isAdmin,
      profilePhotoUrl: decoded.profilePhotoUrl
    };
    next();
  } catch (error) {
    console.error('[ERROR] Invalid token:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    console.log('[DEBUG] Admin access granted for user:', req.user.id);
    next();
  } else {
    console.log('[ERROR] Admin access denied for user:', req.user?.id || 'N/A');
    return res.status(403).json({ error: 'Forbidden' });
  }
}

module.exports = { verifyToken, isAdmin };