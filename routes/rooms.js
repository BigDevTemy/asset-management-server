const express = require('express')
const router = express.Router()
const roomsController = require('../controllers/roomsController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware.authenticate, roomsController.list)
router.get('/:id', authMiddleware.authenticate, roomsController.getById)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  roomsController.create,
)
router.patch(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  roomsController.update,
)
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  roomsController.remove,
)

module.exports = router
