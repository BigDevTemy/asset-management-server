'use strict'

const {
  Asset,
  AssetTransaction,
  MaintenanceSchedule,
  MaintenanceLog,
  AssetDocument,
  User,
  AssetFormValue,
  FormFields,
} = require('../models')
const { createAssetCrudService } = require('./crudServiceFactory')
const logger = require('../utils/logger')
const {
  TRANSACTION_ACTIONS,
  TRANSACTION_STATUS,
  TRANSACTION_PRIORITY,
} = require('../utils/constants')
const {
  generateBarcodeFile,
  generateAssetBarcodeNumber,
} = require('../utils/barcodeGenerator')
const {
  uploadBase64Image,
  isCloudinaryConfigured,
} = require('../utils/cloudinary')
const path = require('path')
const fs = require('fs').promises

/**
 * Custom Asset Service that extends CRUD functionality
 * Handles asset-specific business logic including automatic transaction creation
 */
class AssetService {
  constructor() {
    this.crudService = createAssetCrudService()
  }

  /**
   * Create a new asset with automatic transaction creation
   * @param {Object} assetData - Asset data
   * @param {Object} user - User creating the asset
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {Object} Created asset with transaction
   */
  async createAsset(assetData, user, additionalOptions = {}) {
    const transaction = await Asset.sequelize.transaction()

    try {
      const { form_id, form_responses, ...coreAssetData } = assetData || {}
      const sanitizedCoreData = this._sanitizeAssetFields(coreAssetData)

      // Assign the asset to the user who creates it
      const assetDataWithCreator = {
        ...sanitizedCoreData,
        active_form_id: form_id || coreAssetData?.active_form_id || null,
        created_by: user?.user_id ?? null,
        status: coreAssetData?.status || 'available',
      }

      // Create the asset
      const asset = await Asset.create(assetDataWithCreator, {
        ...additionalOptions,
        transaction,
      })

      // Persist dynamic form responses (if supplied)
      let processedFormResponses = {}
      if (form_id && form_responses && typeof form_responses === 'object') {
        const { processedResponses } = await this._saveFormResponses(
          asset,
          form_id,
          form_responses,
          transaction,
        )
        processedFormResponses = processedResponses
      }

      // Generate barcode for the asset
      let barcodePath = null
      let barcodeNumber = null
      try {
        // Generate random barcode number: [A-Z][0-9][0-9][asset_id][0-9][0-9]
        barcodeNumber = generateAssetBarcodeNumber(asset.asset_id)

        // Define barcode directory and ensure it exists
        const barcodeDir = path.join(__dirname, '../public/barcodes')
        await fs.mkdir(barcodeDir, { recursive: true })

        // Generate barcode filename and full path
        const barcodeFilename = `barcode_${asset.asset_id}.png`
        const fullBarcodePath = path.join(barcodeDir, barcodeFilename)

        // Generate and save barcode as PNG using the random barcode number
        await generateBarcodeFile(barcodeNumber, fullBarcodePath)

        // Store relative path in database
        barcodePath = `/barcodes/${barcodeFilename}`

        // Update asset with barcode path and barcode number
        await asset.update({ barcode: barcodePath }, { transaction })

        logger.info('Barcode generated for asset', {
          asset_id: asset.asset_id,
          barcodeNumber,
          barcodePath,
          format: '[Letter][Digit][Digit][AssetID][Digit][Digit]',
        })
      } catch (barcodeError) {
        // Log barcode generation error but don't fail asset creation
        logger.error('Failed to generate barcode for asset', {
          asset_id: asset.asset_id,
          error: barcodeError.message,
        })
      }

      // Create the default transaction for asset creation and assignment to creator
      const transactionData = {
        asset_id: asset.asset_id,
        requested_by: user.user_id,
        requested_to: user.user_id, // Assign to creator
        action: TRANSACTION_ACTIONS.CREATE,
        status: TRANSACTION_STATUS.COMPLETED,
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
      }

      const assetTransaction = await AssetTransaction.create(transactionData, {
        transaction,
      })

      // Commit the transaction
      await transaction.commit()

      logger.logBusiness('asset_created_and_assigned_to_creator', {
        userId: user.user_id,
        assetId: asset.asset_id,
        assetTag: asset.asset_tag,
        assignedToCreator: user.user_id,
        creatorName: user.full_name || user.email,
        transactionId: assetTransaction.transaction_id,
        action: TRANSACTION_ACTIONS.ASSIGN,
      })

      // Return the asset with the created transaction
      return {
        ...asset.dataValues,
        createdTransaction: assetTransaction.dataValues,
        form_responses: processedFormResponses,
      }
    } catch (error) {
      // Rollback the transaction on error
      await transaction.rollback()

      logger.logError(error, {
        action: 'create_asset_and_assign_to_creator',
        userId: user?.user_id,
        assetData,
        creatorAssignmentAttempted: true,
      })

      throw error
    }
  }

  /**
   * Delegate other CRUD operations to the base service
   */
  // async list(queryParams, additionalOptions) {
  //   return this.crudService.list(queryParams, additionalOptions);
  // }

  async list(queryParams, additionalOptions = {}) {
    const result = await this.crudService.list(queryParams, additionalOptions)

    // Transform formValues to flat object { "Username": "ogomide", "DocumentType": "..." }
    result.data = result.data.map((asset) => {
      const fields = {}
      if (asset.formValues) {
        asset.formValues.forEach((fv) => {
          const label = fv.field?.label || fv.form_field_id
          const key = label.replace(/\s+/g, '') // "Document Type" -> "DocumentType"
          fields[key] = fv.value
        })
      }
      delete asset.formValues
      return { ...asset, fields }
    })

    return result
  }

