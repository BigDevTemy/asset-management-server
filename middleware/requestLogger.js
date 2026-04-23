const logger = require('../utils/logger');
const requestLogService = require('../services/requestLogService');

/**
 * Request logging middleware
 * Logs all HTTP requests with detailed information
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });

  next();
};

/**
 * Error logging middleware
 * Logs errors that occur during request processing
 */
const errorLogger = (err, req, res, next) => {
  res.locals.requestLogError = {
    message: err.message,
  };

  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: requestLogService.getUserId(req),
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
      
      logger.logAuth(action, req.body?.email || requestLogService.getUserId(req), isSuccess, {
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
