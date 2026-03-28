const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  charge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Charge',
    required: true,
    index: true
  },

  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true,
    index: true
  },

  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  paymentMethod: {
    type: String,
    enum: ['stripe', 'bank_transfer', 'cash', 'check'],
    required: true
  },

  stripePaymentIntentId: {
    type: String,
    default: null
  },

  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },

  status: {
    type: String,
    enum: ['completed', 'failed', 'refunded', 'pending'],
    default: 'pending',
    index: true
  },

  paidDate: {
    type: Date,
    default: null,
    index: true
  },

  receiptUrl: {
    type: String,
    default: null
  },

  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  notes: {
    type: String,
    default: ''
  },

  refundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  refundedDate: {
    type: Date,
    default: null
  },

  refundReason: {
    type: String,
    default: ''
  },

  // For dashboard metrics
  category: {
    type: String,
    enum: ['maintenance', 'utilities', 'security', 'parking', 'other'],
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.index({ building: 1, paidDate: 1 });
paymentSchema.index({ building: 1, status: 1 });
paymentSchema.index({ resident: 1, paidDate: 1 });
paymentSchema.index({ category: 1, building: 1 });

paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);