const mongoose = require('mongoose');

const financialReportSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },

  year: {
    type: Number,
    required: true
  },

  month: {
    type: Number,
    min: 1,
    max: 12
  },

  // Revenue metrics
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },

  revenueByCategory: {
    maintenance: { type: Number, default: 0 },
    utilities: { type: Number, default: 0 },
    security: { type: Number, default: 0 },
    parking: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Expense metrics
  totalExpenses: {
    type: Number,
    default: 0,
    min: 0
  },

  expensesByCategory: {
    maintenance: { type: Number, default: 0 },
    utilities: { type: Number, default: 0 },
    security: { type: Number, default: 0 },
    staff: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Net income
  netIncome: {
    type: Number,
    default: 0
  },

  // Payment status
  totalCharges: {
    type: Number,
    default: 0
  },

  paidAmount: {
    type: Number,
    default: 0
  },

  pendingAmount: {
    type: Number,
    default: 0
  },

  overdueAmount: {
    type: Number,
    default: 0
  },

  // Apartment status
  apartmentStatus: {
    paid: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    overdue: { type: Number, default: 0 }
  },

  // Cash flow
  beginningBalance: {
    type: Number,
    default: 0
  },

  endingBalance: {
    type: Number,
    default: 0
  },

  totalInflows: {
    type: Number,
    default: 0
  },

  totalOutflows: {
    type: Number,
    default: 0
  },

  // Comparison data
  previousPeriodRevenue: {
    type: Number,
    default: 0
  },

  previousPeriodExpenses: {
    type: Number,
    default: 0
  },

  revenueVariance: {
    type: Number,
    default: 0
  },

  variancePercentage: {
    type: Number,
    default: 0
  },

  // Forecast
  forecastedRevenue: {
    type: Number,
    default: 0
  },

  forecastedExpenses: {
    type: Number,
    default: 0
  },

  // Monthly breakdown (for charts)
  monthlyData: [{
    month: String,
    revenue: Number,
    expenses: Number,
    net: Number
  }],

  // Raw data snapshot
  rawData: mongoose.Schema.Types.Mixed,

  status: {
    type: String,
    enum: ['draft', 'finalized', 'archived'],
    default: 'draft'
  },

  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  notes: {
    type: String,
    default: ''
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

financialReportSchema.index({ building: 1, year: 1, month: 1 });
financialReportSchema.index({ building: 1, period: 1 });
financialReportSchema.index({ createdAt: -1 });

financialReportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate derived fields
  this.netIncome = this.totalRevenue - this.totalExpenses;
  
  if (this.previousPeriodRevenue > 0) {
    this.revenueVariance = this.totalRevenue - this.previousPeriodRevenue;
    this.variancePercentage = ((this.revenueVariance / this.previousPeriodRevenue) * 100).toFixed(2);
  }
  
  next();
});

module.exports = mongoose.model('FinancialReport', financialReportSchema);