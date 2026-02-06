const { checkPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has specific permission
 * @param {string} module - The module name (e.g., 'assets', 'users')
 * @param {string} permission - The permission name (e.g., 'list', 'create', 'list_own')
 * @returns {Function} Express middleware function
 */
const requirePermission = (module, permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Permission check failed - no user in request', {
          module,
          permission,
          ip: req.ip || req.connection.remoteAddress
        });
        
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const hasPermission = checkPermission(req.user.role, module, permission);
      
      if (!hasPermission) {
        logger.warn('Permission check failed - insufficient permissions', {
          userId: req.user.user_id,
          userRole: req.user.role,
          module,
          permission,
          ip: req.ip || req.connection.remoteAddress
        });
        
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      logger.info('Permission check passed', {
        userId: req.user.user_id,
        userRole: req.user.role,
        module,
        permission
      });

      next();
    } catch (error) {
      logger.logError(error, {
        action: 'permission_check',
        userId: req.user?.user_id,
        module,
        permission,
        ip: req.ip || req.connection.remoteAddress
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during permission check.'
      });
    }
  };
};

module.exports = {
  requirePermission
};
