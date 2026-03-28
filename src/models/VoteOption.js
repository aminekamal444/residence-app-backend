const mongoose = require('mongoose');

const voteOptionSchema = new mongoose.Schema({
  vote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vote',
    required: true,
    index: true
  },

  optionText: {
    type: String,
    required: true,
    trim: true
  },

  optionNumber: {
    type: Number,
    required: true
  },

  description: {
    type: String,
    default: ''
  },

  voteCount: {
    type: Number,
    default: 0,
    min: 0
  },

  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  voters: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      votedAt: Date
    }
  ],

  ranking: {
    type: Number,
    default: 0
  },

  isWinning: {
    type: Boolean,
    default: false
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

voteOptionSchema.index({ vote: 1 });
voteOptionSchema.index({ vote: 1, voteCount: -1 });

voteOptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VoteOption', voteOptionSchema);