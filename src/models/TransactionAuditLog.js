const mongoose = require('mongoose');

const transactionAuditLogSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: [
      'charge_created',
      'charge_updated',
      'charge_cancelled',
      'payment_received',
      'payment_failed',
      'payment_refunded',
      'expense_recorded',
      'expense_updated',
      'budget_created',
      'budget_updated',
      'report_generated'
    ],
    required: true,
    index: true
  },

  description: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    default: 0
  },

  category: {
    type: String,
    enum: ['maintenance', 'utilities', 'security', 'parking', 'other', 'salary', 'insurance'],
    default: 'other'
  },

  // Related entity reference
  entityType: {
    type: String,
    enum: ['charge', 'payment', 'expense', 'budget', 'report'],
    required: true
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // User who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Apartment (if applicable)
  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    default: null
  },

  // Resident (if applicable)
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // What changed
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,

  // Status before and after
  statusBefore: String,
  statusAfter: String,

  // Additional metadata
  ipAddress: String,
  userAgent: String,
  notes: {
    type: String,
    default: ''
  },

  // For dashboard grouping
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

transactionAuditLogSchema.index({ building: 1, createdAt: -1 });
transactionAuditLogSchema.index({ building: 1, type: 1 });
transactionAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
transactionAuditLogSchema.index({ entityType: 1, entityId: 1 });
transactionAuditLogSchema.index({ transactionDate: 1 });

module.exports = mongoose.model('TransactionAuditLog', transactionAuditLogSchema);