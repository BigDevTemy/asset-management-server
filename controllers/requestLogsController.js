'use strict'

const { Op } = require('sequelize')
const { RequestLog, User } = require('../models')
const requestLogService = require('../services/requestLogService')
const logger = require('../utils/logger')

const listRequestLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100)
    const offset = (page - 1) * limit
    const where = {}

    if (req.query.method) {
      where.method = String(req.query.method).toUpperCase()
    }

    if (req.query.statusCode) {
      where.status_code = parseInt(req.query.statusCode, 10)
    }

    if (req.query.userId) {
      where.user_id = parseInt(req.query.userId, 10)
    }

    if (req.query.hasError === 'true') {
      where.has_error = true
    }

    if (req.query.search) {
      where[Op.or] = [
        { url: { [Op.like]: `%${req.query.search}%` } },
        { ip_address: { [Op.like]: `%${req.query.search}%` } },
        { user_agent: { [Op.like]: `%${req.query.search}%` } },
        { request_id: { [Op.like]: `%${req.query.search}%` } },
      ]
    }

    const { count, rows } = await RequestLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'email', 'role'],
          required: false,
        },
      ],
      attributes: [
        'request_log_id',
        'request_id',
        'method',
        'url',
        'status_code',
        'duration_ms',
        'ip_address',
        'user_agent',
        'response_content_type',
        'response_size',
        'user_id',
        'has_error',
        'created_at',
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    res.status(200).json({
      success: true,
      data: {
        items: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    })
  } catch (error) {
    logger.logError(error, {
      action: 'list_request_logs',
      userId: req.user?.user_id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve request logs',
      error: error.message,
    })
  }
}

const getRequestLogById = async (req, res) => {
  try {
    const requestLog = await RequestLog.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'email', 'role'],
          required: false,
        },
      ],
    })

    if (!requestLog) {
      return res.status(404).json({
        success: false,
        message: 'Request log not found',
      })
    }

    res.status(200).json({
      success: true,
      data: requestLog,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'get_request_log',
      requestLogId: req.params.id,
      userId: req.user?.user_id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve request log',
      error: error.message,
    })
  }
}

const cleanupRequestLogs = async (req, res) => {
  try {
    const rawDays = req.query.days
    const deleteAll =
      req.query.all === 'true' ||
      req.query.all === '1' ||
      rawDays === '0'

    const days = deleteAll ? 0 : Math.max(parseInt(rawDays, 10) || 14, 1)
    const where = deleteAll
      ? {}
      : {
          created_at: {
            [Op.lt]: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        }

    const deletedCount = await RequestLog.destroy({ where })

    res.status(200).json({
      success: true,
      message: 'Request logs cleaned up successfully',
      data: {
        deleteAll,
        days,
        deletedCount,
      },
    })
  } catch (error) {
    logger.logError(error, {
      action: 'cleanup_request_logs',
      userId: req.user?.user_id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to clean up request logs',
      error: error.message,
    })
  }
}

const getRequestLogSettings = async (req, res) => {
  res.status(200).json({
    success: true,
    data: requestLogService.getSettings(),
  })
}

const updateRequestLogSettings = async (req, res) => {
  try {
    let settings

    if (req.body.useDefault === true) {
      settings = requestLogService.resetEnabled()
    } else if (typeof req.body.enabled === 'boolean') {
      settings = requestLogService.setEnabled(req.body.enabled)
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either enabled=true/false or useDefault=true',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Request log monitor updated successfully',
      data: settings,
    })
  } catch (error) {
    logger.logError(error, {
      action: 'update_request_log_settings',
      userId: req.user?.user_id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to update request log settings',
      error: error.message,
    })
  }
}

module.exports = {
  cleanupRequestLogs,
  getRequestLogById,
  getRequestLogSettings,
  listRequestLogs,
  updateRequestLogSettings,
}
