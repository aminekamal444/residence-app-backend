const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    trim: true
  },

  floor: {
    type: Number,
    required: true,
    min: 0
  },

  size: {
    type: Number,
    default: null,
    min: 0
  },

  bedrooms: {
    type: Number,
    default: 0,
    min: 0
  },

  bathrooms: {
    type: Number,
    default: 0,
    min: 0
  },

  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    index: true
  },

  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  status: {
    type: String,
    enum: ['occupied', 'vacant', 'maintenance'],
    default: 'vacant'
  },

  monthlyCharge: {
    type: Number,
    default: 0,
    min: 0
  },

  notes: {
    type: String,
    default: ''
  },

  features: [String],

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

apartmentSchema.index({ building: 1 });
apartmentSchema.index({ resident: 1 });
apartmentSchema.index({ status: 1 });

apartmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Apartment', apartmentSchema);