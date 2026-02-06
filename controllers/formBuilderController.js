'use strict'

const FormBuilderService = require('../services/formBuilderService')
const logger = require('../utils/logger')

const formBuilderService = new FormBuilderService()

const list = async (req, res) => {
  try {
    const result = await formBuilderService.list(req.query)

    res.status(200).json({
      success: true,
      message: 'Forms retrieved successfully',
      ...result,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'list_forms',
      userId: req.user?.user_id,
      query: req.query,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve forms',
      error: error.message,
    })
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params
    const form = await formBuilderService.getById(id)

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Form retrieved successfully',
      data: form,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'get_form',
      userId: req.user?.user_id,
      formId: req.params.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve form',
      error: error.message,
    })
  }
}

const create = async (req, res) => {
  try {
    const form = await formBuilderService.create(req.body)

    res.status(201).json({
      success: true,
      message: 'Form created successfully',
      data: form,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'create_form',
      userId: req.user?.user_id,
      bodyKeys: Object.keys(req.body || {}),
    })

    res.status(400).json({
      success: false,
      message: 'Failed to create form',
      error: error.message,
    })
  }
}

const update = async (req, res) => {
  try {
    const { id } = req.params
    const form = await formBuilderService.update(id, req.body)

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Form updated successfully',
      data: form,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'update_form',
      userId: req.user?.user_id,
      formId: req.params.id,
      bodyKeys: Object.keys(req.body || {}),
    })

    res.status(400).json({
      success: false,
      message: 'Failed to update form',
      error: error.message,
    })
  }
}

const remove = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await formBuilderService.delete(id)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Form deleted successfully',
    })
  } catch (error) {
    logger.logError(error, {
      action: 'delete_form',
      userId: req.user?.user_id,
      formId: req.params.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to delete form',
      error: error.message,
    })
  }
}

const activate = async (req, res) => {
  try {
    const { id } = req.params
    const form = await formBuilderService.setActive(id)

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Form activated successfully',
      data: form,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'activate_form',
      userId: req.user?.user_id,
      formId: req.params.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to activate form',
      error: error.message,
    })
  }
}

const deactivate = async (req, res) => {
  try {
    const { id } = req.params
    const form = await formBuilderService.deactivate(id)

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Form deactivated successfully',
      data: form,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'deactivate_form',
      userId: req.user?.user_id,
      formId: req.params.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to deactivate form',
      error: error.message,
    })
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  activate,
  deactivate,
}
