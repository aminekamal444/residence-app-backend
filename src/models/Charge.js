const mongoose = require('mongoose');

const chargeSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true,
    index: true
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    enum: ['maintenance', 'utilities', 'security', 'parking', 'other'],
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  dueDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
    index: true
  },

  paidDate: {
    type: Date,
    default: null
  },

  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  notes: {
    type: String,
    default: ''
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // For dashboard metrics
  daysOverdue: {
    type: Number,
    default: 0
  },

  remindersSent: {
    type: Number,
    default: 0
  },

  lastReminderSent: {
    type: Date,
    default: null
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

chargeSchema.index({ building: 1, status: 1 });
chargeSchema.index({ apartment: 1, status: 1 });
chargeSchema.index({ dueDate: 1, status: 1 });
chargeSchema.index({ category: 1, building: 1 });

chargeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate daysOverdue
  if (this.status === 'overdue') {
    const today = new Date();
    const timeDiff = today.getTime() - this.dueDate.getTime();
    this.daysOverdue = Math.floor(timeDiff / (1000 * 3600 * 24));
  }
  
  next();
});

module.exports = mongoose.model('Charge', chargeSchema);