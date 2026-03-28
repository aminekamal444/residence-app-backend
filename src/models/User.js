const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES } = require('../config/constants');
const logger = require('../utils/logger');

// ============ CREATE SCHEMA FIRST ============
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    index: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    maxlength: [128, 'Password cannot exceed 128 characters'],
    select: false // Don't return password by default
  },

  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  phone: {
    type: String,
    trim: true,
    match: [/^[0-9\+\-\s\(\)]{9,15}$/, 'Please provide a valid phone number'],
    default: null
  },

  role: {
    type: String,
    enum: {
      values: Object.values(ROLES),
      message: `Role must be one of: ${Object.values(ROLES).join(', ')}`
    },
    required: true,
    default: ROLES.RESIDENT,
    index: true
  },

  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    default: null,
    sparse: true
  },

  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    default: null,
    index: true
  },

  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended'],
      message: 'Status must be active, inactive, or suspended'
    },
    default: 'active',
    index: true
  },

  lastLogin: {
    type: Date,
    default: null
  },

  deviceTokens: [{
    token: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now,
      expires: 86400 * 30
    },
    _id: false
  }],

  notificationPreferences: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    emergencyOnly: { type: Boolean, default: false },
    _id: false
  },

  deletedAt: {
    type: Date,
    default: null,
    select: false
  }

}, { 
  timestamps: true,
  collection: 'users'
});

// ============ INDEXES ============
userSchema.index({ building: 1, role: 1 });
userSchema.index({ building: 1, status: 1 });
userSchema.index({ apartment: 1, building: 1 });
userSchema.index({ email: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// ============ MIDDLEWARE/HOOKS ============
userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    logger.debug(`Password hashed for user: ${this.email}`);
    next();

  } catch (error) {
    logger.error('Error hashing password:', error);
    next(error);
  }
});

userSchema.pre(/^find/, function(next) {
  if (!this.options._recursed) {
    this.where({ deletedAt: null });
  }
  next();
});

// ============ METHODS ============
userSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    throw error;
  }
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.deviceTokens;
  delete user.deletedAt;
  return user;
};

userSchema.query.notDeleted = function() {
  return this.where({ deletedAt: null });
};

// ============ EXPORT ============
module.exports = mongoose.model('User', userSchema);