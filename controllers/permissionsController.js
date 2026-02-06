const logger = require('../utils/logger');
const {

  ADMIN_PERMISSIONS,
  IT_MANAGER_PERMISSIONS,
  EMPLOYEE_PERMISSIONS
} = require('../utils/permissions');

// Get all permissions data
const getPermissions = async (req, res) => {
  try {
    logger.info('Permissions data request', {
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    const permissionsData = {


      admin: ADMIN_PERMISSIONS,
      it_manager: IT_MANAGER_PERMISSIONS,
      employee: EMPLOYEE_PERMISSIONS
    };

    res.status(200).json({
      success: true,
      message: 'Permissions data retrieved successfully',
      data: permissionsData
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_permissions',
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve permissions data',
      error: error.message
    });
  }
};


module.exports = {
  getPermissions
};
