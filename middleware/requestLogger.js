const logger = require('../utils/logger');

/**
 * Request logging middleware
 * Logs all HTTP requests with detailed information
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log the incoming request
  logger.http('Incoming Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log the response
    logger.logRequest(req, res, responseTime);
    
    // Call the original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logging middleware
 * Logs errors that occur during request processing
 */
const errorLogger = (err, req, res, next) => {
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  next(err);
};

/**
 * Authentication logging middleware
 * Logs authentication attempts and results
 */
const authLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log authentication responses
    if (req.originalUrl.includes('/auth/')) {
      const isSuccess = res.statusCode < 400;
      const action = req.originalUrl.split('/').pop();
      
      logger.logAuth(action, req.body?.email || req.user?.id, isSuccess, {
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  authLogger,
};
