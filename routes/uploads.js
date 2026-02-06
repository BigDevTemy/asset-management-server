const express = require('express');
const router = express.Router();
const { uploadImage, getImage, deleteImage, listImages } = require('../controllers/uploadsController');
const authMiddleware= require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Image uploaded successfully"
 *         data:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               example: "image-1703123456789-123456789.png"
 *             originalName:
 *               type: string
 *               example: "profile-picture.png"
 *             size:
 *               type: integer
 *               example: 1024000
 *             mimetype:
 *               type: string
 *               example: "image/png"
 *             url:
 *               type: string
 *               example: "/uploads/image-1703123456789-123456789.png"
 *             uploadedAt:
 *               type: string
 *               format: date-time
 *               example: "2023-12-21T10:30:00.000Z"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 *         error:
 *           type: string
 *           example: "ERROR_CODE"
 */

/**
 * @swagger
 * /api/uploads/:
 *   post:
 *     summary: Upload a single image
 *     description: Upload a PNG or JPG image file. Maximum file size is 5MB.
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: PNG or JPG image file (max 5MB)
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Bad request - invalid file or file too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authMiddleware.authenticate, uploadImage);

/**
 * @swagger
 * /api/uploads:
 *   get:
 *     summary: List all uploaded images
 *     description: Retrieve a list of all uploaded images with their metadata
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Images retrieved successfully
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
 *                   example: "Images retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                             example: "image-1703123456789-123456789.png"
 *                           url:
 *                             type: string
 *                             example: "/uploads/image-1703123456789-123456789.png"
 *                           size:
 *                             type: integer
 *                             example: 1024000
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           modifiedAt:
 *                             type: string
 *                             format: date-time
 *                     count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authMiddleware.authenticate, listImages);

/**
 * @swagger
 * /api/uploads/{filename}:
 *   get:
 *     summary: Get uploaded image
 *     description: Retrieve a specific uploaded image by filename
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The filename of the image to retrieve
 *         example: "image-1703123456789-123456789.png"
 *     responses:
 *       200:
 *         description: Image retrieved successfully
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete uploaded image
 *     description: Delete a specific uploaded image by filename
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The filename of the image to delete
 *         example: "image-1703123456789-123456789.png"
 *     responses:
 *       200:
 *         description: Image deleted successfully
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
 *                   example: "Image deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                       example: "image-1703123456789-123456789.png"
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:filename', authMiddleware.authenticate, getImage);
router.delete('/:filename', authMiddleware.authenticate, deleteImage);

module.exports = router;
