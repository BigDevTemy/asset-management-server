'use strict'

const {
  Asset,
  AssetTransaction,
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
const { Op } = require('sequelize')

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

      const createdBy = sanitizedCoreData?.created_by ?? user?.user_id ?? null

      // Assign the asset to the user who creates it (but prefer payload when supplied)
      const assetDataWithCreator = {
        ...sanitizedCoreData,
        active_form_id: form_id || coreAssetData?.active_form_id || null,
        created_by: createdBy,
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
    return this._withFlatFields(result)
  }

  async getById(id, additionalOptions = {}) {
    const asset = await this.crudService.getById(id, additionalOptions)
    return this._attachFields(asset)
  }

  async update(id, data = {}, additionalOptions = {}) {
    const { form_id, form_responses, ...coreData } = data

    if (!form_id && !form_responses) {
      return this.crudService.update(id, data, additionalOptions)
    }

    const transaction = await Asset.sequelize.transaction()

    try {
      const sanitizedCoreData = this._sanitizeAssetFields(coreData)

      if (Object.keys(sanitizedCoreData).length > 0) {
        await Asset.update(sanitizedCoreData, {
          where: { asset_id: id },
          transaction,
        })
      }

      const asset = await Asset.findByPk(id, { transaction })
      if (!asset) {
        await transaction.rollback()
        return null
      }

      if (form_id && form_responses && Object.keys(form_responses).length) {
        await this._saveFormResponses(asset, form_id, form_responses, transaction)
      }

      await transaction.commit()

      const updated = await this.crudService.getById(id, additionalOptions)
      return this._attachFields(updated)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  async updateApprovalStatus(id, data, additionalOptions) {
    return this.update(id, data, additionalOptions)
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

  async getAssetsByCreator(
    userId,
    queryParams = {},
    dateRange = {},
    additionalOptions = {},
  ) {
    const { startDate, endDate } = dateRange
    const filters = {
      ...queryParams,
      created_by: userId,
    }

    const rangeWhere = {}
    if (startDate) {
      rangeWhere.created_at = {
        ...(rangeWhere.created_at || {}),
        [Op.gte]: startDate,
      }
    }

    if (endDate) {
      rangeWhere.created_at = {
        ...(rangeWhere.created_at || {}),
        [Op.lt]: endDate,
      }
    }

    const controllerOptions = {
      ...additionalOptions,
      ...(Object.keys(rangeWhere).length ? { where: rangeWhere } : {}),
    }

    const result = await this.crudService.list(filters, controllerOptions)

    return this._withFlatFields(result)
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
    let savedCount = 0
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

      const [record, created] = await AssetFormValue.findOrCreate({
        where: {
          asset_id: asset.asset_id,
          form_id: formId,
          form_field_id: field.id,
        },
        defaults: {
          value: valueToStore,
        },
        transaction,
      })
      if (!created) {
        await record.update({ value: valueToStore }, { transaction })
      }
      savedCount += 1
    }

    if (savedCount) {
      logger.info('Asset form responses saved', {
        assetId: asset.asset_id,
        formId,
        count: savedCount,
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

  _withFlatFields(result) {
    if (!result || !Array.isArray(result.data)) {
      return result
    }

    return {
      ...result,
      data: result.data.map((asset) => this._attachFields(asset)),
    }
  }

  _attachFields(asset) {
    if (!asset) {
      return asset
    }

    const fields = {}
    const responses = []
    if (asset.formValues) {
      asset.formValues.forEach((fv) => {
        const label = fv.field?.label || fv.form_field_id
        const key = label.replace(/\s+/g, '')
        const parsedValue = _parseResponseValue(fv.value)
        fields[key] = parsedValue
        responses.push({
          field_id: fv.form_field_id,
          value: parsedValue,
        })
      })
    }

    const sanitized = { ...asset }
    delete sanitized.formValues

    const form =
      asset.activeForm && asset.activeForm.fields
        ? {
            form_id: asset.activeForm.form_id,
            name: asset.activeForm.name,
            fields: asset.activeForm.fields.map((field) => ({
              id: field.id,
              label: field.label,
              type: field.type,
              options: field.options || [],
              allow_multiple: field.allow_multiple,
              position: field.position,
            })),
          }
        : null

    return { ...sanitized, fields, responses, form }
  }
}

function _parseResponseValue(value) {
  if (value === null || value === undefined) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

module.exports = AssetService
