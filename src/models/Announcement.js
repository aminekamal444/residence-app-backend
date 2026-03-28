const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  content: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ['general', 'maintenance', 'emergency', 'event', 'voting'],
    default: 'general'
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  targetAudience: {
    type: String,
    enum: ['all', 'residents', 'staff', 'syndic'],
    default: 'all'
  },

  publishedDate: {
    type: Date,
    default: Date.now
  },

  expiryDate: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'expired'],
    default: 'draft'
  },

  attachments: [
    {
      fileName: String,
      fileUrl: String,
      uploadedAt: Date
    }
  ],

  viewedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

announcementSchema.index({ building: 1, publishedDate: -1 });
announcementSchema.index({ building: 1, status: 1 });
announcementSchema.index({ createdBy: 1 });

announcementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);