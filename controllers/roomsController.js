const { createRoomCrudService } = require('../services/crudServiceFactory')
const logger = require('../utils/logger')

const roomCrudService = createRoomCrudService()

const list = async (req, res) => {
  try {
    const result = await roomCrudService.list(req.query)
    res.status(200).json({
      success: true,
      message: 'Rooms retrieved successfully',
      ...result,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'list_rooms',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve rooms',
      error: error.message,
    })
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params
    const record = await roomCrudService.getById(id)
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      })
    }
    res.status(200).json({
      success: true,
      message: 'Room retrieved successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'get_room_by_id',
      userId: req.user?.user_id,
      roomId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve room',
      error: error.message,
    })
  }
}

const create = async (req, res) => {
  try {
    const record = await roomCrudService.create(req.body)
    logger.logBusiness('room_created', {
      userId: req.user?.user_id,
      roomId: record.room_id,
      name: record.name,
      floorId: record.floor_id,
    })
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'create_room',
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
      message: 'Failed to create room',
      error: error.message,
    })
  }
}

const update = async (req, res) => {
  try {
    const { id } = req.params
    const record = await roomCrudService.update(id, req.body)
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      })
    }
    logger.logBusiness('room_updated', {
      userId: req.user?.user_id,
      roomId: id,
      updatedFields: Object.keys(req.body || {}),
    })
    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: record,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'update_room',
      userId: req.user?.user_id,
      roomId: req.params.id,
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
      message: 'Failed to update room',
      error: error.message,
    })
  }
}

const remove = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await roomCrudService.delete(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      })
    }
    logger.logBusiness('room_deleted', {
      userId: req.user?.user_id,
      roomId: id,
    })
    res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
    })
  } catch (error) {
    logger.logError(error, {
      action: 'delete_room',
      userId: req.user?.user_id,
      roomId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to delete room',
      error: error.message,
    })
  }
}

module.exports = { list, getById, create, update, remove }
