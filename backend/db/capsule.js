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
    type: String,
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
    type: Date,
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
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  collaborationRequests: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }]
}, { timestamps: true });

capsuleSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;

    if (ret.userId) {
      ret.userId = ret.userId.toString();
    }
    if (ret.collaborators) {
      ret.collaborators = ret.collaborators.map(id => id.toString());
    }
    if (ret.collaborationRequests) {
      ret.collaborationRequests = ret.collaborationRequests.map(req => ({
        ...req,
        userId: req.userId.toString()
      }));
    }
    return ret;
  },
});

capsuleSchema.set('toObject', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;

    if (ret.userId) {
      ret.userId = ret.userId.toString();
    }
    if (ret.collaborators) {
      ret.collaborators = ret.collaborators.map(id => id.toString());
    }
    if (ret.collaborationRequests) {
      ret.collaborationRequests = ret.collaborationRequests.map(req => ({
        ...req,
        userId: req.userId.toString()
      }));
    }
    return ret;
  },
});

const Capsule = mongoose.model('Capsule', capsuleSchema);
module.exports = Capsule;