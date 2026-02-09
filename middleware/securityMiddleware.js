const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const logger = require('../utils/logger');

/**
 * Security headers middleware using Helmet
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:3000", "http://localhost:5000", "http://localhost:5173"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "*"],
      frameAncestors: ["*"], // Allow iframe embedding from any domain
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources (for barcodes, images)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: false // Disable X-Frame-Options to allow iframe embedding
});

/**
 * CORS configuration
 * Prefer explicit allowlist from ALLOWED_ORIGINS env (comma-separated).
 * If not set, fallback to allowing any origin.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // No origin (mobile apps, curl) -> allow
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');

    // If no allowlist specified, allow all
    if (!allowedOrigins.length) return callback(null, true);

    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // List common headers; with credentials we can’t use wildcard
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
    'ngrok-skip-browser-warning' // allow ngrok’s custom header used by some clients
  ],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400 // 24 hours
};

const corsMiddleware = cors(corsOptions);

/**
 * General rate limiting
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 300, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.AUTH_RATE_LIMIT_MAX || 100, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    });
  }
});

/**
 * API rate limiting (more lenient for authenticated users)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT_MAX || 300, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many API requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      userId: req.user ? req.user.user_id : null
    });
    res.status(429).json({
      success: false,
      message: 'Too many API requests, please try again later.'
    });
  }
});

/**
 * Request size limiting middleware
 */
const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    logger.warn('Request size limit exceeded', {
      contentLength,
      maxSize,
      url: req.originalUrl,
      ip: req.ip
    });
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }
  next();
};

/**
 * XSS protection middleware
 */
const xssProtection = (req, res, next) => {
  // Remove any potential XSS attempts from query parameters
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  req.query = sanitizeObject(req.query);
  req.body = sanitizeObject(req.body);
  req.params = sanitizeObject(req.params);
  
  next();
};

module.exports = {
  securityHeaders,
  corsMiddleware,
  generalLimiter,
  authLimiter,
  apiLimiter,
  requestSizeLimit,
  xssProtection
};
