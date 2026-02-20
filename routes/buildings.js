const express = require('express')
const router = express.Router()
const buildingsController = require('../controllers/buildingsController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware.authenticate, buildingsController.list)
router.get('/:id', authMiddleware.authenticate, buildingsController.getById)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  buildingsController.create,
)
router.patch(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  buildingsController.update,
)
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  buildingsController.remove,
)

module.exports = router
