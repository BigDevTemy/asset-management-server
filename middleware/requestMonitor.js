'use strict'

const crypto = require('crypto')
const requestLogService = require('../services/requestLogService')

const requestMonitor = (req, res, next) => {
  if (!requestLogService.isEnabled() || requestLogService.shouldSkip(req)) {
    return next()
  }

  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  let responseBody = null
  let responseCaptured = false

  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  const originalJson = res.json.bind(res)
  res.json = function jsonPatched(body) {
    responseCaptured = true
    responseBody = requestLogService.serializePayload(body)
    return originalJson(body)
  }

  const originalSend = res.send.bind(res)
  res.send = function sendPatched(body) {
    if (!responseCaptured) {
      responseCaptured = true
      responseBody = requestLogService.serializePayload(body)
    }

    return originalSend(body)
  }

  res.on('finish', () => {
    const payload = requestLogService.buildRequestLogPayload(req, res, {
      requestId,
      responseBody,
      startTime,
    })

    requestLogService.persistRequestLog(payload)
  })

  next()
}

module.exports = {
  requestMonitor,
}
