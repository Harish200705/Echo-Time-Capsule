const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  response: {
    type: String,
    default: ''
  }
});

const Query = mongoose.model('Query', querySchema);
module.exports = Query;