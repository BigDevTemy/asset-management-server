"use strict";

const DocumentService = require("../services/documentService");
const {
  assetDocumentValidationSchemas,
  validateData,
} = require("../utils/validationSchemas");
const logger = require("../utils/logger");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer storage for documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../public/documents");

    // Ensure documents directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, "doc-" + uniqueSuffix + fileExtension);
  },
});

// File filter for document validation
const fileFilter = (req, file, cb) => {
  // Allow common document types
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "text/plain",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed types: PDF, Word, Excel, Images, Text"
      ),
      false
    );
  }
};

// Configure multer for documents
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only one file at a time
  },
});

// Initialize document service
const documentService = new DocumentService();

// List all documents
const listDocuments = async (req, res) => {
  try {
    logger.info("Documents list request", {
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    const result = await documentService.listDocuments(req.query);

    logger.info("Documents list successful", {
      userId: req.user?.user_id,
      count: result.data?.length || 0,
      total: result.pagination?.total || 0,
    });

    res.status(200).json({
      success: true,
      message: "Documents retrieved successfully",
      ...result,
    });
  } catch (error) {
    logger.logError(error, {
      action: "list_documents",
      userId: req.user?.user_id,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve documents",
      error: error.message,
    });
  }
};

// Get single document by ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Document get by ID request", {
      userId: req.user?.user_id,
      documentId: id,
      ip: req.ip || req.connection.remoteAddress,
    });

    const document = await documentService.getDocumentById(id);

    logger.info("Document retrieved successfully", {
      userId: req.user?.user_id,
      documentId: id,
    });

    res.status(200).json({
      success: true,
      message: "Document retrieved successfully",
      data: document,
    });
  } catch (error) {
    logger.logError(error, {
      action: "get_document_by_id",
      userId: req.user?.user_id,
      documentId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve document",
      error: error.message,
    });
  }
};

// Create new document (with file upload)
const createDocument = async (req, res) => {
  try {
    // Handle file upload with multer
    upload.single("file")(req, res, async (err) => {
      if (err) {
        logger.error("File upload error:", {
          error: err.message,
          ip: req.ip || req.connection.remoteAddress,
        });

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "File size too large. Maximum size is 10MB.",
              error: "FILE_TOO_LARGE",
            });
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
              success: false,
              message: "Too many files. Only one file is allowed.",
              error: "TOO_MANY_FILES",
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message,
          error: "UPLOAD_ERROR",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file provided. Please select a file to upload.",
          error: "NO_FILE",
        });
      }

      try {
        if (!req.user || !req.user.user_id) {
          return res.status(401).json({
            success: false,
            message: "Authentication required.",
          });
        }
        // Prepare document data
        const documentData = {
          ...req.body,
          uploaded_by: req.user.user_id,
          file_name: req.file.originalname,
          file_path: `documents/${req.file.filename}`,
          file_size: req.file.size,
          file_type: req.file.mimetype,
        };

        // Validate request data
        const validation = validateData(
          documentData,
          assetDocumentValidationSchemas.createAssetDocument
        );

        if (!validation.isValid) {
          // Delete uploaded file if validation fails
          try {
            await fs.promises.unlink(req.file.path);
          } catch (unlinkError) {
            logger.warn("Failed to delete file after validation error", {
              filePath: req.file.path,
            });
          }

          return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: validation.errors,
          });
        }

        logger.info("Document creation request", {
          userId: req.user?.user_id,
          documentData: {
            asset_id: validation.data.asset_id,
            title: validation.data.title,
            document_type: validation.data.document_type,
          },
          ip: req.ip || req.connection.remoteAddress,
        });

        const document = await documentService.createDocument(
          validation.data,
          req.file
        );

        logger.logBusiness("document_created", {
          userId: req.user?.user_id,
          documentId: document.document_id,
          assetId: document.asset_id,
        });

        res.status(201).json({
          success: true,
          message: "Document created successfully",
          data: document,
        });
      } catch (error) {
        // Delete uploaded file if document creation fails
        try {
          await fs.promises.unlink(req.file.path);
        } catch (unlinkError) {
          logger.warn("Failed to delete file after creation error", {
            filePath: req.file.path,
          });
        }

        logger.logError(error, {
          action: "create_document",
          userId: req.user?.user_id,
          documentData: req.body,
          ip: req.ip || req.connection.remoteAddress,
        });

        res.status(400).json({
          success: false,
          message: "Failed to create document",
          error: error.message,
        });
      }
    });
  } catch (error) {
    logger.logError(error, {
      action: "create_document",
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error during document creation",
      error: error.message,
    });
  }
};

