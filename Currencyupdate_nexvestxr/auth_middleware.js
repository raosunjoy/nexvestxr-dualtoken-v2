// middleware/auth.js - Authentication middleware
const jwt = require('jsonwebtoken');
const { User } = require('../database/schemas/currencySchemas');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No valid token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType
    };

    // Optionally verify user still exists and is active
    const user = await User.findById(decoded.userId).select('_id email userType kycStatus');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
    }

    // Add full user data to request
    req.userData = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired.'
      });
    } else {
      console.error('❌ Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed.'
      });
    }
  }
};

// Optional auth - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without auth
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType
    };

    const user = await User.findById(decoded.userId).select('_id email userType kycStatus');
    if (user) {
      req.userData = user;
    }

    next();
  } catch (error) {
    // Token is invalid but we don't fail the request
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Authentication required.'
      });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// KYC verification middleware
const requireKYC = async (req, res, next) => {
  try {
    if (!req.userData) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (req.userData.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required.',
        kycStatus: req.userData.kycStatus
      });
    }

    next();
  } catch (error) {
    console.error('❌ KYC middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'KYC verification failed.'
    });
  }
};

// Rate limiting for specific users
const userRateLimit = (requestsPerMinute = 60) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.userId;
    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window

    // Get user's request history
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const userRequestHistory = userRequests.get(userId);
    
    // Remove old requests outside the window
    const recentRequests = userRequestHistory.filter(timestamp => timestamp > windowStart);
    userRequests.set(userId, recentRequests);

    // Check if user has exceeded the limit
    if (recentRequests.length >= requestsPerMinute) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: 60
      });
    }

    // Add current request
    recentRequests.push(now);

    next();
  };
};

module.exports = { 
  auth, 
  optionalAuth, 
  authorize, 
  requireKYC, 
  userRateLimit 
};