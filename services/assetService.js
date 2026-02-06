"use strict";

const {
  Asset,
  AssetTransaction,
  MaintenanceSchedule,
  MaintenanceLog,
  AssetDocument,
  User,
} = require("../models");
const { createAssetCrudService } = require("./crudServiceFactory");
const logger = require("../utils/logger");
const {
  TRANSACTION_ACTIONS,
  TRANSACTION_STATUS,
  TRANSACTION_PRIORITY,
} = require("../utils/constants");
const {
  generateBarcodeFile,
  generateAssetBarcodeNumber,
} = require("../utils/barcodeGenerator");
const path = require("path");
const fs = require("fs").promises;

/**
 * Custom Asset Service that extends CRUD functionality
 * Handles asset-specific business logic including automatic transaction creation
 */
class AssetService {
  constructor() {
    this.crudService = createAssetCrudService();
  }

  /**
   * Create a new asset with automatic transaction creation
   * @param {Object} assetData - Asset data
   * @param {Object} user - User creating the asset
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {Object} Created asset with transaction
   */
  async createAsset(assetData, user, additionalOptions = {}) {
    const transaction = await Asset.sequelize.transaction();

    try {
      // Assign the asset to the user who creates it
      const assetDataWithCreator = {
        ...assetData,
        assigned_to: user.user_id, // Assign to the creator
        assignment_date: new Date().toISOString().split("T")[0],
        status: "assigned", // Set status to assigned since it's assigned to creator
      };

      // Create the asset
      const asset = await Asset.create(assetDataWithCreator, {
        ...additionalOptions,
        transaction,
      });

      // Generate barcode for the asset
      let barcodePath = null;
      let barcodeNumber = null;
      try {
        // Generate random barcode number: [A-Z][0-9][0-9][asset_id][0-9][0-9]
        barcodeNumber = generateAssetBarcodeNumber(asset.asset_id);

        // Define barcode directory and ensure it exists
        const barcodeDir = path.join(__dirname, "../public/barcodes");
        await fs.mkdir(barcodeDir, { recursive: true });

        // Generate barcode filename and full path
        const barcodeFilename = `barcode_${asset.asset_id}.png`;
        const fullBarcodePath = path.join(barcodeDir, barcodeFilename);

        // Generate and save barcode as PNG using the random barcode number
        await generateBarcodeFile(barcodeNumber, fullBarcodePath);

        // Store relative path in database
        barcodePath = `/barcodes/${barcodeFilename}`;

        // Update asset with barcode path and barcode number
        await asset.update({ barcode: barcodePath }, { transaction });

        logger.info("Barcode generated for asset", {
          asset_id: asset.asset_id,
          barcodeNumber,
          barcodePath,
          format: "[Letter][Digit][Digit][AssetID][Digit][Digit]",
        });
      } catch (barcodeError) {
        // Log barcode generation error but don't fail asset creation
        logger.error("Failed to generate barcode for asset", {
          asset_id: asset.asset_id,
          error: barcodeError.message,
        });
      }

      // Create the default transaction for asset creation and assignment to creator
      const transactionData = {
        asset_id: asset.asset_id,
        requested_by: user.user_id,
        requested_to: user.user_id, // Assign to creator
        action: TRANSACTION_ACTIONS.ASSIGN, // Change action to assign since we're assigning to creator
        status: TRANSACTION_STATUS.COMPLETED, // Assignment is immediately completed
        from_location: null,
        to_location: assetData.location || null,
        notes: `Asset created and assigned to creator: ${assetData.name}`,
        admin_notes: `Asset created and automatically assigned to creator ${
          user.full_name || user.email
        }`,
        priority: TRANSACTION_PRIORITY.MEDIUM,
        expected_completion_date: null,
        actual_completion_date: new Date(),
        created_at: new Date(),
        responded_at: new Date(),
        completed_at: new Date(),
      };

      const assetTransaction = await AssetTransaction.create(transactionData, {
        transaction,
      });

      // Commit the transaction
      await transaction.commit();

      logger.logBusiness("asset_created_and_assigned_to_creator", {
        userId: user.user_id,
        assetId: asset.asset_id,
        assetTag: asset.asset_tag,
        assignedToCreator: user.user_id,
        creatorName: user.full_name || user.email,
        transactionId: assetTransaction.transaction_id,
        action: TRANSACTION_ACTIONS.ASSIGN,
      });

      // Return the asset with the created transaction
      return {
        ...asset.dataValues,
        createdTransaction: assetTransaction.dataValues,
      };
    } catch (error) {
      // Rollback the transaction on error
      await transaction.rollback();

      logger.logError(error, {
        action: "create_asset_and_assign_to_creator",
        userId: user?.user_id,
        assetData,
        creatorAssignmentAttempted: true,
      });

      throw error;
    }
  }

  /**
   * Delegate other CRUD operations to the base service
   */
  async list(queryParams, additionalOptions) {
    return this.crudService.list(queryParams, additionalOptions);
  }

  async getById(id, additionalOptions = {}) {
    // Default includes for maintenance and documents
    const defaultIncludes = [
      {
        model: MaintenanceSchedule,
        as: "maintenanceSchedules",
        include: [
          {
            model: User,
            as: "assignedUser",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["next_maintenance_date", "ASC"]],
      },
      {
        model: MaintenanceLog,
        as: "maintenanceLogs",
        include: [
          {
            model: User,
            as: "performedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["performed_date", "DESC"]],
        limit: 10, // Limit recent logs
      },
      {
        model: AssetDocument,
        as: "documents",
        include: [
          {
            model: User,
            as: "uploadedBy",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["created_at", "DESC"]],
      },
    ];

    // Merge with additional options
    const mergedOptions = {
      ...additionalOptions,
      include: [...(additionalOptions.include || []), ...defaultIncludes],
    };

    return this.crudService.getById(id, mergedOptions);
  }

  async update(id, data, additionalOptions) {
    return this.crudService.update(id, data, additionalOptions);
  }

  async delete(id, additionalOptions) {
    return this.crudService.delete(id, additionalOptions);
  }

  async bulkDelete(ids, additionalOptions) {
    return this.crudService.bulkDelete(ids, additionalOptions);
  }

  async exists(id) {
    return this.crudService.exists(id);
  }

  async count(filters) {
    return this.crudService.count(filters);
  }

  async dropdown(options) {
    return this.crudService.dropdown(options);
  }

  /**
   * Get assets assigned to a specific user
   * @param {number} userId - User ID to get assigned assets for
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {Object} Assets assigned to the user with pagination
   */
  async getMyAssets(userId, queryParams = {}, additionalOptions = {}) {
    try {
      logger.info("Getting assets for user", {
        userId,
        queryParams,
        action: "get_my_assets",
      });

      // Add user filter to query parameters
      const userQueryParams = {
        ...queryParams,
        assigned_to: userId, // Filter by assigned_to field
      };

      // Use the existing list method with user filter
      const result = await this.crudService.list(
        userQueryParams,
        additionalOptions
      );

      logger.info("User assets retrieved successfully", {
        userId,
        count: result.data?.length || 0,
        total: result.pagination?.total || 0,
      });

      return result;
    } catch (error) {
      logger.logError(error, {
        action: "get_my_assets",
        userId,
        queryParams,
      });

      throw error;
    }
  }
}

module.exports = AssetService;
