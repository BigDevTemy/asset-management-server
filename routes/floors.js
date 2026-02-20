const express = require('express')
const router = express.Router()
const floorsController = require('../controllers/floorsController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware.authenticate, floorsController.list)
router.get('/:id', authMiddleware.authenticate, floorsController.getById)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  floorsController.create,
)
router.patch(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  floorsController.update,
)
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  floorsController.remove,
)

module.exports = router
