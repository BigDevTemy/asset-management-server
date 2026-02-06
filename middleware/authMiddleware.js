const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { USER_ROLES } = require('../utils/constants');

// JWT secret key (should match the one in authController)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-development';

/**
 * Middleware to authenticate JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided or invalid format.'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists and is active
    const user = await User.findByPk(decoded.user_id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Token is no longer valid. User not found or inactive.'
      });
    }

    // Add user info to request object
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      department_id: decoded.department_id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    } else {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.'
      });
    }
  }
};

/**
 * Middleware to check if user has required role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = authorize(USER_ROLES.ADMIN);

/**
 * Middleware to check if user is admin or IT manager
 */
const requireAdminOrITManager = authorize(USER_ROLES.ADMIN, USER_ROLES.IT_MANAGER);

/**
 * Middleware to check if user is admin, IT manager, or supervisor
 */
const requireManagerOrAbove = authorize(USER_ROLES.ADMIN, USER_ROLES.IT_MANAGER, USER_ROLES.SUPERVISOR);

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireAdminOrITManager,
  requireManagerOrAbove
};
