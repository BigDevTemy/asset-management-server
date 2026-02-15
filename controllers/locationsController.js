const { createLocationCrudService } = require('../services/crudServiceFactory')
const logger = require('../utils/logger')

const locationCrudService = createLocationCrudService()

// List locations
const list = async (req, res) => {
  try {
    const result = await locationCrudService.list(req.query)

    res.status(200).json({
      success: true,
      message: 'Locations retrieved successfully',
      ...result,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'list_locations',
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve locations',
      error: error.message,
    })
  }
}

// Get location by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params
    const location = await locationCrudService.getById(id)

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Location retrieved successfully',
      data: location,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'get_location_by_id',
      userId: req.user?.user_id,
      locationId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve location',
      error: error.message,
    })
  }
}

// Create location
const create = async (req, res) => {
  try {
    const location = await locationCrudService.create(req.body)

    logger.logBusiness('location_created', {
      userId: req.user?.user_id,
      locationId: location.location_id,
      name: location.name,
    })

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'create_location',
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
      message: 'Failed to create location',
      error: error.message,
    })
  }
}

// Update location
const update = async (req, res) => {
  try {
    const { id } = req.params
    const updated = await locationCrudService.update(id, req.body)

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      })
    }

    logger.logBusiness('location_updated', {
      userId: req.user?.user_id,
      locationId: id,
      updatedFields: Object.keys(req.body || {}),
    })

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: updated,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'update_location',
      userId: req.user?.user_id,
      locationId: req.params.id,
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
      message: 'Failed to update location',
      error: error.message,
    })
  }
}

// Delete location
const remove = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await locationCrudService.delete(id)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      })
    }

    logger.logBusiness('location_deleted', {
      userId: req.user?.user_id,
      locationId: id,
    })

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully',
    })
  } catch (error) {
    logger.logError(error, {
      action: 'delete_location',
      userId: req.user?.user_id,
      locationId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to delete location',
      error: error.message,
    })
  }
}

module.exports = { list, getById, create, update, remove }
