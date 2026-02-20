const { createBuildingCrudService } = require('../services/crudServiceFactory')
const logger = require('../utils/logger')

const buildingCrudService = createBuildingCrudService()

const list = async (req, res) => {
  try {
    const result = await buildingCrudService.list(req.query)
    res.status(200).json({
      success: true,
      message: 'Buildings retrieved successfully',
      ...result,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'list_buildings',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve buildings',
      error: error.message,
    })
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params
    const record = await buildingCrudService.getById(id)
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Building not found',
      })
    }
    res.status(200).json({
      success: true,
      message: 'Building retrieved successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'get_building_by_id',
      userId: req.user?.user_id,
      buildingId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve building',
      error: error.message,
    })
  }
}

const create = async (req, res) => {
  try {
    const record = await buildingCrudService.create(req.body)
    logger.logBusiness('building_created', {
      userId: req.user?.user_id,
      buildingId: record.building_id,
      name: record.name,
    })
    res.status(201).json({
      success: true,
      message: 'Building created successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'create_building',
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
      message: 'Failed to create building',
      error: error.message,
    })
  }
}

const update = async (req, res) => {
  try {
    const { id } = req.params
    const record = await buildingCrudService.update(id, req.body)
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Building not found',
      })
    }
    logger.logBusiness('building_updated', {
      userId: req.user?.user_id,
      buildingId: id,
      updatedFields: Object.keys(req.body || {}),
    })
    res.status(200).json({
      success: true,
      message: 'Building updated successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'update_building',
      userId: req.user?.user_id,
      buildingId: req.params.id,
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
      message: 'Failed to update building',
      error: error.message,
    })
  }
}

const remove = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await buildingCrudService.delete(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Building not found',
      })
    }
    logger.logBusiness('building_deleted', {
      userId: req.user?.user_id,
      buildingId: id,
    })
    res.status(200).json({
      success: true,
      message: 'Building deleted successfully',
    })
  } catch (error) {
    logger.logError(error, {
      action: 'delete_building',
      userId: req.user?.user_id,
      buildingId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to delete building',
      error: error.message,
    })
  }
}

module.exports = { list, getById, create, update, remove }
