var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
const logger = require('./utils/logger');
const { requestLogger, errorLogger, authLogger } = require('./middleware/requestLogger');

// Import security middleware
const {
  securityHeaders,
  corsMiddleware,
  generalLimiter,
  requestSizeLimit,
  xssProtection
} = require('./middleware/securityMiddleware');

// Import health check middleware
const {
  customHealthCheck,
  readinessCheck,
  livenessCheck,
  metricsCheck
} = require('./middleware/healthCheckMiddleware');

// Import trim middleware
const { trimRequestData } = require('./middleware/trimMiddleware');

var indexRouter = require('./routes/index');
const { swaggerSpec, swaggerUi } = require('./config/swagger');

// Import batch jobs
const { initializeBatchJobs, stopBatchJobs } = require('./batches');

var app = express();


// Security middleware (order matters!)
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(requestSizeLimit);
app.use(xssProtection);

// Rate limiting
app.use(generalLimiter);

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https: http:"
  );
  next();
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Winston logging middleware
app.use(requestLogger);
app.use(authLogger);

// Morgan HTTP logging (streams to Winston)
app.use(morgan('combined', { stream: logger.stream }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Trim whitespace from all incoming request data
app.use(trimRequestData);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoints (before other routes)
app.get('/health', customHealthCheck);
app.get('/health/ready', readinessCheck);
app.get('/health/live', livenessCheck);
app.get('/health/metrics', metricsCheck);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Assets Manager API Documentation'
}));

// Serve swagger.json
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/', indexRouter);

// Serve the client build from public directory
app.use(express.static(path.join(__dirname, 'public/client')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
  });
  next(createError(404));
});

// Winston error logging middleware
app.use(errorLogger);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Log the error response
  logger.error('Error Response', {
    status: err.status || 500,
    message: err.message,
    method: req.method,
    url: req.originalUrl,
    stack: req.app.get('env') === 'development' ? err.stack : undefined,
  });

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Initialize batch jobs when the app starts
let batchJobs;
try {
  batchJobs = initializeBatchJobs();
  logger.info('Batch jobs initialized successfully');
} catch (error) {
  logger.error('Failed to initialize batch jobs:', error.message);
}

// Graceful shutdown handling for batch jobs
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down batch jobs...');
  if (batchJobs) {
    stopBatchJobs(batchJobs);
  }
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down batch jobs...');
  if (batchJobs) {
    stopBatchJobs(batchJobs);
  }
});

module.exports = app;
