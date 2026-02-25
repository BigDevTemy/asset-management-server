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
 * /api/assets/lookup:
 *   get:
 *     summary: Dynamic lookup for dropdown/table-backed form fields
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: Source table name (e.g., asset_categories)
 *       - in: query
 *         name: label_key
 *         required: true
 *         schema:
 *           type: string
 *         description: Column to use as display label (e.g., name)
 *       - in: query
 *         name: value_key
 *         required: true
 *         schema:
 *           type: string
 *         description: Column to use as option value (e.g., category_id)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional substring filter applied to the label column
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Max rows to return
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort direction by label
 *     responses:
 *       200:
 *         description: Lookup options retrieved
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
 *                         type: object
 *                         properties:
 *                           value:
 *                             type: string
 *                           label:
 *                             type: string
 *             example:
 *               success: true
 *               data:
 *                 - value: 1
 *                   label: "Laptops"
 *                 - value: 2
 *                   label: "Printers"
 *       400:
 *         description: Validation error (missing/invalid identifiers)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/lookup', authMiddleware.authenticate, assetsController.lookup);

/**
 * @swagger
 * /api/assets/barcode/{code}:
 *   get:
 *     summary: Get asset by barcode text (ASSET-######)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Barcode text (e.g., ASSET-000052)
 *     responses:
 *       200:
 *         description: Asset retrieved successfully
 *       404:
 *         description: Asset not found
 */
router.get('/barcode/:code', authMiddleware.authenticate, assetsController.getByBarcode);

/**
 * @swagger
 * /api/assets/codes:
 *   post:
 *     summary: Generate a barcode (from text) and a QR code (from JSON payload)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barcode_text, qr_data]
 *             properties:
 *               barcode_text:
 *                 type: string
 *                 description: Plain text to encode as a barcode
 *                 example: "ASSET-123456"
 *               qr_data:
 *                 type: object
 *                 description: JSON object to embed inside the QR code
 *                 example:
 *                   asset_id: 123
 *                   asset_tag: "ASSET-123456"
 *                   note: "Ad-hoc QR payload"
 *               qr_logo_path:
 *                 type: string
 *                 description: Optional path/URL to a logo image to place at the center of the QR code
 *                 example: "./public/images/logo.png"
 *               qr_logo_scale:
 *                 type: number
 *                 description: Optional logo scale as a fraction of QR width (defaults to 0.2, clamps 0.08-0.35)
 *                 example: 0.2
 *     responses:
 *       201:
 *         description: Barcode and QR code generated
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
 *                         barcode_url:
 *                           type: string
 *                         barcode_path:
 *                           type: string
 *                         qr_code_url:
 *                           type: string
 *                         qr_code_path:
 *                           type: string
 *             example:
 *               success: true
 *               message: "Barcode and QR code generated successfully"
 *               data:
 *                 barcode_url: "https://api.example.com/barcodes/custom/custom_barcode_123.png"
 *                 barcode_path: "/barcodes/custom/custom_barcode_123.png"
 *                 qr_code_url: "https://api.example.com/qrcodes/custom/custom_qrcode_123.png"
 *                 qr_code_path: "/qrcodes/custom/custom_qrcode_123.png"
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/codes', authMiddleware.authenticate, assetsController.generateCodes);

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

router.get('/created-by/:userId', authMiddleware.authenticate, requirePermission('assets', 'list_own'), assetsController.listByCreator);

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
router.patch('/:id/approval-status', authMiddleware.authenticate, requirePermission('assets', 'update'), assetsController.changeApprovalStatus);

module.exports = router;
