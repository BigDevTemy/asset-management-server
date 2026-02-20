const { createFloorCrudService } = require('../services/crudServiceFactory')
const logger = require('../utils/logger')

const floorCrudService = createFloorCrudService()

const list = async (req, res) => {
  try {
    const result = await floorCrudService.list(req.query)
    res.status(200).json({
      success: true,
      message: 'Floors retrieved successfully',
      ...result,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'list_floors',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve floors',
      error: error.message,
    })
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params
    const record = await floorCrudService.getById(id)
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Floor not found',
      })
    }
    res.status(200).json({
      success: true,
      message: 'Floor retrieved successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'get_floor_by_id',
      userId: req.user?.user_id,
      floorId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve floor',
      error: error.message,
    })
  }
}

const create = async (req, res) => {
  try {
    const record = await floorCrudService.create(req.body)
    logger.logBusiness('floor_created', {
      userId: req.user?.user_id,
      floorId: record.floor_id,
      name: record.name,
      buildingId: record.building_id,
    })
    res.status(201).json({
      success: true,
      message: 'Floor created successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'create_floor',
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
      message: 'Failed to create floor',
      error: error.message,
    })
  }
}

const update = async (req, res) => {
  try {
    const { id } = req.params
    const record = await floorCrudService.update(id, req.body)
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Floor not found',
      })
    }
    logger.logBusiness('floor_updated', {
      userId: req.user?.user_id,
      floorId: id,
      updatedFields: Object.keys(req.body || {}),
    })
    res.status(200).json({
      success: true,
      message: 'Floor updated successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'update_floor',
      userId: req.user?.user_id,
      floorId: req.params.id,
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
      message: 'Failed to update floor',
      error: error.message,
    })
  }
}

const remove = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await floorCrudService.delete(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Floor not found',
      })
    }
    logger.logBusiness('floor_deleted', {
      userId: req.user?.user_id,
      floorId: id,
    })
    res.status(200).json({
      success: true,
      message: 'Floor deleted successfully',
    })
  } catch (error) {
    logger.logError(error, {
      action: 'delete_floor',
      userId: req.user?.user_id,
      floorId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to delete floor',
      error: error.message,
    })
  }
}

module.exports = { list, getById, create, update, remove }
