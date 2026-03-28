const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
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

  type: {
    type: String,
    enum: [
      'charge_created',
      'charge_due_soon',
      'charge_due_today',
      'payment_reminder_7days',
      'payment_reminder_14days',
      'payment_confirmation',
      'announcement',
      'vote_invitation',
      'vote_results',
      'complaint_status_update',
      'complaint_resolved',
      'building_emergency',
      'task_assigned',
      'task_assigned_urgent',
      'task_approaching_due',
      'task_overdue',
      'task_approved',
      'task_rejected',
      'photo_validation_failed',
      'unavailability_approved',
      'unavailability_denied',
      'payment_received',
      'payment_failed',
      'overdue_alert',
      'budget_threshold_warning',
      'budget_exceeded',
      'revenue_below_target',
      'cash_flow_alert',
      'gardien_unavailability_request',
      'monthly_statement',
      'annual_summary',
      'financial_report_ready',
      'performance_alert',
      'schedule_published'
    ],
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true
  },

  body: {
    type: String,
    required: true
  },

  data: mongoose.Schema.Types.Mixed,

  entityType: {
    type: String,
    enum: ['charge', 'payment', 'task', 'complaint', 'announcement', 'vote', 'report', 'budget'],
    default: null
  },

  entityId: mongoose.Schema.Types.ObjectId,

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Delivery channels
  channels: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },

  // Delivery status
  deliveryStatus: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      bounced: { type: Boolean, default: false },
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      deliveryStatus: String,
      error: String
    }
  },

  // User interaction
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read', 'archived'],
    default: 'pending',
    index: true
  },

  readAt: Date,
  archivedAt: Date,
  clickedAt: Date,

  // Scheduling
  scheduledFor: Date,

  // Retry info
  retryCount: {
    type: Number,
    default: 0
  },

  lastRetry: Date,

  // Preferences check
  userPreferences: {
    pushEnabled: Boolean,
    emailEnabled: Boolean,
    smsEnabled: Boolean
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

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ building: 1, type: 1 });
notificationSchema.index({ 'deliveryStatus.push.sent': 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });

notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);