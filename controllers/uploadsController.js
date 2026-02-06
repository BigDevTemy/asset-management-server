const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    // Check for specific image types (PNG, JPG, JPEG)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG images are allowed'), false);
    }
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

/**
 * Upload single image
 * POST /api/uploads/image
 */
const uploadImage = async (req, res) => {
  try {
    // Use multer middleware
    upload.single('image')(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', {
          error: err.message,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });

        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size too large. Maximum size is 5MB.',
              error: 'FILE_TOO_LARGE'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              message: 'Too many files. Only one file is allowed.',
              error: 'TOO_MANY_FILES'
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message,
          error: 'UPLOAD_ERROR'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided. Please select a PNG or JPG image.',
          error: 'NO_FILE'
        });
      }

      // Log successful upload
      logger.info('Image uploaded successfully', {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        ip: req.ip || req.connection.remoteAddress
      });

      // Return success response with file information
      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/uploads/${req.file.filename}`,
          uploadedAt: new Date().toISOString()
        }
      });
    });
  } catch (error) {
    logger.error('Unexpected error in uploadImage:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error during file upload',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get uploaded image
 * GET /api/uploads/:filename
 */
const getImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../public/uploads', filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        error: 'FILE_NOT_FOUND'
      });
    }

    // Check if it's an image file
    const ext = path.extname(filename).toLowerCase();
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg'];

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        error: 'INVALID_FILE_TYPE'
      });
    }

    // Send the image file
    const protocol = req.protocol;
    const host = req.get('host');
    res.json({
      success: true,
      message: 'Image URL generated successfully',
      data: {
        url: `${protocol}://${host}/uploads/${req.params.filename}`
      }
    });
  } catch (error) {
    logger.error('Error serving image:', {
      error: error.message,
      filename: req.params.filename,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Error serving image',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Delete uploaded image
 * DELETE /api/uploads/:filename
 */
const deleteImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../public/uploads', filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        error: 'FILE_NOT_FOUND'
      });
    }

    // Delete the file
    fs.unlinkSync(imagePath);

    logger.info('Image deleted successfully', {
      filename: filename,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        filename: filename,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error deleting image:', {
      error: error.message,
      filename: req.params.filename,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * List uploaded images
 * GET /api/uploads
 */
const listImages = async (req, res) => {
  try {
    const uploadsPath = path.join(__dirname, '../public/uploads');

    // Check if uploads directory exists
    if (!fs.existsSync(uploadsPath)) {
      return res.status(200).json({
        success: true,
        message: 'No images found',
        data: {
          images: [],
          count: 0
        }
      });
    }

    // Read directory contents
    const files = fs.readdirSync(uploadsPath);

    // Filter only image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg'].includes(ext);
    });

    // Get file information
    const images = imageFiles.map(filename => {
      const filePath = path.join(uploadsPath, filename);
      const stats = fs.statSync(filePath);

      return {
        filename: filename,
        url: `/uploads/${filename}`,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    });

    res.status(200).json({
      success: true,
      message: 'Images retrieved successfully',
      data: {
        images: images,
        count: images.length
      }
    });
  } catch (error) {
    logger.error('Error listing images:', {
      error: error.message,
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
      success: false,
      message: 'Error retrieving images',
      error: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  uploadImage,
  getImage,
  deleteImage,
  listImages,
  upload // Export multer instance for use in routes
};
