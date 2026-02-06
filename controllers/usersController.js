const { createUserCrudService } = require('../services/crudServiceFactory');
const logger = require('../utils/logger');
const { USER_STATUS_ARRAY } = require('../utils/constants');
const bcrypt = require('bcrypt');

// Initialize CRUD service for users
const userCrudService = createUserCrudService();

// List all users with pagination and search
const list = async (req, res) => {
  try {
    logger.info('Users list request', {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const result = await userCrudService.list(req.query);
    
    logger.info('Users list successful', {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0
    });
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      ...result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'list_users',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

// Get single user by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('User get by ID request', {
      userId: req.user?.user_id,
      targetUserId: id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const user = await userCrudService.getById(id);
    
    if (!user) {
      logger.warn('User not found', {
        userId: req.user?.user_id,
        targetUserId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.info('User retrieved successfully', {
      userId: req.user?.user_id,
      targetUserId: id,
      targetUserEmail: user.email
    });
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_user_by_id',
      userId: req.user?.user_id,
      targetUserId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
};

// Create new user
const create = async (req, res) => {
  try {
    const userData = { ...req.body };
    
    logger.info('User creation request', {
      userId: req.user?.user_id,
      userData: {
        email: userData.email,
        full_name: userData.full_name,
        employee_id: userData.employee_id,
        role: userData.role
      },
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Hash password if provided
    if (userData.password) {
      const saltRounds = 12;
      userData.password_hash = await bcrypt.hash(userData.password, saltRounds);
      delete userData.password; // Remove plain password from data
    } else if (userData.password_hash && !userData.password_hash.startsWith('$2')) {
      // If password_hash is provided but it's not already hashed (doesn't start with bcrypt prefix $2)
      const saltRounds = 12;
      userData.password_hash = await bcrypt.hash(userData.password_hash, saltRounds);
    }
    
    const user = await userCrudService.create(userData);
    
    logger.logBusiness('user_created', {
      userId: req.user?.user_id,
      newUserId: user.user_id,
      newUserEmail: user.email,
      newUserRole: user.role
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    logger.logError(error, {
      action: 'create_user',
      userId: req.user?.user_id,
      userData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// Update user
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    logger.info('User update request', {
      userId: req.user?.user_id,
      targetUserId: id,
      updateData: Object.keys(updateData),
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Hash password if provided
    if (updateData.password) {
      const saltRounds = 12;
      updateData.password_hash = await bcrypt.hash(updateData.password, saltRounds);
      delete updateData.password; // Remove plain password from data
    } else if (updateData.password_hash && !updateData.password_hash.startsWith('$2')) {
      // If password_hash is provided but it's not already hashed (doesn't start with bcrypt prefix $2)
      const saltRounds = 12;
      updateData.password_hash = await bcrypt.hash(updateData.password_hash, saltRounds);
    }
    
    const user = await userCrudService.update(id, updateData);
    
    if (!user) {
      logger.warn('User not found for update', {
        userId: req.user?.user_id,
        targetUserId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.logBusiness('user_updated', {
      userId: req.user?.user_id,
      targetUserId: id,
      targetUserEmail: user.email,
      updatedFields: Object.keys(updateData)
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    logger.logError(error, {
      action: 'update_user',
      userId: req.user?.user_id,
      targetUserId: req.params.id,
      updateData: req.body,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Handle validation errors
    if (error.message === 'Validation failed' && error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user (hard delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('User deletion request', {
      userId: req.user?.user_id,
      targetUserId: id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const deleted = await userCrudService.delete(id);
    
    if (!deleted) {
      logger.warn('User not found for deletion', {
        userId: req.user?.user_id,
        targetUserId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.logBusiness('user_deleted', {
      userId: req.user?.user_id,
      targetUserId: id
    });
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.logError(error, {
      action: 'delete_user',
      userId: req.user?.user_id,
      targetUserId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Change user status
const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    logger.info('User status change request', {
      userId: req.user?.user_id,
      targetUserId: id,
      newStatus: status,
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Validate status
    if (!USER_STATUS_ARRAY.includes(status)) {
      logger.warn('Invalid user status provided', {
        userId: req.user?.user_id,
        targetUserId: id,
        invalidStatus: status,
        validStatuses: USER_STATUS_ARRAY,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + USER_STATUS_ARRAY.join(', ')
      });
    }
    
    const user = await userCrudService.update(id, { status });
    
    if (!user) {
      logger.warn('User not found for status change', {
        userId: req.user?.user_id,
        targetUserId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.logBusiness('user_status_changed', {
      userId: req.user?.user_id,
      targetUserId: id,
      targetUserEmail: user.email,
      oldStatus: user.status,
      newStatus: status
    });
    
    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    logger.logError(error, {
      action: 'change_user_status',
      userId: req.user?.user_id,
      targetUserId: req.params.id,
      newStatus: req.body.status,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(400).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  changeStatus
};
