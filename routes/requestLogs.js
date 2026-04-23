const express = require('express')
const router = express.Router()
const requestLogsController = require('../controllers/requestLogsController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', requestLogsController.listRequestLogs)

router.get(
  '/settings',
  authMiddleware.authenticate,
  authMiddleware.requireAdminOrITManager,
  requestLogsController.getRequestLogSettings
)

router.patch(
  '/settings',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  requestLogsController.updateRequestLogSettings
)

router.delete(
  '/cleanup',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  requestLogsController.cleanupRequestLogs
)

router.get(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdminOrITManager,
  requestLogsController.getRequestLogById
)

module.exports = router
