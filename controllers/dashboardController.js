const { Asset, AssetTransaction, User, Department, AssetCategory, MaintenanceSchedule, MaintenanceLog, AssetDocument } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { checkPermission } = require('../utils/permissions');

/**
 * Get IT Manager dashboard statistics
 */
const getITManagerStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user.role;

    // Check if user has IT Manager permissions
    if (!checkPermission(userRole, 'transactions', 'list')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. IT Manager role required.'
      });
    }

    logger.info('IT Manager dashboard stats request', {
      userId: userId,
      userRole: userRole,
      ip: req.ip || req.connection.remoteAddress
    });

    // Get total assets count
    const totalAssets = await Asset.count();

    // Get total users count
    const totalUsers = await User.count();


    // Get transaction statistics
    const totalRequests = await AssetTransaction.count();
    
    const approvedRequests = await AssetTransaction.count({
      where: {
        status: {
          [Op.in]: ['accepted', 'completed']
        }
      }
    });

    const pendingRequests = await AssetTransaction.count({
      where: {
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      }
    });

    const rejectedRequests = await AssetTransaction.count({
      where: {
        status: 'rejected'
      }
    });

    // Get maintenance statistics
    const totalSchedules = await MaintenanceSchedule.count({
      where: { is_active: true }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingMaintenance = await MaintenanceSchedule.count({
      where: {
        is_active: true,
        next_maintenance_date: {
          [Op.gte]: today,
          [Op.lte]: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      }
    });

    const overdueMaintenance = await MaintenanceSchedule.count({
      where: {
        is_active: true,
        next_maintenance_date: {
          [Op.lt]: today
        }
      }
    });

    // Get document statistics
    const totalDocuments = await AssetDocument.count();

    const stats = {
      totalAssets,
      totalUsers,
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
      totalSchedules,
      upcomingMaintenance,
      overdueMaintenance,
      totalDocuments
    };

    logger.info('IT Manager dashboard stats retrieved successfully', {
      userId: userId,
      stats: stats
    });

    res.json({
      success: true,
      message: 'IT Manager dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.logError(error, {
      action: 'get_it_manager_dashboard_stats',
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve IT Manager dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get Admin dashboard statistics
 */
const getAdminStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user.role;

    // Check if user has Admin permissions
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    logger.info('Admin dashboard stats request', {
      userId: userId,
      userRole: userRole,
      ip: req.ip || req.connection.remoteAddress
    });

    // Get total assets count
    const totalAssets = await Asset.count();

    // Get total users count
    const totalUsers = await User.count();

    // Get total departments count
    const totalDepartments = await Department.count();

    // Get transaction statistics
    const totalRequests = await AssetTransaction.count();
    
    const approvedRequests = await AssetTransaction.count({
      where: {
        status: {
          [Op.in]: ['accepted', 'completed']
        }
      }
    });

    const pendingRequests = await AssetTransaction.count({
      where: {
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      }
    });

    const rejectedRequests = await AssetTransaction.count({
      where: {
        status: 'rejected'
      }
    });

    // Get user status statistics
    const activeUsers = await User.count({
      where: { status: 'active' }
    });

    const inactiveUsers = await User.count({
      where: { status: 'inactive' }
    });

    // Get asset status statistics
    const availableAssets = await Asset.count({
      where: { status: 'available' }
    });

    const assignedAssets = await Asset.count({
      where: { status: 'assigned' }
    });

    // Get maintenance statistics
    const totalSchedules = await MaintenanceSchedule.count({
      where: { is_active: true }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingMaintenance = await MaintenanceSchedule.count({
      where: {
        is_active: true,
        next_maintenance_date: {
          [Op.gte]: today,
          [Op.lte]: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      }
    });

    const overdueMaintenance = await MaintenanceSchedule.count({
      where: {
        is_active: true,
        next_maintenance_date: {
          [Op.lt]: today
        }
      }
    });

    // Get document statistics
    const totalDocuments = await AssetDocument.count();

    // Get recent maintenance activities (last 5 logs)
    const recentMaintenanceLogs = await MaintenanceLog.findAll({
      limit: 5,
      order: [['performed_date', 'DESC']],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['asset_tag', 'name']
        }
      ]
    });

    const stats = {
      totalAssets,
      totalUsers,
      totalDepartments,
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
      activeUsers,
      inactiveUsers,
      availableAssets,
      assignedAssets,
      totalSchedules,
      upcomingMaintenance,
      overdueMaintenance,
      totalDocuments,
      recentMaintenanceLogs: recentMaintenanceLogs.map(log => ({
        log_id: log.log_id,
        title: log.title,
        performed_date: log.performed_date,
        asset_tag: log.asset?.asset_tag,
        asset_name: log.asset?.name
      }))
    };

    logger.info('Admin dashboard stats retrieved successfully', {
      userId: userId,
      stats: stats
    });

    res.json({
      success: true,
      message: 'Admin dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.logError(error, {
      action: 'get_admin_dashboard_stats',
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Admin dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get Supervisor dashboard statistics
 */
const getSupervisorStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const userRole = req.user.role;

    // Check if user has Supervisor permissions
    if (userRole !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Supervisor role required.'
      });
    }

    logger.info('Supervisor dashboard stats request', {
      userId: userId,
      userRole: userRole,
      ip: req.ip || req.connection.remoteAddress
    });

    // Get user's department
    const user = await User.findByPk(userId, {
      include: [{ model: Department, as: 'department' }]
    });

    if (!user || !user.department) {
      return res.status(404).json({
        success: false,
        message: 'User department not found'
      });
    }

    // Get team members in the same department
    const teamMembers = await User.count({
      where: { department_id: user.department_id }
    });

    // Get assets assigned to team members
    const teamAssets = await Asset.count({
      where: {
        assigned_to: {
          [Op.in]: await User.findAll({
            where: { department_id: user.department_id },
            attributes: ['user_id']
          }).then(users => users.map(u => u.user_id))
        }
      }
    });

    // Get transaction statistics for team
    const teamUserIds = await User.findAll({
      where: { department_id: user.department_id },
      attributes: ['user_id']
    }).then(users => users.map(u => u.user_id));

    const totalRequests = await AssetTransaction.count({
      where: {
        [Op.or]: [
          { requested_by: { [Op.in]: teamUserIds } },
          { requested_to: { [Op.in]: teamUserIds } }
        ]
      }
    });

    const approvedRequests = await AssetTransaction.count({
      where: {
        [Op.and]: [
          {
            status: {
              [Op.in]: ['accepted', 'completed']
            }
          },
          {
            [Op.or]: [
              { requested_by: { [Op.in]: teamUserIds } },
              { requested_to: { [Op.in]: teamUserIds } }
            ]
          }
        ]
      }
    });

    const pendingRequests = await AssetTransaction.count({
      where: {
        [Op.and]: [
          {
            status: {
              [Op.in]: ['pending', 'in_progress']
            }
          },
          {
            [Op.or]: [
              { requested_by: { [Op.in]: teamUserIds } },
              { requested_to: { [Op.in]: teamUserIds } }
            ]
          }
        ]
      }
    });

    const stats = {
      totalAssets: teamAssets,
      totalUsers: teamMembers,
      totalRequests,
      approvedRequests,
      pendingRequests
    };

    logger.info('Supervisor dashboard stats retrieved successfully', {
      userId: userId,
      stats: stats
    });

    res.json({
      success: true,
      message: 'Supervisor dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.logError(error, {
      action: 'get_supervisor_dashboard_stats',
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Supervisor dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get general dashboard statistics (for employees)
 */
const getGeneralStats = async (req, res) => {
  try {
    const userId = req.user.user_id;

    logger.info('General dashboard stats request', {
      userId: userId,
      ip: req.ip || req.connection.remoteAddress
    });

    // Get user's own request statistics
    const totalRequests = await AssetTransaction.count({
      where: { requested_by: userId }
    });

    const approvedRequests = await AssetTransaction.count({
      where: {
        [Op.and]: [
          {
            status: {
              [Op.in]: ['accepted', 'completed']
            }
          },
          {
            [Op.or]: [
              { requested_by: userId },
              { requested_to: userId }
            ]
          }
        ]
      }
    });

    const pendingRequests = await AssetTransaction.count({
      where: {
        [Op.and]: [
          {
            status: {
              [Op.in]: ['pending', 'in_progress']
            }
          },
          {
            [Op.or]: [
              { requested_by: userId },
              { requested_to: userId }
            ]
          }
        ]
      }
    });

    const rejectedRequests = await AssetTransaction.count({
      where: { 
        requested_by: userId,
        status: 'rejected'
      }
    });

    const stats = {
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests
    };

    logger.info('General dashboard stats retrieved successfully', {
      userId: userId,
      stats: stats
    });

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.logError(error, {
      action: 'get_general_dashboard_stats',
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message
    });
  }
};

module.exports = {
  getITManagerStats,
  getAdminStats,
  getSupervisorStats,
  getGeneralStats
};
