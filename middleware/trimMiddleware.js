const logger = require('../utils/logger');

/**
 * Middleware to automatically trim whitespace from all string values in request data
 * This helps maintain data quality by removing leading/trailing whitespace from user inputs
 */

/**
 * Recursively trim whitespace from all string values in an object/array
 * @param {any} obj - The object to process
 * @returns {any} - The processed object with trimmed strings
 */
const trimObject = (obj) => {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings - trim whitespace
  if (typeof obj === 'string') {
    return obj.trim();
  }

  // Handle arrays - recursively trim each element
  if (Array.isArray(obj)) {
    return obj.map(item => trimObject(item));
  }

  // Handle objects - recursively trim all values
  if (typeof obj === 'object') {
    const trimmed = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Trim the key as well in case object keys have whitespace
        const trimmedKey = typeof key === 'string' ? key.trim() : key;
        trimmed[trimmedKey] = trimObject(obj[key]);
      }
    }
    
    return trimmed;
  }

  // Return primitive values as-is (numbers, booleans, etc.)
  return obj;
};

/**
 * Express middleware to trim whitespace from request data
 * Processes req.body, req.query, and req.params
 */
const trimRequestData = (req, res, next) => {
  try {
    // Count trimmed fields for logging
    let trimmedCount = 0;
    const originalJson = JSON.stringify(req.body);

    // Trim request body (most important for form submissions)
    if (req.body && typeof req.body === 'object') {
      const originalBody = JSON.parse(JSON.stringify(req.body)); // Deep copy for comparison
      req.body = trimObject(req.body);
      
      // Count how many string fields were actually trimmed
      const checkTrimmed = (original, trimmed) => {
        if (typeof original === 'string' && typeof trimmed === 'string' && original !== trimmed) {
          trimmedCount++;
        } else if (typeof original === 'object' && original !== null && typeof trimmed === 'object' && trimmed !== null) {
          if (Array.isArray(original) && Array.isArray(trimmed)) {
            for (let i = 0; i < original.length; i++) {
              checkTrimmed(original[i], trimmed[i]);
            }
          } else {
            for (const key in original) {
              if (original.hasOwnProperty(key)) {
                checkTrimmed(original[key], trimmed[key]);
              }
            }
          }
        }
      };
      
      checkTrimmed(originalBody, req.body);
    }

    // Trim query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = trimObject(req.query);
    }

    // Trim URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = trimObject(req.params);
    }

    // Log if any trimming occurred (for debugging/monitoring)
    if (trimmedCount > 0) {
      logger.info('Request data trimmed', {
        method: req.method,
        url: req.originalUrl,
        trimmedFields: trimmedCount,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
    }

    next();
  } catch (error) {
    // Log error but don't break the request flow
    logger.error('Error in trim middleware', {
      error: error.message,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Continue with original request data if trimming fails
    next();
  }
};

/**
 * Configuration options for the trim middleware
 */
const trimMiddlewareOptions = {
  // Skip trimming for specific routes (if needed)
  skipRoutes: [
    // Add routes here if you need to preserve whitespace for specific endpoints
    // e.g., '/api/files/content' if file content should preserve formatting
  ],
  
  // Skip trimming for specific content types
  skipContentTypes: [
    'application/octet-stream',
    'multipart/form-data' // File uploads - handled separately
  ]
};

/**
 * Enhanced trim middleware with configuration options
 */
const configurableTrimMiddleware = (options = {}) => {
  const config = { ...trimMiddlewareOptions, ...options };
  
  return (req, res, next) => {
    // Skip if route is in skip list
    if (config.skipRoutes.some(route => req.path.includes(route))) {
      return next();
    }
    
    // Skip if content type should be skipped
    const contentType = req.get('content-type') || '';
    if (config.skipContentTypes.some(type => contentType.toLowerCase().includes(type.toLowerCase()))) {
      return next();
    }
    
    // Apply trimming
    trimRequestData(req, res, next);
  };
};

module.exports = {
  trimRequestData,
  configurableTrimMiddleware,
  trimObject
};