// Update document (optional file update)
const updateDocument = async (req, res) => {
  try {
    // Handle optional file upload with multer
    upload.single("file")(req, res, async (err) => {
      if (err) {
        logger.error("File upload error:", {
          error: err.message,
          ip: req.ip || req.connection.remoteAddress,
        });

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "File size too large. Maximum size is 10MB.",
              error: "FILE_TOO_LARGE",
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message,
          error: "UPLOAD_ERROR",
        });
      }

      try {
        const { id } = req.params;

        // Validate request data (file is optional)
        const validation = validateData(
          req.body,
          assetDocumentValidationSchemas.updateAssetDocument
        );

        if (!validation.isValid) {
          // Delete uploaded file if validation fails
          if (req.file) {
            try {
              await fs.promises.unlink(req.file.path);
            } catch (unlinkError) {
              logger.warn("Failed to delete file after validation error", {
                filePath: req.file.path,
              });
            }
          }

          return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: validation.errors,
          });
        }

        logger.info("Document update request", {
          userId: req.user?.user_id,
          documentId: id,
          updateData: Object.keys(validation.data),
          hasFile: !!req.file,
          ip: req.ip || req.connection.remoteAddress,
        });

        const document = await documentService.updateDocument(
          id,
          validation.data,
          req.file || null
        );

        logger.logBusiness("document_updated", {
          userId: req.user?.user_id,
          documentId: id,
          updatedFields: Object.keys(validation.data),
        });

        res.status(200).json({
          success: true,
          message: "Document updated successfully",
          data: document,
        });
      } catch (error) {
        // Delete uploaded file if update fails
        if (req.file) {
          try {
            await fs.promises.unlink(req.file.path);
          } catch (unlinkError) {
            logger.warn("Failed to delete file after update error", {
              filePath: req.file.path,
            });
          }
        }

        logger.logError(error, {
          action: "update_document",
          userId: req.user?.user_id,
          documentId: req.params.id,
          updateData: req.body,
          ip: req.ip || req.connection.remoteAddress,
        });

        if (error.statusCode === 404) {
          return res.status(404).json({
            success: false,
            message: "Document not found",
          });
        }

        res.status(400).json({
          success: false,
          message: "Failed to update document",
          error: error.message,
        });
      }
    });
  } catch (error) {
    logger.logError(error, {
      action: "update_document",
      userId: req.user?.user_id,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error during document update",
      error: error.message,
    });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Document deletion request", {
      userId: req.user?.user_id,
      documentId: id,
      ip: req.ip || req.connection.remoteAddress,
    });

    await documentService.deleteDocument(id);

    logger.logBusiness("document_deleted", {
      userId: req.user?.user_id,
      documentId: id,
    });

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    logger.logError(error, {
      action: "delete_document",
      userId: req.user?.user_id,
      documentId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message,
    });
  }
};

// Get all documents for an asset
const getAssetDocuments = async (req, res) => {
  try {
    const { assetId } = req.params;

    logger.info("Asset documents request", {
      userId: req.user?.user_id,
      assetId,
      ip: req.ip || req.connection.remoteAddress,
    });

    const documents = await documentService.getDocumentsByAsset(assetId);

    res.status(200).json({
      success: true,
      message: "Asset documents retrieved successfully",
      data: documents,
    });
  } catch (error) {
    logger.logError(error, {
      action: "get_asset_documents",
      userId: req.user?.user_id,
      assetId: req.params.assetId,
      ip: req.ip || req.connection.remoteAddress,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve asset documents",
      error: error.message,
    });
  }
};

// Download document
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Document download request", {
      userId: req.user?.user_id,
      documentId: id,
      ip: req.ip || req.connection.remoteAddress,
    });

    const fileInfo = await documentService.downloadDocument(id);

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      fileInfo.fileType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileInfo.fileName}"`
    );
    res.setHeader("Content-Length", fileInfo.fileSize);

    // Send file
    res.sendFile(fileInfo.filePath);
  } catch (error) {
    logger.logError(error, {
      action: "download_document",
      userId: req.user?.user_id,
      documentId: req.params.id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message || "Document or file not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to download document",
      error: error.message,
    });
  }
};

module.exports = {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getAssetDocuments,
  downloadDocument,
  upload, // Export multer instance for use in routes
};
