const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    default: null,
    index: true
  },

  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true
  },

  category: {
    type: String,
    enum: ['noise', 'maintenance', 'cleanliness', 'safety', 'parking', 'other'],
    required: true,
    index: true
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  status: {
    type: String,
    enum: ['open', 'pending', 'in_progress', 'resolved', 'closed', 'rejected'],
    default: 'open',
    index: true
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  location: {
    type: String,
    default: ''
  },

  attachments: [
    {
      fileUrl: String,
      fileName: String,
      uploadedAt: Date
    }
  ],

  residentComment: {
    type: String,
    default: ''
  },

  syndicComment: {
    type: String,
    default: ''
  },

  syndicResponse: {
    type: String,
    default: ''
  },

  resolution: {
    type: String,
    default: ''
  },

  resolutionDate: {
    type: Date,
    default: null
  },

  rating: {
    type: Number,
    default: null,
    min: 1,
    max: 5
  },

  ratingComment: {
    type: String,
    default: ''
  },

  feedback: {
    type: String,
    default: ''
  },

  responses: [
    {
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  statusHistory: [
    {
      status: String,
      changedBy: mongoose.Schema.Types.ObjectId,
      changedAt: Date,
      comment: String
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

complaintSchema.index({ building: 1, status: 1 });
complaintSchema.index({ resident: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ category: 1, building: 1 });

complaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);