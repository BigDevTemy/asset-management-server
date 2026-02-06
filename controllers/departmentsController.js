const { createDepartmentCrudService } = require('../services/crudServiceFactory');
const logger = require('../utils/logger');

// Initialize CRUD service for departments
const departmentCrudService = createDepartmentCrudService();

// List all departments with pagination and search
const list = async (req, res) => {
  try {
    logger.info('Departments list request', {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });

    const result = await departmentCrudService.list(req.query);

    logger.info('Departments list successful', {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0
    });

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      ...result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'list_departments',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments',
      error: error.message
    });
  }
};

// Get single department by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Department get by ID request', {
      userId: req.user?.user_id,
      departmentId: id,
      ip: req.ip || req.connection.remoteAddress
    });

    const department = await departmentCrudService.getById(id);

    if (!department) {
      logger.warn('Department not found', {
        userId: req.user?.user_id,
        departmentId: id,
        ip: req.ip || req.connection.remoteAddress
      });

      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    logger.info('Department retrieved successfully', {
      userId: req.user?.user_id,
      departmentId: id,
      departmentName: department.name
    });

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: department
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_department_by_id',
      userId: req.user?.user_id,
      departmentId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department',
      error: error.message
    });
  }
};

// Create new department
const create = async (req, res) => {
  try {
    const departmentData = req.body;

    logger.info('Department creation request', {
      userId: req.user?.user_id,
      departmentData: {
        name: departmentData.name,
        description: departmentData.description
      },
      ip: req.ip || req.connection.remoteAddress
    });

    const department = await departmentCrudService.create(departmentData);

    logger.logBusiness('department_created', {
      userId: req.user?.user_id,
      departmentId: department.department_id,
      departmentName: department.name
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    logger.logError(error, {
      action: 'create_department',
      userId: req.user?.user_id,
      departmentData: req.body,
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
      message: 'Failed to create department',
      error: error.message
    });
  }
};

// Update department
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Department update request', {
      userId: req.user?.user_id,
      departmentId: id,
      updateData: Object.keys(updateData),
      ip: req.ip || req.connection.remoteAddress
    });

    const department = await departmentCrudService.update(id, updateData);

    if (!department) {
      logger.warn('Department not found for update', {
        userId: req.user?.user_id,
        departmentId: id,
        ip: req.ip || req.connection.remoteAddress
      });

      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    logger.logBusiness('department_updated', {
      userId: req.user?.user_id,
      departmentId: id,
      departmentName: department.name,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    logger.logError(error, {
      action: 'update_department',
      userId: req.user?.user_id,
      departmentId: req.params.id,
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
      message: 'Failed to update department',
      error: error.message
    });
  }
};

// Delete department (hard delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Department deletion request', {
      userId: req.user?.user_id,
      departmentId: id,
      ip: req.ip || req.connection.remoteAddress
    });

    const deleted = await departmentCrudService.delete(id);

    if (!deleted) {
      logger.warn('Department not found for deletion', {
        userId: req.user?.user_id,
        departmentId: id,
        ip: req.ip || req.connection.remoteAddress
      });

      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    logger.logBusiness('department_deleted', {
      userId: req.user?.user_id,
      departmentId: id
    });

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    logger.logError(error, {
      action: 'delete_department',
      userId: req.user?.user_id,
      departmentId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
};

// Get departments dropdown list
const dropdown = async (req, res) => {
  try {
    logger.info('Departments dropdown request', {
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    const dropdownOptions = {
      valueField: 'department_id',
      labelField: 'name',
      sortBy: req.query.sortBy || 'name',
      sortOrder: req.query.sortOrder || 'ASC'
    };

    const departments = await departmentCrudService.dropdown(dropdownOptions);

    logger.info('Departments dropdown successful', {
      userId: req.user?.user_id,
      count: departments.length
    });

    res.status(200).json({
      success: true,
      message: 'Departments dropdown retrieved successfully',
      data: departments
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_departments_dropdown',
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments dropdown',
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
  dropdown
};
