const express = require('express');
const router = express.Router();
const assetTransactionsController = require('../controllers/assetTransactionsController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Asset Transactions
 *   description: Asset transaction management operations
 */

/**
 * @swagger
 * /api/asset-transactions:
 *   get:
 *     summary: List all asset transactions with filtering and pagination
 *     tags: [Asset Transactions]
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
 *         description: Number of transactions per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed, cancelled]
 *         description: Filter by transaction status
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [assignment, return, maintenance, retirement]
 *         description: Filter by transaction action
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority level
 *       - in: query
 *         name: asset_id
 *         schema:
 *           type: integer
 *         description: Filter by asset ID
 *       - in: query
 *         name: requested_by
 *         schema:
 *           type: integer
 *         description: Filter by requester user ID
 *       - in: query
 *         name: requested_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions to this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in transaction notes
 *     responses:
 *       200:
 *         description: Asset transactions retrieved successfully
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
 *                         transactions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AssetTransaction'
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
 *                 transactions:
 *                   - transaction_id: 1
 *                     asset_id: 1
 *                     user_id: 1
 *                     transaction_type: "assignment"
 *                     notes: "Assigned to new employee"
 *                     created_at: "2023-01-01T00:00:00.000Z"
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
router.get('/', authMiddleware.authenticate, assetTransactionsController.list);

/**
 * @swagger
 * /api/asset-transactions/statistics:
 *   get:
 *     summary: Get transaction statistics
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Period in days for statistics (default 30 days)
 *     responses:
 *       200:
 *         description: Transaction statistics retrieved successfully
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
 *                         total_transactions:
 *                           type: integer
 *                         pending_transactions:
 *                           type: integer
 *                         completed_transactions:
 *                           type: integer
 *                         rejected_transactions:
 *                           type: integer
 *                         transactions_by_type:
 *                           type: object
 *                         transactions_by_status:
 *                           type: object
 *             example:
 *               success: true
 *               data:
 *                 total_transactions: 150
 *                 pending_transactions: 25
 *                 completed_transactions: 100
 *                 rejected_transactions: 25
 *                 transactions_by_type:
 *                   assignment: 80
 *                   return: 40
 *                   maintenance: 20
 *                   retirement: 10
 *                 transactions_by_status:
 *                   pending: 25
 *                   approved: 50
 *                   completed: 100
 *                   rejected: 25
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
router.get('/statistics', authMiddleware.authenticate, assetTransactionsController.getStatistics);

/**
 * @swagger
 * /api/asset-transactions/pending:
 *   get:
 *     summary: Get pending transactions for approval dashboard
 *     tags: [Asset Transactions]
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
 *         description: Number of transactions per page
 *     responses:
 *       200:
 *         description: Pending transactions retrieved successfully
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
 *                         transactions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AssetTransaction'
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
router.get('/pending', authMiddleware.authenticate, assetTransactionsController.getPendingTransactions);

/**
 * @swagger
 * /api/asset-transactions/user/{userId}:
 *   get:
 *     summary: Get transactions by user
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [requested, received, all]
 *           default: all
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: User transactions retrieved successfully
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
 *                         $ref: '#/components/schemas/AssetTransaction'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
router.get('/user/:userId', authMiddleware.authenticate, assetTransactionsController.getByUser);

/**
 * @swagger
 * /api/asset-transactions/asset/{assetId}:
 *   get:
 *     summary: Get transactions by asset
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset transactions retrieved successfully
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
 *                         $ref: '#/components/schemas/AssetTransaction'
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
router.get('/asset/:assetId', authMiddleware.authenticate, assetTransactionsController.getByAsset);

/**
 * @swagger
 * /api/asset-transactions/{id}:
 *   get:
 *     summary: Get single asset transaction by ID
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Asset transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetTransaction'
 *             example:
 *               success: true
 *               data:
 *                 transaction_id: 1
 *                 asset_id: 1
 *                 user_id: 1
 *                 transaction_type: "assignment"
 *                 notes: "Assigned to new employee"
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
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
/**
 * @swagger
 * /api/asset-transactions/dashboard-stats:
 *   get:
 *     summary: Get user dashboard statistics
 *     description: Retrieves count of user's requests (total, approved, pending, rejected)
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Dashboard statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                       example: 15
 *                     approvedRequests:
 *                       type: integer
 *                       example: 8
 *                     pendingRequests:
 *                       type: integer
 *                       example: 5
 *                     rejectedRequests:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard-stats', authMiddleware.authenticate, assetTransactionsController.getUserDashboardStats);

router.get('/:id', authMiddleware.authenticate, assetTransactionsController.getById);

/**
 * @swagger
 * /api/asset-transactions:
 *   post:
 *     summary: Create new asset transaction
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset_id, transaction_type]
 *             properties:
 *               asset_id:
 *                 type: integer
 *                 example: 1
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               transaction_type:
 *                 type: string
 *                 enum: [assignment, return, maintenance, retirement]
 *                 example: "assignment"
 *               notes:
 *                 type: string
 *                 example: "Assigned to new employee"
 *           example:
 *             asset_id: 1
 *             user_id: 1
 *             transaction_type: "assignment"
 *             notes: "Assigned to new employee"
 *     responses:
 *       201:
 *         description: Asset transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetTransaction'
 *             example:
 *               success: true
 *               message: "Asset transaction created successfully"
 *               data:
 *                 transaction_id: 1
 *                 asset_id: 1
 *                 user_id: 1
 *                 transaction_type: "assignment"
 *                 notes: "Assigned to new employee"
 *                 created_at: "2023-01-01T00:00:00.000Z"
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
router.post('/', authMiddleware.authenticate, authMiddleware.authenticate, assetTransactionsController.create);

/**
 * @swagger
 * /api/asset-transactions/{id}:
 *   patch:
 *     summary: Update asset transaction
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               transaction_type:
 *                 type: string
 *                 enum: [assignment, return, maintenance, retirement]
 *                 example: "return"
 *               notes:
 *                 type: string
 *                 example: "Asset returned from employee"
 *           example:
 *             user_id: 1
 *             transaction_type: "return"
 *             notes: "Asset returned from employee"
 *     responses:
 *       200:
 *         description: Asset transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetTransaction'
 *             example:
 *               success: true
 *               message: "Asset transaction updated successfully"
 *               data:
 *                 transaction_id: 1
 *                 asset_id: 1
 *                 user_id: 1
 *                 transaction_type: "return"
 *                 notes: "Asset returned from employee"
 *                 created_at: "2023-01-01T00:00:00.000Z"
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
 *         description: Transaction not found
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
router.patch('/:id', authMiddleware.authenticate, assetTransactionsController.update);

/**
 * @swagger
 * /api/asset-transactions/{id}:
 *   delete:
 *     summary: Delete asset transaction
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Asset transaction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: "Asset transaction deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
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
router.delete('/:id', authMiddleware.authenticate, assetTransactionsController.remove);

/**
 * @swagger
 * /api/asset-transactions/{id}/status:
 *   patch:
 *     summary: Change asset transaction status
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
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
 *                 enum: [pending, approved, rejected, completed, cancelled]
 *                 example: "approved"
 *               admin_notes:
 *                 type: string
 *                 example: "Transaction approved by admin"
 *           example:
 *             status: "approved"
 *             admin_notes: "Transaction approved by admin"
 *     responses:
 *       200:
 *         description: Asset transaction status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetTransaction'
 *             example:
 *               success: true
 *               message: "Asset transaction status updated successfully"
 *               data:
 *                 transaction_id: 1
 *                 asset_id: 1
 *                 user_id: 1
 *                 transaction_type: "assignment"
 *                 notes: "Assigned to new employee"
 *                 status: "approved"
 *                 created_at: "2023-01-01T00:00:00.000Z"
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
 *         description: Transaction not found
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
router.patch('/:id/status', authMiddleware.authenticate, assetTransactionsController.changeStatus);

/**
 * @swagger
 * /api/asset-transactions/{id}/accept:
 *   patch:
 *     summary: Accept asset transaction
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_notes:
 *                 type: string
 *                 example: "Transaction accepted"
 *           example:
 *             admin_notes: "Transaction accepted"
 *     responses:
 *       200:
 *         description: Asset transaction accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetTransaction'
 *             example:
 *               success: true
 *               message: "Asset transaction accepted successfully"
 *               data:
 *                 transaction_id: 1
 *                 asset_id: 1
 *                 user_id: 1
 *                 transaction_type: "assignment"
 *                 notes: "Assigned to new employee"
 *                 status: "approved"
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
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
router.patch('/:id/accept', authMiddleware.authenticate, assetTransactionsController.acceptTransaction);

/**
 * @swagger
 * /api/asset-transactions/{id}/reject:
 *   patch:
 *     summary: Reject asset transaction
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_notes:
 *                 type: string
 *                 example: "Transaction rejected"
 *               reason:
 *                 type: string
 *                 example: "Asset not available"
 *           example:
 *             admin_notes: "Transaction rejected"
 *             reason: "Asset not available"
 *     responses:
 *       200:
 *         description: Asset transaction rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetTransaction'
 *             example:
 *               success: true
 *               message: "Asset transaction rejected successfully"
 *               data:
 *                 transaction_id: 1
 *                 asset_id: 1
 *                 user_id: 1
 *                 transaction_type: "assignment"
 *                 notes: "Assigned to new employee"
 *                 status: "rejected"
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
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
router.patch('/:id/reject', authMiddleware.authenticate, assetTransactionsController.rejectTransaction);

/**
 * @swagger
 * /api/asset-transactions/{id}/complete:
 *   patch:
 *     summary: Complete asset transaction
 *     tags: [Asset Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_notes:
 *                 type: string
 *                 example: "Transaction completed"
 *           example:
 *             admin_notes: "Transaction completed"
 *     responses:
 *       200:
 *         description: Asset transaction completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetTransaction'
 *             example:
 *               success: true
 *               message: "Asset transaction completed successfully"
 *               data:
 *                 transaction_id: 1
 *                 asset_id: 1
 *                 user_id: 1
 *                 transaction_type: "assignment"
 *                 notes: "Assigned to new employee"
 *                 status: "completed"
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
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
router.patch('/:id/complete', authMiddleware.authenticate, assetTransactionsController.completeTransaction);

module.exports = router;
