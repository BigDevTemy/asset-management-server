const express = require('express');
const router = express.Router();
const { getPermissions } = require('../controllers/permissionsController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get all permissions data
 *     description: Retrieves all permissions data including modules, permissions, and role-based permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions data retrieved successfully
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
 *                   example: Permissions data retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     modules:
 *                       type: object
 *                     permissions:
 *                       type: object
 *                     rolePermissions:
 *                       type: object
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, getPermissions);

module.exports = router;
