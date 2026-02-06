
const { sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * Custom health check function
 */
const customHealthCheck = (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: 'unknown',
      disk: 'unknown'
    }
  };

  // Check database connection
  sequelize.authenticate()
    .then(() => {
      healthCheck.checks.database = 'healthy';
      logger.info('Health check - Database connection successful');
    })
    .catch((error) => {
      healthCheck.checks.database = 'unhealthy';
      healthCheck.message = 'Database connection failed';
      logger.error('Health check - Database connection failed', { error: error.message });
    })
    .finally(() => {
      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };
      
      healthCheck.checks.memory = {
        status: memUsageMB.heapUsed > 500 ? 'warning' : 'healthy', // Warning if heap > 500MB
        usage: memUsageMB
      };

      // Check disk space (simplified check)
      const fs = require('fs');
      try {
        fs.accessSync(process.cwd(), fs.constants.W_OK);
        healthCheck.checks.disk = 'healthy';
      } catch (error) {
        healthCheck.checks.disk = 'unhealthy';
        healthCheck.message = 'Disk write access failed';
      }

      // Determine overall health status
      const isHealthy = healthCheck.checks.database === 'healthy' && 
                       healthCheck.checks.disk === 'healthy' &&
                       healthCheck.checks.memory.status !== 'warning';

      const statusCode = isHealthy ? 200 : 503;
      
      res.status(statusCode).json(healthCheck);
    });
};

/**
 * Readiness probe (for Kubernetes)
 */
const readinessCheck = (req, res) => {
  const readiness = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown'
    }
  };

  sequelize.authenticate()
    .then(() => {
      readiness.checks.database = 'ready';
      res.status(200).json(readiness);
    })
    .catch((error) => {
      readiness.status = 'not ready';
      readiness.checks.database = 'not ready';
      readiness.error = error.message;
      res.status(503).json(readiness);
    });
};

/**
 * Liveness probe (for Kubernetes)
 */
const livenessCheck = (req, res) => {
  const liveness = {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };

  // Simple check - if the process is running and responding, it's alive
  res.status(200).json(liveness);
};

/**
 * Detailed system metrics
 */
const metricsCheck = (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT || 3000
    }
  };

  res.status(200).json(metrics);
};

module.exports = {
  customHealthCheck,
  readinessCheck,
  livenessCheck,
  metricsCheck
};
