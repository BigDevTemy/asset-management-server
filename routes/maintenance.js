const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenanceController");
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Maintenance schedule and log management operations
 */

// Maintenance Schedules Routes

/**
 * @swagger
 * /api/maintenance/schedules:
 *   get:
 *     summary: List all maintenance schedules
 *     tags: [Maintenance]
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
 *         description: Number of schedules per page
 *       - in: query
 *         name: asset_id
 *         schema:
 *           type: integer
 *         description: Filter by asset ID
 *       - in: query
 *         name: maintenance_type
 *         schema:
 *           type: string
 *           enum: [preventive, inspection, calibration, cleaning, other]
 *         description: Filter by maintenance type
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *     responses:
 *       200:
 *         description: Maintenance schedules retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/schedules",
  authMiddleware.authenticate,
  maintenanceController.listSchedules
);

/**
 * @swagger
 * /api/maintenance/schedules/{id}:
 *   get:
 *     summary: Get single maintenance schedule by ID
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Maintenance schedule retrieved successfully
 *       404:
 *         description: Schedule not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/schedules/:id",
  authMiddleware.authenticate,
  maintenanceController.getScheduleById
);

/**
 * @swagger
 * /api/maintenance/schedules:
 *   post:
 *     summary: Create new maintenance schedule
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset_id, maintenance_type, title, frequency_days, next_maintenance_date]
 *             properties:
 *               asset_id:
 *                 type: integer
 *               maintenance_type:
 *                 type: string
 *                 enum: [preventive, inspection, calibration, cleaning, other]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               frequency_days:
 *                 type: integer
 *               next_maintenance_date:
 *                 type: string
 *                 format: date
 *               assigned_to:
 *                 type: integer
 *               estimated_cost:
 *                 type: number
 *     responses:
 *       201:
 *         description: Maintenance schedule created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/schedules",
  authMiddleware.authenticate,
  maintenanceController.createSchedule
);

/**
 * @swagger
 * /api/maintenance/schedules/{id}:
 *   patch:
 *     summary: Update maintenance schedule
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               asset_id:
 *                 type: integer
 *               maintenance_type:
 *                 type: string
 *               title:
 *                 type: string
 *               frequency_days:
 *                 type: integer
 *               next_maintenance_date:
 *                 type: string
 *                 format: date
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Maintenance schedule updated successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Schedule not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/schedules/:id",
  authMiddleware.authenticate,
  maintenanceController.updateSchedule
);

/**
 * @swagger
 * /api/maintenance/schedules/{id}:
 *   delete:
 *     summary: Delete maintenance schedule
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Maintenance schedule deleted successfully
 *       404:
 *         description: Schedule not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/schedules/:id",
  authMiddleware.authenticate,
  maintenanceController.deleteSchedule
);

// Maintenance Logs Routes

/**
 * @swagger
 * /api/maintenance/logs:
 *   get:
 *     summary: List all maintenance logs
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: asset_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: maintenance_type
 *         schema:
 *           type: string
 *           enum: [preventive, corrective, inspection, calibration, cleaning, other]
 *       - in: query
 *         name: performed_by
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/logs",
  authMiddleware.authenticate,
  maintenanceController.listLogs
);

/**
 * @swagger
 * /api/maintenance/logs/{id}:
 *   get:
 *     summary: Get single maintenance log by ID
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Log ID
 *     responses:
 *       200:
 *         description: Maintenance log retrieved successfully
 *       404:
 *         description: Log not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/logs/:id",
  authMiddleware.authenticate,
  maintenanceController.getLogById
);

/**
 * @swagger
 * /api/maintenance/logs:
 *   post:
 *     summary: Create new maintenance log
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asset_id, maintenance_type, title, performed_by, performed_date]
 *             properties:
 *               asset_id:
 *                 type: integer
 *               schedule_id:
 *                 type: integer
 *               maintenance_type:
 *                 type: string
 *                 enum: [preventive, corrective, inspection, calibration, cleaning, other]
 *               title:
 *                 type: string
 *               performed_by:
 *                 type: integer
 *               performed_date:
 *                 type: string
 *                 format: date
 *               cost:
 *                 type: number
 *               downtime_hours:
 *                 type: number
 *     responses:
 *       201:
 *         description: Maintenance log created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/logs",
  authMiddleware.authenticate,
  maintenanceController.createLog
);

/**
 * @swagger
 * /api/maintenance/logs/{id}:
 *   patch:
 *     summary: Update maintenance log
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Log ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               cost:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Maintenance log updated successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Log not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/logs/:id",
  authMiddleware.authenticate,
  maintenanceController.updateLog
);

/**
 * @swagger
 * /api/maintenance/logs/{id}:
 *   delete:
 *     summary: Delete maintenance log
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Log ID
 *     responses:
 *       200:
 *         description: Maintenance log deleted successfully
 *       404:
 *         description: Log not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/logs/:id",
  authMiddleware.authenticate,
  maintenanceController.deleteLog
);

// Additional Maintenance Routes

/**
 * @swagger
 * /api/maintenance/upcoming/{assetId}:
 *   get:
 *     summary: Get upcoming maintenance for an asset
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days ahead to check
 *     responses:
 *       200:
 *         description: Upcoming maintenance retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/upcoming/:assetId",
  authMiddleware.authenticate,
  maintenanceController.getUpcomingMaintenance
);

/**
 * @swagger
 * /api/maintenance/asset/{assetId}/history:
 *   get:
 *     summary: Get maintenance history for an asset
 *     tags: [Maintenance]
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
 *         description: Maintenance history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/asset/:assetId/history",
  authMiddleware.authenticate,
  maintenanceController.getAssetMaintenanceHistory
);

module.exports = router;
