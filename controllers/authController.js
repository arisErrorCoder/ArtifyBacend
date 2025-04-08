const nodemailer = require('nodemailer');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const jwtConfig = require('../config/jwt');


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, country, city, username, password, accountType, organizationName, gstNumber, referralCode } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }

    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ success: false, error: 'Username already taken' });
    }

    // Create user
    user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      country,
      city,
      username,
      password,
      accountType,
      organizationName: accountType === 'business' ? organizationName : undefined,
      gstNumber: accountType === 'business' ? gstNumber : undefined,
      referralCode
    });

    // Create token
    const token = user.getSignedJwtToken();

    res.status(201).json({ 
      success: true, 
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        accountType: user.accountType
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Create token
    const token = user.getSignedJwtToken();

    res.status(200).json({ 
      success: true, 
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        accountType: user.accountType
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No user found with this email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://brandingnewwebapp.netlify.app/resetpassword/${resetToken}`;

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD}})

    // Email options
    const mailOptions = {
      from: `"Artify Support" <${process.env.EMAIL_USERNAME}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: generateResetEmail(user.name, resetUrl)
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true, 
      data: 'Password reset email sent'
    });
  } catch (err) {
    // Clear reset token if error occurs
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    next(err);
  }
};

// Email template generator
function generateResetEmail(name, resetUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Password Reset</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4a6baf; padding: 20px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4a6baf;
          color: white !important;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer { margin-top: 30px; font-size: 12px; text-align: center; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Artify Design Studio</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password for your Artify account.</p>
          <p>Please click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>This password reset link will expire in 30 minutes.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Artify Design Studio. All rights reserved.</p>
          <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Create token
    const token = user.getSignedJwtToken();

    res.status(200).json({ 
      success: true, 
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      country: req.body.country,
      city: req.body.city,
      username: req.body.username,
      accountType: req.body.accountType,
      organizationName: req.body.accountType === 'business' ? req.body.organizationName : undefined,
      gstNumber: req.body.accountType === 'business' ? req.body.gstNumber : undefined
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = req.body.newPassword;
    await user.save();

    // Create token
    const token = user.getSignedJwtToken();

    res.status(200).json({ 
      success: true, 
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        accountType: user.accountType
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/deleteaccount
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user (Admin)
// @route   GET /api/auth/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};