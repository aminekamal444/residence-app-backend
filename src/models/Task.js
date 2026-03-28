const mongoose = require('mongoose');
const { TASK_STATUS, TASK_CATEGORIES } = require('../config/constants');

const taskSchema = new mongoose.Schema({
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
    enum: Object.values(TASK_CATEGORIES),
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
    enum: Object.values(TASK_STATUS),
    default: TASK_STATUS.PENDING,
    index: true
  },

  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    default: null
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  dueDate: {
    type: Date,
    required: true
  },

  startedAt: {
    type: Date,
    default: null
  },

  completedAt: {
    type: Date,
    default: null
  },

  photos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskPhoto'
    }
  ],

  syndicComment: {
    type: String,
    default: ''
  },

  gardienNote: {
    type: String,
    default: ''
  },

  // Photo validation confidence (0-100)
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // For tracking rejections
  rejectionCount: {
    type: Number,
    default: 0
  },

  lastRejectionReason: {
    type: String,
    default: ''
  },

  // Unavailability tracking
  gardienUnavailable: {
    type: Boolean,
    default: false
  },

  unavailabilityReason: {
    type: String,
    default: ''
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  approvedAt: {
    type: Date,
    default: null
  },

  approvalHistory: [
    {
      approvedBy: mongoose.Schema.Types.ObjectId,
      approvedAt: Date,
      status: String,
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

taskSchema.index({ building: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ category: 1, building: 1 });

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Task', taskSchema);