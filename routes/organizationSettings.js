const express = require('express');
const router = express.Router();
const organizationSettingsController = require('../controllers/organizationSettingsController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Organization Settings
 *   description: Organization settings management operations
 */

/**
 * @swagger
 * /api/organization-settings:
 *   get:
 *     summary: Get organization settings
 *     tags: [Organization Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization settings retrieved successfully
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
 *                         organization_name:
 *                           type: string
 *                           example: "Acme Corporation"
 *                         organization_logo:
 *                           type: string
 *                           example: "https://example.com/logo.png"
 *                         organization_address:
 *                           type: string
 *                           example: "123 Main St, City, State 12345"
 *                         organization_phone:
 *                           type: string
 *                           example: "+1-555-123-4567"
 *                         organization_email:
 *                           type: string
 *                           example: "contact@acme.com"
 *                         currency:
 *                           type: string
 *                           example: "USD"
 *                         timezone:
 *                           type: string
 *                           example: "America/New_York"
 *                         date_format:
 *                           type: string
 *                           example: "MM/DD/YYYY"
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *             example:
 *               success: true
 *               data:
 *                 organization_name: "Acme Corporation"
 *                 organization_logo: "https://example.com/logo.png"
 *                 organization_address: "123 Main St, City, State 12345"
 *                 organization_phone: "+1-555-123-4567"
 *                 organization_email: "contact@acme.com"
 *                 currency: "USD"
 *                 timezone: "America/New_York"
 *                 date_format: "MM/DD/YYYY"
 *                 created_at: "2023-01-01T00:00:00.000Z"
 *                 updated_at: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Organization settings not found
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
router.get('/', authMiddleware.authenticate, organizationSettingsController.get);

/**
 * @swagger
 * /api/organization-settings:
 *   post:
 *     summary: Create organization settings
 *     tags: [Organization Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organization_name]
 *             properties:
 *               organization_name:
 *                 type: string
 *                 example: "Acme Corporation"
 *               organization_logo:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *               organization_address:
 *                 type: string
 *                 example: "123 Main St, City, State 12345"
 *               organization_phone:
 *                 type: string
 *                 example: "+1-555-123-4567"
 *               organization_email:
 *                 type: string
 *                 format: email
 *                 example: "contact@acme.com"
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *               date_format:
 *                 type: string
 *                 example: "MM/DD/YYYY"
 *           example:
 *             organization_name: "Acme Corporation"
 *             organization_logo: "https://example.com/logo.png"
 *             organization_address: "123 Main St, City, State 12345"
 *             organization_phone: "+1-555-123-4567"
 *             organization_email: "contact@acme.com"
 *             currency: "USD"
 *             timezone: "America/New_York"
 *             date_format: "MM/DD/YYYY"
 *     responses:
 *       201:
 *         description: Organization settings created successfully
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
 *                         organization_name:
 *                           type: string
 *                         organization_logo:
 *                           type: string
 *                         organization_address:
 *                           type: string
 *                         organization_phone:
 *                           type: string
 *                         organization_email:
 *                           type: string
 *                         currency:
 *                           type: string
 *                         timezone:
 *                           type: string
 *                         date_format:
 *                           type: string
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *             example:
 *               success: true
 *               message: "Organization settings created successfully"
 *               data:
 *                 organization_name: "Acme Corporation"
 *                 organization_logo: "https://example.com/logo.png"
 *                 organization_address: "123 Main St, City, State 12345"
 *                 organization_phone: "+1-555-123-4567"
 *                 organization_email: "contact@acme.com"
 *                 currency: "USD"
 *                 timezone: "America/New_York"
 *                 date_format: "MM/DD/YYYY"
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
router.post('/', authMiddleware.authenticate, organizationSettingsController.create);

/**
 * @swagger
 * /api/organization-settings:
 *   patch:
 *     summary: Update organization settings
 *     tags: [Organization Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organization_name:
 *                 type: string
 *                 example: "Acme Corporation Updated"
 *               organization_logo:
 *                 type: string
 *                 example: "https://example.com/new-logo.png"
 *               organization_address:
 *                 type: string
 *                 example: "456 New St, City, State 12345"
 *               organization_phone:
 *                 type: string
 *                 example: "+1-555-987-6543"
 *               organization_email:
 *                 type: string
 *                 format: email
 *                 example: "newcontact@acme.com"
 *               currency:
 *                 type: string
 *                 example: "EUR"
 *               timezone:
 *                 type: string
 *                 example: "Europe/London"
 *               date_format:
 *                 type: string
 *                 example: "DD/MM/YYYY"
 *           example:
 *             organization_name: "Acme Corporation Updated"
 *             organization_logo: "https://example.com/new-logo.png"
 *             organization_address: "456 New St, City, State 12345"
 *             organization_phone: "+1-555-987-6543"
 *             organization_email: "newcontact@acme.com"
 *             currency: "EUR"
 *             timezone: "Europe/London"
 *             date_format: "DD/MM/YYYY"
 *     responses:
 *       200:
 *         description: Organization settings updated successfully
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
 *                         organization_name:
 *                           type: string
 *                         organization_logo:
 *                           type: string
 *                         organization_address:
 *                           type: string
 *                         organization_phone:
 *                           type: string
 *                         organization_email:
 *                           type: string
 *                         currency:
 *                           type: string
 *                         timezone:
 *                           type: string
 *                         date_format:
 *                           type: string
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *             example:
 *               success: true
 *               message: "Organization settings updated successfully"
 *               data:
 *                 organization_name: "Acme Corporation Updated"
 *                 organization_logo: "https://example.com/new-logo.png"
 *                 organization_address: "456 New St, City, State 12345"
 *                 organization_phone: "+1-555-987-6543"
 *                 organization_email: "newcontact@acme.com"
 *                 currency: "EUR"
 *                 timezone: "Europe/London"
 *                 date_format: "DD/MM/YYYY"
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
 *         description: Organization settings not found
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
router.patch('/', authMiddleware.authenticate, organizationSettingsController.update);

/**
 * @swagger
 * /api/organization-settings/logo:
 *   get:
 *     summary: Get organization logo (public endpoint)
 *     tags: [Organization Settings]
 *     description: Public endpoint to retrieve organization logo without authentication
 *     responses:
 *       200:
 *         description: Organization logo retrieved successfully
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
 *                         logo_url:
 *                           type: string
 *                           nullable: true
 *                           example: "https://example.com/logo.png"
 *                         organization_name:
 *                           type: string
 *                           example: "Acme Corporation"
 *             example:
 *               success: true
 *               data:
 *                 logo_url: "https://example.com/logo.png"
 *                 organization_name: "Acme Corporation"
 *       404:
 *         description: Organization logo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Organization logo not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/logo', organizationSettingsController.getLogo);

module.exports = router;
