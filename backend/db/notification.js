const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: String, required: true },
  senderProfilePhotoUrl: { type: String },
  createdAt: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('Notification', notificationSchema);