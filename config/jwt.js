const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

const jwtConfig = {
  getSignedToken: (user) => {
    if (!user || !user._id) {
      throw new Error('User object must have an _id property');
    }
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });
  },

  verifyToken: async (token) => {
    if (!token) {
      throw new ErrorResponse('No token provided', 401);
    }
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new ErrorResponse('Invalid or expired token', 401);
    }
  },

  setTokenCookie: (res, token) => {
    if (!res || !token) {
      throw new Error('Response object and token are required');
    }
    const options = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };
    res.cookie('token', token, options);
  },

  clearTokenCookie: (res) => {
    if (!res) {
      throw new Error('Response object is required');
    }
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
  },

  protect: async (req, res, next) => {
    let token;

    // Check both headers and cookies safely
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // Debugging logs
    console.log('Token found:', !!token);
    console.log('Auth header:', authHeader);
    console.log('Cookies:', req.cookies);

    if (!token) {
      console.error('No token provided');
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
      const decoded = await jwtConfig.verifyToken(token);
      console.log('Decoded token:', decoded);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.error('No user found for token');
        return next(new ErrorResponse('User not found', 404));
      }
      
      console.log('User authenticated:', req.user._id);
      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }
  },

  authorize: (...roles) => {
    if (!roles || !Array.isArray(roles)) {
      throw new Error('Roles must be an array');
    }
    
    return (req, res, next) => {
      if (!req.user?.role) {
        return next(new ErrorResponse('User role not found', 403));
      }
      
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