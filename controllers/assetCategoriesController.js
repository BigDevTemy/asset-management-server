const { createAssetCategoryCrudService } = require('../services/crudServiceFactory');
const logger = require('../utils/logger');

// Initialize CRUD service for asset categories
const assetCategoryCrudService = createAssetCategoryCrudService();

// List all asset categories with pagination and search
const list = async (req, res) => {
  try {
    logger.info('Asset categories list request', {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const result = await assetCategoryCrudService.list(req.query);
    
    logger.info('Asset categories list successful', {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset categories retrieved successfully',
      ...result
    });
  } catch (error) {
    logger.logError(error, {
      action: 'list_asset_categories',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset categories',
      error: error.message
    });
  }
};

// Get single asset category by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Asset category get by ID request', {
      userId: req.user?.user_id,
      categoryId: id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const category = await assetCategoryCrudService.getById(id);
    
    if (!category) {
      logger.warn('Asset category not found', {
        userId: req.user?.user_id,
        categoryId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset category not found'
      });
    }
    
    logger.info('Asset category retrieved successfully', {
      userId: req.user?.user_id,
      categoryId: id,
      categoryName: category.name
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset category retrieved successfully',
      data: category
    });
  } catch (error) {
    logger.logError(error, {
      action: 'get_asset_category_by_id',
      userId: req.user?.user_id,
      categoryId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset category',
      error: error.message
    });
  }
};

// Create new asset category
const create = async (req, res) => {
  try {
    const categoryData = req.body;
    
    logger.info('Asset category creation request', {
      userId: req.user?.user_id,
      categoryData: {
        name: categoryData.name,
        description: categoryData.description
      },
      ip: req.ip || req.connection.remoteAddress
    });
    
    const category = await assetCategoryCrudService.create(categoryData);
    
    logger.logBusiness('asset_category_created', {
      userId: req.user?.user_id,
      categoryId: category.category_id,
      categoryName: category.name
    });
    
    res.status(201).json({
      success: true,
      message: 'Asset category created successfully',
      data: category
    });
  } catch (error) {
    logger.logError(error, {
      action: 'create_asset_category',
      userId: req.user?.user_id,
      categoryData: req.body,
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
      message: 'Failed to create asset category',
      error: error.message
    });
  }
};

// Update asset category
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info('Asset category update request', {
      userId: req.user?.user_id,
      categoryId: id,
      updateData: Object.keys(updateData),
      ip: req.ip || req.connection.remoteAddress
    });
    
    const category = await assetCategoryCrudService.update(id, updateData);
    
    if (!category) {
      logger.warn('Asset category not found for update', {
        userId: req.user?.user_id,
        categoryId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset category not found'
      });
    }
    
    logger.logBusiness('asset_category_updated', {
      userId: req.user?.user_id,
      categoryId: id,
      categoryName: category.name,
      updatedFields: Object.keys(updateData)
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset category updated successfully',
      data: category
    });
  } catch (error) {
    logger.logError(error, {
      action: 'update_asset_category',
      userId: req.user?.user_id,
      categoryId: req.params.id,
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
      message: 'Failed to update asset category',
      error: error.message
    });
  }
};

// Delete asset category (hard delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Asset category deletion request', {
      userId: req.user?.user_id,
      categoryId: id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    const deleted = await assetCategoryCrudService.delete(id);
    
    if (!deleted) {
      logger.warn('Asset category not found for deletion', {
        userId: req.user?.user_id,
        categoryId: id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        message: 'Asset category not found'
      });
    }
    
    logger.logBusiness('asset_category_deleted', {
      userId: req.user?.user_id,
      categoryId: id
    });
    
    res.status(200).json({
      success: true,
      message: 'Asset category deleted successfully'
    });
  } catch (error) {
    logger.logError(error, {
      action: 'delete_asset_category',
      userId: req.user?.user_id,
      categoryId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete asset category',
      error: error.message
    });
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
