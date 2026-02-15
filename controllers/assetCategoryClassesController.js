const { createAssetCategoryClassCrudService } = require('../services/crudServiceFactory')
const logger = require('../utils/logger')

const assetClassCrudService = createAssetCategoryClassCrudService()

// Assign categories to a class (replace allotted_categories)
const assignCategories = async (req, res) => {
  try {
    const { id } = req.params
    const { category_ids } = req.body || {}

    if (!Array.isArray(category_ids) || category_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'category_ids array is required',
      })
    }

    const record = await assetClassCrudService.update(id, {
      allotted_categories: category_ids,
    })

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Asset category class not found',
      })
    }

    logger.logBusiness('asset_category_class_assigned_categories', {
      userId: req.user?.user_id,
      assetClassId: id,
      categoryIds: category_ids,
    })

    res.status(200).json({
      success: true,
      message: 'Categories assigned to asset category class',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'assign_categories_to_asset_category_class',
      userId: req.user?.user_id,
      assetClassId: req.params.id,
      payload: req.body,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to assign categories to asset category class',
      error: error.message,
    })
  }
}

const list = async (req, res) => {
  try {
    const result = await assetClassCrudService.list(req.query)

    res.status(200).json({
      success: true,
      message: 'Asset category classes retrieved successfully',
      ...result,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'list_asset_category_classes',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset category classes',
      error: error.message,
    })
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params
    const record = await assetClassCrudService.getById(id)

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Asset category class not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Asset category class retrieved successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'get_asset_category_class_by_id',
      userId: req.user?.user_id,
      assetClassId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset category class',
      error: error.message,
    })
  }
}

const create = async (req, res) => {
  try {
    const record = await assetClassCrudService.create(req.body)

    logger.logBusiness('asset_category_class_created', {
      userId: req.user?.user_id,
      assetClassId: record.asset_class_id,
      name: record.name,
    })

    res.status(201).json({
      success: true,
      message: 'Asset category class created successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'create_asset_category_class',
      userId: req.user?.user_id,
      payload: req.body,
      ip: req.ip || req.connection.remoteAddress,
    })

    const statusCode =
      error.message?.toLowerCase().includes('validation') ||
      error.message?.toLowerCase().includes('exists')
        ? 400
        : 500

    res.status(statusCode).json({
      success: false,
      message: 'Failed to create asset category class',
      error: error.message,
    })
  }
}

const update = async (req, res) => {
  try {
    const { id } = req.params
    const record = await assetClassCrudService.update(id, req.body)

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Asset category class not found',
      })
    }

    logger.logBusiness('asset_category_class_updated', {
      userId: req.user?.user_id,
      assetClassId: id,
      updatedFields: Object.keys(req.body || {}),
    })

    res.status(200).json({
      success: true,
      message: 'Asset category class updated successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'update_asset_category_class',
      userId: req.user?.user_id,
      assetClassId: req.params.id,
      payload: req.body,
      ip: req.ip || req.connection.remoteAddress,
    })

    const statusCode =
      error.message?.toLowerCase().includes('validation') ||
      error.message?.toLowerCase().includes('exists')
        ? 400
        : 500

    res.status(statusCode).json({
      success: false,
      message: 'Failed to update asset category class',
      error: error.message,
    })
  }
}

const remove = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await assetClassCrudService.delete(id)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Asset category class not found',
      })
    }

    logger.logBusiness('asset_category_class_deleted', {
      userId: req.user?.user_id,
      assetClassId: id,
    })

    res.status(200).json({
      success: true,
      message: 'Asset category class deleted successfully',
    })
  } catch (error) {
    logger.logError(error, {
      action: 'delete_asset_category_class',
      userId: req.user?.user_id,
      assetClassId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to delete asset category class',
      error: error.message,
    })
  }
}

module.exports = { list, getById, create, update, remove, assignCategories }
