const express = require('express');
const router = express.Router();
const assetCategoriesController = require('../controllers/assetCategoriesController');
const authMiddleware = require('../middleware/authMiddleware');
/**
 * @swagger
 * tags:
 *   name: Asset Categories
 *   description: Asset category management operations
 */

/**
 * @swagger
 * /api/asset-categories:
 *   get:
 *     summary: List all asset categories
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter categories by name or description
 *     responses:
 *       200:
 *         description: Asset categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AssetCategory'
 *             example:
 *               success: true
 *               data:
 *                 - category_id: 1
 *                   name: "Laptops"
 *                   description: "Portable computers and laptops"
 *                   is_active: true
 *                   created_at: "2023-01-01T00:00:00.000Z"
 *                   updated_at: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/',
    authMiddleware.authenticate,
    assetCategoriesController.list);

/**
 * @swagger
 * /api/asset-categories/{id}:
 *   get:
 *     summary: Get single asset category by ID
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset category ID
 *     responses:
 *       200:
 *         description: Asset category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetCategory'
 *             example:
 *               success: true
 *               data:
 *                 category_id: 1
 *                 name: "Laptops"
 *                 description: "Portable computers and laptops"
 *                 is_active: true
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *                 updated_at: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    assetCategoriesController.getById);

/**
 * @swagger
 * /api/asset-categories:
 *   post:
 *     summary: Create new asset category
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Laptops"
 *               description:
 *                 type: string
 *                 example: "Portable computers and laptops"
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *           example:
 *             name: "Laptops"
 *             description: "Portable computers and laptops"
 *             is_active: true
 *     responses:
 *       201:
 *         description: Asset category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetCategory'
 *             example:
 *               success: true
 *               message: "Asset category created successfully"
 *               data:
 *                 category_id: 1
 *                 name: "Laptops"
 *                 description: "Portable computers and laptops"
 *                 is_active: true
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *                 updated_at: "2023-01-01T00:00:00.000Z"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    assetCategoriesController.create);

/**
 * @swagger
 * /api/asset-categories/{id}:
 *   patch:
 *     summary: Update asset category
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Laptops Updated"
 *               description:
 *                 type: string
 *                 example: "Portable computers and laptops - Updated"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *           example:
 *             name: "Laptops Updated"
 *             description: "Portable computers and laptops - Updated"
 *             is_active: true
 *     responses:
 *       200:
 *         description: Asset category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetCategory'
 *             example:
 *               success: true
 *               message: "Asset category updated successfully"
 *               data:
 *                 category_id: 1
 *                 name: "Laptops Updated"
 *                 description: "Portable computers and laptops - Updated"
 *                 is_active: true
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *                 updated_at: "2023-01-01T00:00:00.000Z"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    assetCategoriesController.update);

/**
 * @swagger
 * /api/asset-categories/{id}:
 *   delete:
 *     summary: Delete asset category
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset category ID
 *     responses:
 *       200:
 *         description: Asset category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "Asset category deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    assetCategoriesController.remove);

module.exports = router;