  async getById(id, additionalOptions = {}) {
    // Default includes for maintenance and documents
    const defaultIncludes = [
      {
        model: MaintenanceSchedule,
        as: 'maintenanceSchedules',
        include: [
          {
            model: User,
            as: 'assignedUser',
            attributes: ['user_id', 'full_name', 'email'],
          },
        ],
        order: [['next_maintenance_date', 'ASC']],
      },
      {
        model: MaintenanceLog,
        as: 'maintenanceLogs',
        include: [
          {
            model: User,
            as: 'performedBy',
            attributes: ['user_id', 'full_name', 'email'],
          },
        ],
        order: [['performed_date', 'DESC']],
        limit: 10, // Limit recent logs
      },
      {
        model: AssetDocument,
        as: 'documents',
        include: [
          {
            model: User,
            as: 'uploadedBy',
            attributes: ['user_id', 'full_name', 'email'],
          },
        ],
        order: [['created_at', 'DESC']],
      },
    ]

    // Merge with additional options
    const mergedOptions = {
      ...additionalOptions,
      include: [...(additionalOptions.include || []), ...defaultIncludes],
    }

    return this.crudService.getById(id, mergedOptions)
  }

  async update(id, data, additionalOptions) {
    return this.crudService.update(id, data, additionalOptions)
  }

  async delete(id, additionalOptions) {
    return this.crudService.delete(id, additionalOptions)
  }

  async bulkDelete(ids, additionalOptions) {
    return this.crudService.bulkDelete(ids, additionalOptions)
  }

  async exists(id) {
    return this.crudService.exists(id)
  }

  async count(filters) {
    return this.crudService.count(filters)
  }

  async dropdown(options) {
    return this.crudService.dropdown(options)
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
      logger.info('Getting assets for user', {
        userId,
        queryParams,
        action: 'get_my_assets',
      })

      // Add user filter to query parameters
      const userQueryParams = {
        ...queryParams,
        assigned_to: userId, // Filter by assigned_to field
      }

      // Use the existing list method with user filter
      const result = await this.crudService.list(
        userQueryParams,
        additionalOptions,
      )

      logger.info('User assets retrieved successfully', {
        userId,
        count: result.data?.length || 0,
        total: result.pagination?.total || 0,
      })

      return result
    } catch (error) {
      logger.logError(error, {
        action: 'get_my_assets',
        userId,
        queryParams,
      })

      throw error
    }
  }

  /**
   * Persist dynamic form responses for an asset (including camera uploads)
   * @private
   */
  async _saveFormResponses(asset, formId, formResponses, transaction) {
    // Fetch the form fields for validation/context
    const fields = await FormFields.findAll({
      where: { form_id: formId },
      transaction,
    })

    const fieldMap = new Map(fields.map((field) => [String(field.id), field]))
    const recordsToCreate = []
    const processedResponses = {}

    for (const [fieldIdRaw, rawValue] of Object.entries(formResponses || {})) {
      const field = fieldMap.get(String(fieldIdRaw))
      if (!field) {
        logger.warn('Form response received for unknown field', {
          fieldId: fieldIdRaw,
          formId,
          assetId: asset.asset_id,
        })
        continue
      }

      let processedValue = rawValue

      // Handle camera uploads to Cloudinary
      if (field.type === 'camera') {
        if (!isCloudinaryConfigured) {
          throw new Error(
            'Cloudinary credentials are not configured, unable to upload camera images',
          )
        }

        const images = Array.isArray(rawValue)
          ? rawValue
          : rawValue
            ? [rawValue]
            : []

        const uploadedUrls = []
        for (const base64 of images) {
          if (!base64) continue
          const url = await uploadBase64Image(base64, {
            folder: `assets/${asset.asset_id}/camera/${field.id}`,
          })
          uploadedUrls.push(url)
        }

        processedValue = uploadedUrls
      }

      processedResponses[String(field.id)] = processedValue

      const valueToStore =
        processedValue === null || processedValue === undefined
          ? null
          : typeof processedValue === 'string'
            ? processedValue
            : JSON.stringify(processedValue)

      recordsToCreate.push({
        asset_id: asset.asset_id,
        form_id: formId,
        form_field_id: field.id,
        value: valueToStore,
      })
    }

    if (recordsToCreate.length) {
      await AssetFormValue.bulkCreate(recordsToCreate, { transaction })
      logger.info('Asset form responses saved', {
        assetId: asset.asset_id,
        formId,
        count: recordsToCreate.length,
      })
    }

    return { processedResponses }
  }

  /**
   * Remove keys that do not exist on the Asset model; log each skipped key.
   * @private
   * @param {Object} data
   * @returns {Object}
   */
  _sanitizeAssetFields(data = {}) {
    const allowedKeys = new Set(Object.keys(Asset.rawAttributes || {}))
    const sanitized = {}

    Object.entries(data).forEach(([key, value]) => {
      if (allowedKeys.has(key)) {
        sanitized[key] = value
      } else {
        logger.warn('Skipping unknown asset field', { field: key })
      }
    })

    return sanitized
  }
}

module.exports = AssetService
