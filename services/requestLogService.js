'use strict'

const { RequestLog } = require('../models')
const logger = require('../utils/logger')

const MAX_BODY_LENGTH = Number(process.env.REQUEST_LOG_MAX_BODY_LENGTH || 20000)
const SKIPPED_PATH_PREFIXES = ['/health', '/api/request-logs']
const SENSITIVE_KEYS = new Set([
  'password',
  'new_password',
  'current_password',
  'confirm_password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api_key',
  'secret',
  'client_secret',
])

let runtimeEnabledOverride = null

const getDefaultEnabled = () =>
  process.env.REQUEST_LOG_MONITOR === 'true' ||
  process.env.NODE_ENV === 'development'

const isEnabled = () =>
  runtimeEnabledOverride === null ? getDefaultEnabled() : runtimeEnabledOverride

const shouldSkip = (req) =>
  SKIPPED_PATH_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))

const getSettings = () => ({
  enabled: isEnabled(),
  defaultEnabled: getDefaultEnabled(),
  hasRuntimeOverride: runtimeEnabledOverride !== null,
})

const setEnabled = (enabled) => {
  runtimeEnabledOverride = Boolean(enabled)
  return getSettings()
}

const resetEnabled = () => {
  runtimeEnabledOverride = null
  return getSettings()
}

const truncateString = (value, maxLength = MAX_BODY_LENGTH) => {
  if (typeof value !== 'string') {
    return value
  }

  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}...[truncated ${value.length - maxLength} chars]`
}

const redactValue = (value, keyName = '') => {
  if (value == null) {
    return value
  }

  if (SENSITIVE_KEYS.has(String(keyName).toLowerCase())) {
    return '[REDACTED]'
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item))
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`
  }

  if (typeof value === 'string') {
    return truncateString(value)
  }

  if (typeof value === 'object') {
    const sanitized = {}

    for (const [key, nestedValue] of Object.entries(value)) {
      sanitized[key] = redactValue(nestedValue, key)
    }

    return sanitized
  }

  return value
}

const sanitizeHeaders = (headers = {}) => {
  const sanitized = {}

  for (const [key, value] of Object.entries(headers)) {
    sanitized[key] = redactValue(value, key)
  }

  return sanitized
}

const serializePayload = (payload) => {
  if (payload == null) {
    return null
  }

  if (Buffer.isBuffer(payload)) {
    return `[Buffer ${payload.length} bytes]`
  }

  if (typeof payload === 'string') {
    return truncateString(payload)
  }

  if (typeof payload === 'object') {
    try {
      return truncateString(JSON.stringify(redactValue(payload)))
    } catch (error) {
      return `[Unserializable payload: ${error.message}]`
    }
  }

  return truncateString(String(payload))
}

const getUserId = (req) => req.user?.user_id || req.user?.id || null

const buildRequestLogPayload = (req, res, options = {}) => ({
  request_id: options.requestId,
  method: req.method,
  url: req.originalUrl,
  path: req.path,
  status_code: res.statusCode,
  duration_ms: Date.now() - options.startTime,
  ip_address: req.ip || req.connection?.remoteAddress || null,
  user_agent: req.get('User-Agent') || null,
  referrer: req.get('Referer') || req.get('Referrer') || null,
  request_headers: sanitizeHeaders(req.headers),
  request_query: redactValue(req.query),
  request_params: redactValue(req.params),
  request_body: serializePayload(req.body),
  response_headers: sanitizeHeaders(res.getHeaders ? res.getHeaders() : {}),
  response_body: options.responseBody || null,
  response_content_type: res.getHeader ? res.getHeader('content-type') || null : null,
  response_size: res.getHeader ? Number(res.getHeader('content-length')) || null : null,
  user_id: getUserId(req),
  has_error: Boolean(res.locals?.requestLogError) || res.statusCode >= 500,
  error_message: res.locals?.requestLogError?.message || null,
})

const persistRequestLog = async (payload) => {
  try {
    await RequestLog.create(payload)
  } catch (error) {
    logger.error('Failed to persist request log', {
      message: error.message,
      requestId: payload.request_id,
      url: payload.url,
    })
  }
}

module.exports = {
  buildRequestLogPayload,
  getSettings,
  getUserId,
  isEnabled,
  persistRequestLog,
  resetEnabled,
  serializePayload,
  setEnabled,
  shouldSkip,
}
