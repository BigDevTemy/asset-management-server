const express = require("express");
const router = express.Router();
const notificationsController = require("../controllers/notificationsController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification operations
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications (placeholder for future in-app notifications)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                         notifications:
 *                           type: array
 *                           items:
 *                             type: object
 *                         unreadCount:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authMiddleware.authenticate,
  notificationsController.getNotifications
);

module.exports = router;
