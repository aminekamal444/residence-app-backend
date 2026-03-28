const mongoose = require('mongoose');
const logger = require('../utils/logger');

const budgetSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building is required'],
    index: true
  },

  category: {
    type: String,
    enum: {
      values: ['electricity', 'water', 'maintenance', 'cleaning', 'security', 'insurance', 'other'],
      message: 'Category must be valid'
    },
    required: [true, 'Category is required'],
    index: true
  },

  period: {
    type: String,
    enum: {
      values: ['monthly', 'quarterly', 'yearly'],
      message: 'Period must be monthly, quarterly, or yearly'
    },
    required: [true, 'Period is required']
  },

  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 2000,
    max: 2100
  },

  month: {
    type: Number,
    default: null,  // null for quarterly/yearly
    min: 1,
    max: 12
  },

  budgetedAmount: {
    type: Number,
    required: [true, 'Budgeted amount is required'],
    min: 0
  },

  actualAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  variance: {
    type: Number,
    default: 0  // budgetedAmount - actualAmount
  },

  status: {
    type: String,
    enum: {
      values: ['draft', 'approved', 'active', 'completed'],
      message: 'Status must be draft, approved, active, or completed'
    },
    default: 'draft'
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  notes: {
    type: String,
    trim: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  approvalDate: {
    type: Date,
    default: null
  },

  deletedAt: {
    type: Date,
    default: null,
    select: false
  }

}, {
  timestamps: true,
  collection: 'budgets'
});

// Indexes
budgetSchema.index({ building: 1, year: 1, month: 1 });
budgetSchema.index({ building: 1, category: 1, period: 1 });
budgetSchema.index({ status: 1 });
budgetSchema.index({ createdBy: 1 });

// Calculate variance before saving
budgetSchema.pre('save', function(next) {
  this.variance = this.budgetedAmount - this.actualAmount;
  next();
});

// Exclude soft-deleted
budgetSchema.pre(/^find/, function(next) {
  if (!this.options._recursed) {
    this.where({ deletedAt: null });
  }
  next();
});

// Methods
budgetSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.deletedAt;
  return obj;
};

budgetSchema.query.notDeleted = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Budget', budgetSchema);