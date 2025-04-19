const mongoose = require('mongoose');

const capsuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  capsuleName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String, // Path to file on filesystem (nullable for text capsules without a file)
  },
  fileType: {
    type: String,
    enum: ['image', 'video', 'pdf', 'doc', 'mp3', 'text', null],
    required: false,
  },
  fileName: {
    type: String,
    required: false,
  },
  fileSize: {
    type: Number,
    required: false,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  scheduledOpenDate: {
    type: Date, // Nullable for optional scheduling
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
  },
  textContent: {
    type: String,
  },
});

capsuleSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

capsuleSchema.set('toObject', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Capsule = mongoose.model('Capsule', capsuleSchema);
module.exports = Capsule;