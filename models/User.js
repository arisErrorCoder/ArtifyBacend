const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        return /^\+?[0-9\s\-\(\)]{10,}$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },
  country: {
    type: String,
    required: [true, 'Country is required']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [4, 'Username must be at least 4 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  accountType: {
    type: String,
    enum: ['individual', 'freelancer', 'business'],
    default: 'individual'
  },
  organizationName: {
    type: String,
    required: function() {
      return this.accountType === 'business';
    }
  },
  gstNumber: {
    type: String,
    required: function() {
      return this.accountType === 'business';
    },
    validate: {
      validator: function(v) {
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Please provide a valid GST number'
    }
  },
  referralCode: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
UserSchema.methods.getSignedJwtToken = function() {
    const jwtConfig = require('../config/jwt');
    return jwtConfig.getSignedToken(this);
  };
  
  // Generate password reset token
  UserSchema.methods.getResetPasswordToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');
  
    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
  
    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
  };
module.exports = mongoose.model('ArtifyUser', UserSchema);