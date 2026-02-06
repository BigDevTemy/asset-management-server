const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       properties:
 *         totalAssets:
 *           type: integer
 *           description: Total number of assets
 *         totalUsers:
 *           type: integer
 *           description: Total number of users
 *         totalRequests:
 *           type: integer
 *           description: Total number of requests
 *         approvedRequests:
 *           type: integer
 *           description: Number of approved requests
 *         pendingRequests:
 *           type: integer
 *           description: Number of pending requests
 *         rejectedRequests:
 *           type: integer
 *           description: Number of rejected requests
 */

/**
 * @swagger
 * /api/dashboard/it-manager-stats:
 *   get:
 *     summary: Get IT Manager dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: IT Manager dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get('/it-manager-stats', authMiddleware.authenticate, dashboardController.getITManagerStats);

/**
 * @swagger
 * /api/dashboard/admin-stats:
 *   get:
 *     summary: Get Admin dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAssets:
 *                       type: integer
 *                     totalUsers:
 *                       type: integer
 *                     totalDepartments:
 *                       type: integer
 *                     totalRequests:
 *                       type: integer
 *                     approvedRequests:
 *                       type: integer
 *                     pendingRequests:
 *                       type: integer
 *                     rejectedRequests:
 *                       type: integer
 *                     activeUsers:
 *                       type: integer
 *                     inactiveUsers:
 *                       type: integer
 *                     availableAssets:
 *                       type: integer
 *                     assignedAssets:
 *                       type: integer
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Server error
 */
router.get('/admin-stats', authMiddleware.authenticate, dashboardController.getAdminStats);

/**
 * @swagger
 * /api/dashboard/supervisor-stats:
 *   get:
 *     summary: Get Supervisor dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supervisor dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAssets:
 *                       type: integer
 *                       description: Team assets count
 *                     totalUsers:
 *                       type: integer
 *                       description: Team members count
 *                     totalRequests:
 *                       type: integer
 *                       description: Team requests count
 *                     approvedRequests:
 *                       type: integer
 *                       description: Team approved requests count
 *                     pendingRequests:
 *                       type: integer
 *                       description: Team pending requests count
 *       403:
 *         description: Access denied - Supervisor role required
 *       404:
 *         description: User department not found
 *       500:
 *         description: Server error
 */
router.get('/supervisor-stats', authMiddleware.authenticate, dashboardController.getSupervisorStats);

/**
 * @swagger
 * /api/dashboard/general-stats:
 *   get:
 *     summary: Get general dashboard statistics
 *     tags: [Dashboard]
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                     approvedRequests:
 *                       type: integer
 *                     pendingRequests:
 *                       type: integer
 *                     rejectedRequests:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/general-stats', authMiddleware.authenticate, dashboardController.getGeneralStats);

module.exports = router;
