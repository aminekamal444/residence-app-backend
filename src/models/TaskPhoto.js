const mongoose = require('mongoose');

const taskPhotoSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },

  photoUrl: {
    type: String,
    required: true
  },

  photoType: {
    type: String,
    enum: ['before', 'after', 'progress'],
    required: true
  },

  caption: {
    type: String,
    default: ''
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Photo metadata
  metadata: {
    fileSize: Number,
    mimeType: String,
    width: Number,
    height: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    location: {
      latitude: Number,
      longitude: Number
    }
  },

  // Photo validation
  validation: {
    blur: {
      type: Boolean,
      default: false
    },

    blurScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    darkness: {
      type: Boolean,
      default: false
    },

    darknessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    similarity: {
      type: Boolean,
      default: false
    },

    similarityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    isValid: {
      type: Boolean,
      default: true
    },

    validationMessage: {
      type: String,
      default: ''
    },

    validatedAt: Date
  },

  // For comparison (if before/after)
  comparisonWithPhoto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskPhoto',
    default: null
  },

  // Admin review
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  approvalReason: {
    type: String,
    default: ''
  },

  approvalDate: Date,

  // TTL - Auto delete after 90 days if task rejected
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 90 * 24 * 60 * 60 * 1000),
    expires: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

taskPhotoSchema.index({ task: 1, photoType: 1 });
taskPhotoSchema.index({ uploadedBy: 1 });
taskPhotoSchema.index({ approvalStatus: 1 });
taskPhotoSchema.index({ 'validation.confidence': 1 });

taskPhotoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TaskPhoto', taskPhotoSchema);