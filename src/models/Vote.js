const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
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

  description: {
    type: String,
    default: ''
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  type: {
    type: String,
    enum: ['yes_no', 'multiple_choice', 'rating'],
    default: 'yes_no'
  },

  startDate: {
    type: Date,
    required: true
  },

  endDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'archived'],
    default: 'draft'
  },

  options: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VoteOption'
    }
  ],

  totalVotes: {
    type: Number,
    default: 0
  },

  eligibleVoters: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  voters: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      votedAt: Date,
      optionSelected: String
    }
  ],

  requiredQuorum: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },

  quorumMet: {
    type: Boolean,
    default: false
  },

  results: {
    winningOption: String,
    winningPercentage: Number,
    allResults: mongoose.Schema.Types.Mixed
  },

  targetAudience: {
    type: String,
    enum: ['all', 'residents', 'staff', 'syndic'],
    default: 'all'
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

voteSchema.index({ building: 1, status: 1 });
voteSchema.index({ building: 1, endDate: 1 });
voteSchema.index({ createdBy: 1 });

voteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.eligibleVoters.length > 0 && this.totalVotes > 0) {
    const percentage = (this.totalVotes / this.eligibleVoters.length) * 100;
    this.quorumMet = percentage >= this.requiredQuorum;
  }
  
  next();
});

module.exports = mongoose.model('Vote', voteSchema);