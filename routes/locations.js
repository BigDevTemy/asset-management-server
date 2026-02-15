const express = require('express')
const router = express.Router()
const locationsController = require('../controllers/locationsController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware.authenticate, locationsController.list)
router.get('/:id', authMiddleware.authenticate, locationsController.getById)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  locationsController.create,
)
router.patch(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  locationsController.update,
)
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  locationsController.remove,
)

module.exports = router
