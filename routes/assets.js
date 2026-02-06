const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assetsController');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

/**
 * @swagger
 * tags:
 *   name: Assets
 *   description: Asset management operations
 */


/**
 * @swagger
 * /api/assets/my-assets:
 *   get:
 *     summary: Get assets assigned to the current user
 *     tags: [Assets]
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
 *         description: Number of assets per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, assigned, maintenance, retired]
 *         description: Filter by asset status
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter by asset category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by asset name or tag
 *     responses:
 *       200:
 *         description: User's assigned assets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         assets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Asset'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             pages:
 *                               type: integer
 *             example:
 *               success: true
 *               data:
 *                 assets:
 *                   - asset_id: 1
 *                     asset_tag: "AST001"
 *                     name: "Dell Laptop"
 *                     description: "Dell Latitude 5520"
 *                     category_id: 1
 *                     status: "assigned"
 *                     assigned_to: 1
 *                     purchase_date: "2023-01-15"
 *                     purchase_price: 1200.00
 *                     location: "Office Building A"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 5
 *                   pages: 1
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
router.get('/my-assets', authMiddleware.authenticate, requirePermission('assets', 'list_own'), assetsController.myAssets);

/**
 * @swagger
 * /api/assets/{id}/barcode:
 *   get:
 *     summary: Get barcode for an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [url, image]
 *           default: url
 *         description: Output format (url returns JSON with barcode URL, image returns PNG file directly)
 *     responses:
 *       200:
 *         description: Barcode retrieved successfully
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *             description: Returned when format=image
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         asset_id:
 *                           type: integer
 *                           example: 25
 *                         asset_tag:
 *                           type: string
 *                           example: "LAPTOP-001"
 *                         barcode_url:
 *                           type: string
 *                           description: Full URL to the barcode image
 *                           example: "http://localhost:3000/barcodes/barcode_25.png"
 *                         barcode_path:
 *                           type: string
 *                           description: Relative path to the barcode image
 *                           example: "/barcodes/barcode_25.png"
 *             description: Returned when format=url (default)
 *             example:
 *               success: true
 *               message: "Barcode retrieved successfully"
 *               data:
 *                 asset_id: 25
 *                 asset_tag: "LAPTOP-001"
 *                 barcode_url: "http://localhost:3000/barcodes/barcode_25.png"
 *                 barcode_path: "/barcodes/barcode_25.png"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset not found or barcode not generated
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
router.get('/:id/barcode', authMiddleware.authenticate, assetsController.getBarcode);

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: List all assets
 *     tags: [Assets]
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
 *         description: Number of assets per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, assigned, maintenance, retired]
 *         description: Filter by asset status
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter by asset category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by asset name or tag
 *     responses:
 *       200:
 *         description: Assets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         assets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Asset'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             pages:
 *                               type: integer
 *             example:
 *               success: true
 *               data:
 *                 assets:
 *                   - asset_id: 1
 *                     asset_tag: "AST001"
 *                     name: "Dell Laptop"
 *                     description: "Dell Latitude 5520"
 *                     category_id: 1
 *                     status: "available"
 *                     assigned_to: null
 *                     purchase_date: "2023-01-15"
 *                     purchase_price: 1200.00
 *                     location: "Office Building A"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 25
 *                   pages: 3
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
router.get('/', authMiddleware.authenticate, assetsController.list);

/**
 * @swagger
 * /api/assets/{id}:
 *   get:
 *     summary: Get single asset by ID
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Asset'
 *             example:
 *               success: true
 *               data:
 *                 asset_id: 1
 *                 asset_tag: "AST001"
 *                 name: "Dell Laptop"
 *                 description: "Dell Latitude 5520"
 *                 category_id: 1
 *                 status: "available"
 *                 assigned_to: null
 *                 purchase_date: "2023-01-15"
 *                 purchase_price: 1200.00
 *                 location: "Office Building A"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset not found
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
router.get('/:id', authMiddleware.authenticate, assetsController.getById);

/**
 * @swagger
 * /api/assets:
 *   post:
 *     summary: Create new asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset_tag, name, category_id, purchase_date, purchase_price]
 *             properties:
 *               asset_tag:
 *                 type: string
 *                 example: "AST001"
 *               name:
 *                 type: string
 *                 example: "Dell Laptop"
 *               description:
 *                 type: string
 *                 example: "Dell Latitude 5520 Laptop"
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [available, assigned, maintenance, retired]
 *                 default: available
 *                 example: "available"
 *               assigned_to:
 *                 type: integer
 *                 example: 1
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 example: "2023-01-15"
 *               purchase_price:
 *                 type: number
 *                 format: float
 *                 example: 1200.00
 *               location:
 *                 type: string
 *                 example: "Office Building A, Floor 2"
 *           example:
 *             asset_tag: "AST001"
 *             name: "Dell Laptop"
 *             description: "Dell Latitude 5520 Laptop"
 *             category_id: 1
 *             status: "available"
 *             purchase_date: "2023-01-15"
 *             purchase_price: 1200.00
 *             location: "Office Building A, Floor 2"
 *     responses:
 *       201:
 *         description: Asset created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Asset'
 *             example:
 *               success: true
 *               message: "Asset created successfully"
 *               data:
 *                 asset_id: 1
 *                 asset_tag: "AST001"
 *                 name: "Dell Laptop"
 *                 description: "Dell Latitude 5520 Laptop"
 *                 category_id: 1
 *                 status: "available"
 *                 assigned_to: null
 *                 purchase_date: "2023-01-15"
 *                 purchase_price: 1200.00
 *                 location: "Office Building A, Floor 2"
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
router.post('/', authMiddleware.authenticate, assetsController.create);

/**
 * @swagger
 * /api/assets/{id}:
 *   patch:
 *     summary: Update asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               asset_tag:
 *                 type: string
 *                 example: "AST001"
 *               name:
 *                 type: string
 *                 example: "Dell Laptop"
 *               description:
 *                 type: string
 *                 example: "Dell Latitude 5520 Laptop"
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [available, assigned, maintenance, retired]
 *                 example: "assigned"
 *               assigned_to:
 *                 type: integer
 *                 example: 1
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 example: "2023-01-15"
 *               purchase_price:
 *                 type: number
 *                 format: float
 *                 example: 1200.00
 *               location:
 *                 type: string
 *                 example: "Office Building A, Floor 2"
 *           example:
 *             name: "Dell Laptop Updated"
 *             description: "Dell Latitude 5520 Laptop - Updated"
 *             status: "assigned"
 *             assigned_to: 1
 *             location: "Office Building B, Floor 3"
 *     responses:
 *       200:
 *         description: Asset updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Asset'
 *             example:
 *               success: true
 *               message: "Asset updated successfully"
 *               data:
 *                 asset_id: 1
 *                 asset_tag: "AST001"
 *                 name: "Dell Laptop Updated"
 *                 description: "Dell Latitude 5520 Laptop - Updated"
 *                 category_id: 1
 *                 status: "assigned"
 *                 assigned_to: 1
 *                 purchase_date: "2023-01-15"
 *                 purchase_price: 1200.00
 *                 location: "Office Building B, Floor 3"
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
 *         description: Asset not found
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
router.patch('/:id', authMiddleware.authenticate, assetsController.update);

/**
 * @swagger
 * /api/assets/{id}:
 *   delete:
 *     summary: Delete asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "Asset deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset not found
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
router.delete('/:id', authMiddleware.authenticate, assetsController.remove);

/**
 * @swagger
 * /api/assets/{id}/status:
 *   patch:
 *     summary: Change asset status
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, assigned, maintenance, retired]
 *                 example: "maintenance"
 *               assigned_to:
 *                 type: integer
 *                 example: 1
 *               notes:
 *                 type: string
 *                 example: "Asset sent for maintenance"
 *           example:
 *             status: "maintenance"
 *             notes: "Asset sent for maintenance"
 *     responses:
 *       200:
 *         description: Asset status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Asset'
 *             example:
 *               success: true
 *               message: "Asset status updated successfully"
 *               data:
 *                 asset_id: 1
 *                 asset_tag: "AST001"
 *                 name: "Dell Laptop"
 *                 description: "Dell Latitude 5520 Laptop"
 *                 category_id: 1
 *                 status: "maintenance"
 *                 assigned_to: null
 *                 purchase_date: "2023-01-15"
 *                 purchase_price: 1200.00
 *                 location: "Office Building A, Floor 2"
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
 *         description: Asset not found
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
router.patch('/:id/status', authMiddleware.authenticate, assetsController.changeStatus);

module.exports = router;
