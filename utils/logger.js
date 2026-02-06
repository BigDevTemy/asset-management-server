const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels with colors
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Define file format (without colors)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');

// Define transports
const transports = [
    // Console transport
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
        format: logFormat,
    }),

    // Error log file
    new DailyRotateFile({
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: fileFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
    }),

    // Combined log file
    new DailyRotateFile({
        filename: path.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: fileFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
    }),

    // HTTP requests log file
    new DailyRotateFile({
        filename: path.join(logsDir, 'http-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        format: fileFormat,
        maxSize: '20m',
        maxFiles: '7d',
        zippedArchive: true,
    }),
];

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    levels: logLevels,
    format: fileFormat,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

// Add request logging method
logger.logRequest = (req, res, responseTime) => {
    const logData = {
        method: req.method || null,
        url: req.originalUrl || null,
        statusCode: res?.statusCode || null,
        responseTime: `${responseTime}ms`,
        ip: req?.ip || req?.connection?.remoteAddress || null,
        userId: req?.user ? req.user.id : null,
    };

    if (res?.statusCode >= 400) {
        logger.warn('HTTP Request', logData);
    } else {
        logger.http('HTTP Request', logData);
    }
};

// Add error logging method
logger.logError = (error, context = {}) => {
    const errorData = {
        message: error.message,
        stack: error.stack,
        ...context,
    };

    logger.error('Application Error', errorData);
};

// Add database operation logging method
logger.logDatabase = (operation, table, data = {}) => {
    const dbData = {
        operation,
        table,
        data: JSON.stringify(data),
        timestamp: new Date().toISOString(),
    };

    logger.info('Database Operation', dbData);
};

// Add authentication logging method
logger.logAuth = (action, userId, success, details = {}) => {
    const authData = {
        action,
        userId,
        success,
        timestamp: new Date().toISOString(),
        ...details,
    };

    if (success) {
        logger.info('Authentication', authData);
    } else {
        logger.warn('Authentication Failed', authData);
    }
};

// Add business logic logging method
logger.logBusiness = (action, details = {}) => {
    const businessData = {
        action,
        timestamp: new Date().toISOString(),
        ...details,
    };

    logger.info('Business Logic', businessData);
};

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'development') {
    logger.exceptions.handle(
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: fileFormat,
        })
    );

    logger.rejections.handle(
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: fileFormat,
        })
    );
}

module.exports = logger;
