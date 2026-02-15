const express = require('express')
const router = express.Router()
const assetCategoryClassesController = require('../controllers/assetCategoryClassesController')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware.authenticate, assetCategoryClassesController.list)
router.get('/:id', authMiddleware.authenticate, assetCategoryClassesController.getById)
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  assetCategoryClassesController.create,
)
router.patch(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  assetCategoryClassesController.update,
)
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  assetCategoryClassesController.remove,
)
router.patch(
  '/:id/assign',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  assetCategoryClassesController.assignCategories,
)

module.exports = router
