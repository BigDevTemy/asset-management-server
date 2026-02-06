"use strict";

const { AssetDocument, Asset, User } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs").promises;

/**
 * Document Service
 * Handles asset document/attachment business logic
 */
class DocumentService {
  /**
   * List all documents with pagination and filters
   * @param {Object} queryParams - Query parameters
   * @returns {Object} Paginated documents
   */
  async listDocuments(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "created_at",
        sortOrder = "DESC",
        asset_id,
        document_type,
        uploaded_by,
        ...filters
      } = queryParams;

      const pageNumber = Math.max(1, parseInt(page, 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNumber - 1) * pageSize;

      // Build where clause
      const where = {};

      if (asset_id) {
        where.asset_id = asset_id;
      }

      if (document_type) {
        where.document_type = document_type;
      }

      if (uploaded_by) {
        where.uploaded_by = uploaded_by;
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { file_name: { [Op.like]: `%${search}%` } },
        ];
      }

      // Build order clause
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Execute query
      const { count, rows } = await AssetDocument.findAndCountAll({
        where,
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name", "status"],
          },
          {
            model: User,
            as: "uploadedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order,
        limit: pageSize,
        offset: offset,
        distinct: true,
      });

      const totalPages = Math.ceil(count / pageSize);

      return {
        data: rows,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: count,
          itemsPerPage: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      };
    } catch (error) {
      logger.logError(error, {
        action: "list_documents",
        queryParams,
      });
      throw error;
    }
  }

  /**
   * Get single document by ID
   * @param {number} id - Document ID
   * @returns {Object} Document with associations
   */
  async getDocumentById(id) {
    try {
      const document = await AssetDocument.findByPk(id, {
        include: [
          {
            model: Asset,
            as: "asset",
          },
          {
            model: User,
            as: "uploadedBy",
          },
        ],
      });

      if (!document) {
        const error = new Error("Document not found");
        error.statusCode = 404;
        throw error;
      }

      return document;
    } catch (error) {
      logger.logError(error, {
        action: "get_document_by_id",
        documentId: id,
      });
      throw error;
    }
  }

  /**
   * Create new document
   * @param {Object} data - Document data
   * @param {Object} file - File object (from multer)
   * @returns {Object} Created document
   */
  async createDocument(data, file = null) {
    try {
      // If file is provided, update file-related fields
      if (file) {
        data.file_name = data.file_name || file.originalname;
        // Always store relative path under public directory
        data.file_path = data.file_path || `documents/${file.filename}`;
        data.file_size = data.file_size ?? file.size;
        data.file_type = data.file_type || file.mimetype;
      }

      const document = await AssetDocument.create(data, {
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name"],
          },
          {
            model: User,
            as: "uploadedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
      });

      logger.info("Document created", {
        documentId: document.document_id,
        assetId: document.asset_id,
        fileName: document.file_name,
      });

      return document;
    } catch (error) {
      logger.logError(error, {
        action: "create_document",
        data,
      });
      throw error;
    }
  }

  /**
   * Update document
   * @param {number} id - Document ID
   * @param {Object} data - Update data
   * @param {Object} file - Optional new file object
   * @returns {Object} Updated document
   */
  async updateDocument(id, data, file = null) {
    try {
      const document = await AssetDocument.findByPk(id);

      if (!document) {
        const error = new Error("Document not found");
        error.statusCode = 404;
        throw error;
      }

      // If new file is provided, delete old file and update file fields
      if (file) {
        // Delete old file if it exists
        if (document.file_path) {
          try {
            const oldFilePath = path.join(
              __dirname,
              "../public",
              document.file_path
            );
            await fs.unlink(oldFilePath);
          } catch (unlinkError) {
            // Log but don't fail if file doesn't exist
            logger.warn("Could not delete old file", {
              filePath: document.file_path,
              error: unlinkError.message,
            });
          }
        }

        // Update with new file info
        data.file_name = file.originalname;
        data.file_path = `documents/${file.filename}`;
        data.file_size = file.size;
        data.file_type = file.mimetype;
      }

      await document.update(data);

      logger.info("Document updated", {
        documentId: id,
        updates: Object.keys(data),
      });

      return document;
    } catch (error) {
      logger.logError(error, {
        action: "update_document",
        documentId: id,
        data,
      });
      throw error;
    }
  }

  /**
   * Delete document and associated file
   * @param {number} id - Document ID
   * @returns {boolean} Success status
   */
  async deleteDocument(id) {
    try {
      const document = await AssetDocument.findByPk(id);

      if (!document) {
        const error = new Error("Document not found");
        error.statusCode = 404;
        throw error;
      }

      // Delete file from filesystem
      if (document.file_path) {
        try {
          const filePath = path.join(
            __dirname,
            "../public",
            document.file_path
          );
          await fs.unlink(filePath);
        } catch (unlinkError) {
          // Log but don't fail if file doesn't exist
          logger.warn("Could not delete file", {
            filePath: document.file_path,
            error: unlinkError.message,
          });
        }
      }

      await document.destroy();

      logger.info("Document deleted", {
        documentId: id,
        filePath: document.file_path,
      });

      return true;
    } catch (error) {
      logger.logError(error, {
        action: "delete_document",
        documentId: id,
      });
      throw error;
    }
  }

  /**
   * Get all documents for an asset
   * @param {number} assetId - Asset ID
   * @returns {Array} Documents for the asset
   */
  async getDocumentsByAsset(assetId) {
    try {
      const documents = await AssetDocument.findAll({
        where: {
          asset_id: assetId,
        },
        include: [
          {
            model: User,
            as: "uploadedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      return documents;
    } catch (error) {
      logger.logError(error, {
        action: "get_documents_by_asset",
        assetId,
      });
      throw error;
    }
  }

  /**
   * Get file path for download
   * @param {number} id - Document ID
   * @returns {Object} File path and metadata
   */
  async downloadDocument(id) {
    try {
      const document = await AssetDocument.findByPk(id, {
        include: [
          {
            model: Asset,
            as: "asset",
            attributes: ["asset_id", "asset_tag", "name"],
          },
        ],
      });

      if (!document) {
        const error = new Error("Document not found");
        error.statusCode = 404;
        throw error;
      }

      // Build full file path
      const filePath = path.join(__dirname, "../public", document.file_path);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (accessError) {
        const error = new Error("File not found on server");
        error.statusCode = 404;
        throw error;
      }

      return {
        filePath,
        fileName: document.file_name,
        fileType: document.file_type,
        fileSize: document.file_size,
        document,
      };
    } catch (error) {
      logger.logError(error, {
        action: "download_document",
        documentId: id,
      });
      throw error;
    }
  }
}

module.exports = DocumentService;
