const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Set JWT token and cookie options
const jwtConfig = {
  // Generate JWT token
  getSignedToken: (user) => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });
  },

  // Verify JWT token
  verifyToken: async (token) => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new ErrorResponse('Invalid or expired token', 401);
    }
  },

  // Set JWT token in cookie
  setTokenCookie: (res, token) => {
    const options = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    res.cookie('token', token, options);
  },

  // Clear JWT cookie
  clearTokenCookie: (res) => {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
  },

  // Protect routes - verify user is authenticated
  protect: async (req, res, next) => {
    let token;

    // Get token from header or cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
      // Verify token
      const decoded = await jwtConfig.verifyToken(token);

      // Get user from the token
      req.user = await User.findById(decoded.id);

      next();
    } catch (err) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }
  },

  // Grant access to specific roles
  authorize: (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return next(
          new ErrorResponse(
            `User role ${req.user.role} is not authorized to access this route`,
            403
          )
        );
      }
      next();
    };
  },
};

module.exports = jwtConfig;