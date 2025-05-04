const express = require('express');
const router = express.Router();
const Notification = require('../db/notification');
const { verifyToken } = require('../middleware/auth-middleware');

router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('[DEBUG] GET /api/notifications for user:', req.user.id);
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(
      notifications.map((notification) => ({
        id: notification._id.toString(),
        type: notification.type,
        message: notification.message,
        relatedId: notification.relatedId,
        senderProfilePhotoUrl: notification.senderProfilePhotoUrl,
        createdAt: notification.createdAt instanceof Date 
          ? notification.createdAt.toISOString() 
          : new Date().toISOString(),
      }))
    );
  } catch (error) {
    console.error('[ERROR] Get notifications error:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;