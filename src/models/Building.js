const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  address: {
    type: String,
    required: true,
    trim: true
  },

  city: {
    type: String,
    required: true,
    trim: true
  },

  postalCode: {
    type: String,
    trim: true
  },

  country: {
    type: String,
    default: 'Morocco',
    trim: true
  },

  totalApartments: {
    type: Number,
    required: true,
    min: 1
  },

  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  caretaker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  description: {
    type: String,
    default: ''
  },

  amenities: [String],

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

buildingSchema.index({ managedBy: 1 });
buildingSchema.index({ caretaker: 1 });

buildingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Building', buildingSchema);