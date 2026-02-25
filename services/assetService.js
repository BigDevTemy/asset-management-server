'use strict'

const {
  Asset,
  AssetTransaction,
  User,
  AssetFormValue,
  FormFields,
  FormBuilder,
  OrganizationSettings,
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
const { generateQrCodeFile } = require('../utils/qrGenerator')
const {
  uploadBase64Image,
  isCloudinaryConfigured,
} = require('../utils/cloudinary')
const path = require('path')
const Jimp = require('jimp')
const crypto = require('crypto')
const fs = require('fs').promises
const { Op } = require('sequelize')

const IDENTIFIER_REGEX = /^[A-Za-z0-9_]+$/

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
    let barcodePath = null
    let qrCodePath = null
    let codeSheetPath = null
    let orgLogoUrl = null

    try {
      const { form_id, form_responses, ...coreAssetData } = assetData || {}
      const sanitizedCoreData = this._sanitizeAssetFields(coreAssetData)

      // Fetch organization logo once per request for codesheet/logo QR generation
      try {
        const orgSettings = await OrganizationSettings.findOne()
        orgLogoUrl = orgSettings?.logo_url || null
      } catch (err) {
        logger.warn('Unable to load organization logo for codesheet', {
          error: err?.message,
        })
      }

      const createdBy = sanitizedCoreData?.created_by ?? user?.user_id ?? null

      const formTagConfigs = form_id
        ? await this._getFormTagConfigs(form_id, transaction)
        : {}

      const generateTags = async (offset = 0, force = false) => {
        const tags = {}

        if (force || !sanitizedCoreData.asset_tag) {
          tags.asset_tag = await this._generateAssetTag({
            assetData: { ...sanitizedCoreData, ...tags },
            formId: form_id,
            formResponses: form_responses,
            tagConfig: formTagConfigs?.asset_tag_config || null,
            transaction,
            sequenceOffset: offset,
          })
        }

        if (
          formTagConfigs?.asset_tag_group_config?.enabled &&
          (force || !sanitizedCoreData.asset_tag_group)
        ) {
          tags.asset_tag_group = await this._generateAssetTagGroup({
            assetData: { ...sanitizedCoreData, ...tags },
            formId: form_id,
            formResponses: form_responses,
            tagGroupConfig: formTagConfigs.asset_tag_group_config,
            transaction,
            sequenceOffset: offset,
          })
        }

        return tags
      }

      Object.assign(sanitizedCoreData, await generateTags())

      // Assign the asset to the user who creates it (but prefer payload when supplied)
      const assetDataWithCreator = {
        ...sanitizedCoreData,
        active_form_id: form_id || coreAssetData?.active_form_id || null,
        created_by: createdBy,
        status: coreAssetData?.status || 'available',
      }

      // Create the asset
      let asset
      let retries = 0
      while (retries < 3) {
        try {
          asset = await Asset.create(assetDataWithCreator, {
            ...additionalOptions,
            transaction,
          })
          break
        } catch (err) {
          const isUnique =
            err?.name === 'SequelizeUniqueConstraintError' &&
            err?.errors?.some((e) => e?.path === 'asset_tag')
          if (isUnique) {
            // regenerate tag with next sequence bump and retry
            const regenerated = await generateTags(retries + 1, true)
            assetDataWithCreator.asset_tag =
              regenerated.asset_tag || assetDataWithCreator.asset_tag
            if (regenerated.asset_tag_group) {
              assetDataWithCreator.asset_tag_group = regenerated.asset_tag_group
            }
            retries += 1
            continue
          }
          throw err
        }
      }

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

      // Generate barcode and QR code using the same payload as /api/assets/codes
      try {
        const barcodeSourceText =
          asset.asset_tag ||
          assetDataWithCreator.asset_tag ||
          generateAssetBarcodeNumber(asset.asset_id)

        const qrPayloadText = await this._buildHumanReadableQrString({
          asset,
          formId: form_id,
          formResponses: processedFormResponses,
          transaction,
        })

        const generated = await this._generateAndStoreAssetCodes({
          asset,
          barcodeSourceText,
          qrPayload: qrPayloadText,
          orgLogoUrl,
          transaction,
        })
        barcodePath = generated.barcodePath
        qrCodePath = generated.qrCodePath
        codeSheetPath = generated.sheetPath
      } catch (barcodeError) {
        // Log barcode/QR generation error but don't fail asset creation
        logger.error('Failed to generate codes for asset', {
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
        barcode: barcodePath || asset.barcode,
        qr_code: qrCodePath || asset.qr_code,
        codesheet_path: codeSheetPath || undefined,
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
    const normalizedParams = this._normalizeAssetFilters(queryParams)
    const result = await this.crudService.list(
      normalizedParams,
      additionalOptions,
    )
    return this._withFlatFields(result)
  }

  /**
   * Generic lookup for dynamic form options (e.g., dropdowns)
   * Supports table-based sources with label/value columns.
   */
  async lookupOptions(params = {}) {
    const {
      type = 'table',
      table,
      label_key: labelKey,
      value_key: valueKey,
      parent_key: parentKey,
      parent_id: parentId,
      link_id: linkId,
      search,
      limit = 50,
      order = 'ASC',
    } = params

    if (type && type !== 'table') {
      const err = new Error(`Unsupported options_source type: ${type}`)
      err.statusCode = 400
      throw err
    }

    if (!table || !labelKey || !valueKey) {
      const missing = ['table', 'label_key', 'value_key'].filter(
        (key) => !params[key],
      )
      const err = new Error(
        `Missing required parameters: ${missing.join(', ')}`,
      )
      err.statusCode = 400
      throw err
    }

    if (
      !IDENTIFIER_REGEX.test(table) ||
      !IDENTIFIER_REGEX.test(labelKey) ||
      !IDENTIFIER_REGEX.test(valueKey)
    ) {
      const err = new Error(
        'Invalid identifier: only letters, numbers, and underscore are allowed',
      )
      err.statusCode = 400
      throw err
    }

    const qi = Asset.sequelize.getQueryInterface()
    const qg = qi.queryGenerator

    // Validate table and columns exist to avoid SQL injection via identifiers
    let tableDefinition
    try {
      tableDefinition = await qi.describeTable(table)
    } catch (describeError) {
      const err = new Error(`Table not found: ${table}`)
      err.statusCode = 400
      throw err
    }

    if (!tableDefinition[labelKey] || !tableDefinition[valueKey]) {
      const err = new Error(
        `Columns not found on ${table}: ${[labelKey, valueKey].join(', ')}`,
      )
      err.statusCode = 400
      throw err
    }

    if (parentKey) {
      if (!IDENTIFIER_REGEX.test(parentKey)) {
        const err = new Error(
          'Invalid parent_key: only letters, numbers, and underscore are allowed',
        )
        err.statusCode = 400
        throw err
      }
      if (!tableDefinition[parentKey]) {
        const err = new Error(
          `Parent column not found on ${table}: ${parentKey}`,
        )
        err.statusCode = 400
        throw err
      }
    }

    if (linkId) {
      if (!IDENTIFIER_REGEX.test(linkId)) {
        const err = new Error(
          'Invalid link_id: only letters, numbers, and underscore are allowed',
        )
        err.statusCode = 400
        throw err
      }
      if (!tableDefinition[linkId]) {
        const err = new Error(`Link column not found on ${table}: ${linkId}`)
        err.statusCode = 400
        throw err
      }
    }

    const safeTable = qg.quoteTable(table)
    const safeLabel = qg.quoteIdentifier(labelKey)
    const safeValue = qg.quoteIdentifier(valueKey)
    const safeParent = parentKey ? qg.quoteIdentifier(parentKey) : null
    const safeLink = linkId ? qg.quoteIdentifier(linkId) : null

    const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
    const sortDirection =
      String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC'

    const selectCols = [`${safeValue} AS value`, `${safeLabel} AS label`]
    if (safeLink) {
      selectCols.push(`${safeLink} AS link_id`)
    }

    let sql = `SELECT ${selectCols.join(', ')} FROM ${safeTable}`
    const replacements = {}
    const whereClauses = []

    if (search) {
      whereClauses.push(`${safeLabel} LIKE :search`)
      replacements.search = `%${search}%`
    }

    if (
      parentKey &&
      parentId !== undefined &&
      parentId !== null &&
      parentId !== ''
    ) {
      whereClauses.push(`${safeParent} = :parentId`)
      replacements.parentId = parentId
    }

    if (whereClauses.length) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    sql += ` ORDER BY ${safeLabel} ${sortDirection} LIMIT ${cappedLimit}`

    const [rows] = await Asset.sequelize.query(sql, { replacements })
    return rows
  }

  async getById(id, additionalOptions = {}) {
    const asset = await this.crudService.getById(id, additionalOptions)
    return this._attachFields(asset)
  }

  async getByBarcode(barcodeText, additionalOptions = {}) {
    const parsedId = this._parseBarcodeToId(barcodeText)
    if (!parsedId) return null
    return this.getById(parsedId, additionalOptions)
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
        await this._saveFormResponses(
          asset,
          form_id,
          form_responses,
          transaction,
        )
      }

      await transaction.commit()

      const updated = await this.crudService.getById(id, additionalOptions)
      const updatedAttached = this._attachFields(updated)

      // Rebuild QR code after updates so scans show latest core/form details
      try {
        const responseMap = await this._fetchFormResponsesForQr(id)
        const qrCodePath = await this._generateAndStoreQrCode(updatedAttached, {
          formResponses: Object.keys(responseMap).length
            ? responseMap
            : form_responses || {},
          formId: form_id || updatedAttached?.active_form_id,
        })
        if (qrCodePath) {
          updatedAttached.qr_code = qrCodePath
        }
      } catch (qrError) {
        logger.error('Failed to refresh QR code after asset update', {
          asset_id: id,
          error: qrError.message,
        })
      }

      return updatedAttached
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
      const normalizedParams = this._normalizeAssetFilters(queryParams)
      const userQueryParams = { ...normalizedParams, assigned_to: userId }

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
      ...this._normalizeAssetFilters(queryParams),
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

  _normalizeAssetFilters(params = {}) {
    const { form_id, ...rest } = params
    const normalized = { ...rest }

    if (form_id !== undefined) {
      normalized.active_form_id = form_id
    }

    return normalized
  }

  async _generateAssetTag({
    assetData = {},
    formId = null,
    formResponses = {},
    tagConfig = null,
    transaction,
    sequenceOffset = 0,
  }) {
    const parsedTagConfig = this._parseConfigObject(tagConfig)

    const tagConfigEffective =
      parsedTagConfig && typeof parsedTagConfig === 'object'
        ? parsedTagConfig
        : null

    // If form-based config is available and enabled, build tag from segments
    if (
      tagConfigEffective?.enabled &&
      Array.isArray(tagConfigEffective.segments)
    ) {
      const separator =
        typeof tagConfigEffective.separator === 'string' &&
        tagConfigEffective.separator.length
          ? tagConfigEffective.separator
          : '-'

      const parts = []
      const segments = tagConfigEffective.segments

      const getFieldValue = (fieldId, hierarchyLevelName = null) =>
        this._getFieldResponseValue(formResponses, fieldId, hierarchyLevelName)

      for (const segment of segments) {
        if (!segment || !segment.type) continue

        if (segment.type === 'field') {
          const value = getFieldValue(
            segment.field_id,
            segment.hierarchy_level_name,
          )
          if (value === undefined || value === null || value === '') {
            throw new Error(
              `Missing value for asset tag field_id ${segment.field_id}`,
            )
          }
          const chunkLength =
            Number(segment.max_length) && Number(segment.max_length) > 0
              ? Number(segment.max_length)
              : null // null => no truncation
          parts.push(this._valueToTagChunk(value, chunkLength))
        } else if (segment.type === 'sequence') {
          const length = Number(segment.length) || 4
          const start = Number(segment.start) || 1
          const prefix = parts.join(separator)
          const nextSeq = await this._computeConfigSequence(
            prefix,
            separator,
            length,
            start + sequenceOffset,
            transaction,
            'asset_tag',
          )
          const seqPart = String(nextSeq).padStart(length, '0')
          parts.push(seqPart)
        } else {
          logger.warn('Unknown asset_tag_config segment type, skipping', {
            segment,
          })
        }
      }

      if (!parts.length) {
        throw new Error('Asset tag configuration produced no segments')
      }

      return parts.join(separator)
    }

    // Fallback to legacy generation using category/location
    const { category_id: categoryId, asset_location: assetLocation } = assetData

    // Resolve category code
    let categoryCode = 'CAT'
    if (categoryId) {
      try {
        const [rows] = await Asset.sequelize.query(
          'SELECT name FROM asset_categories WHERE category_id = :id LIMIT 1',
          { replacements: { id: categoryId }, transaction },
        )
        const catName = rows?.[0]?.name || 'CAT'
        categoryCode = this._slugCode(catName, 8)
      } catch (err) {
        logger.warn('Failed to resolve category name for asset tag', {
          categoryId,
          error: err.message,
        })
      }
    }

    // Resolve location code
    const locationSource =
      assetLocation || assetData.location || assetData.asset_location || ''
    const locationCode = this._slugCode(locationSource || 'LOC', 3)

    const nextSeq = await this._computeNextSeq(
      categoryId,
      categoryCode,
      transaction,
    )
    const seqPart = String(nextSeq + sequenceOffset).padStart(3, '0')
    return `${locationCode}-${categoryCode}-${seqPart}`
  }

  async _generateAssetTagGroup({
    assetData = {},
    formId = null,
    formResponses = {},
    tagGroupConfig = null,
    transaction,
    sequenceOffset = 0,
  }) {
    const config = this._parseConfigObject(tagGroupConfig)
    if (!config?.enabled) return assetData.asset_tag_group || null

    const classFieldId = config?.class_field_id || config?.classFieldId || null
    const classHierarchyLevelName =
      config?.class_hierarchy_level_name ||
      config?.classHierarchyLevelName ||
      null

    // Prefer resolving class from explicit class_field_id, then fall back to category and segment lookup
    let resolvedClassId = null
    let resolvedCategoryId = null

    if (classFieldId) {
      const classFieldValue = this._getFieldResponseValue(
        formResponses,
        classFieldId,
        classHierarchyLevelName,
      )

      if (
        classFieldValue === undefined ||
        classFieldValue === null ||
        classFieldValue === ''
      ) {
        throw new Error(
          `Missing value for class_field_id ${classFieldId} required for asset tag group generation`,
        )
      }

      const { classId, categoryId: catId } =
        await this._resolveClassFromFieldValue(classFieldValue, transaction)
      resolvedClassId = classId
      resolvedCategoryId = catId
    }

    const categoryId =
      assetData.category_id ||
      assetData.categoryId ||
      resolvedCategoryId ||
      null
    const categoryClassId =
      resolvedClassId ||
      (await this._getCategoryClassId(categoryId, transaction)) ||
      (await this._resolveClassIdFromResponses(
        formId,
        formResponses,
        config.segments,
        transaction,
      ))

    // If both class id and category id are present, enforce that the category belongs to that class
    if (categoryClassId && resolvedCategoryId) {
      const categoryClassFromCategory = await this._getCategoryClassId(
        resolvedCategoryId,
        transaction,
      )
      if (
        categoryClassFromCategory &&
        Number(categoryClassFromCategory) !== Number(categoryClassId)
      ) {
        throw new Error(
          'Selected category does not belong to the selected asset class for asset_tag_group',
        )
      }
    }

    const separator =
      typeof config.separator === 'string' && config.separator.length
        ? config.separator
        : '-'

    const parts = []
    const segments = Array.isArray(config.segments) ? config.segments : []
    let classToken = null

    const getFieldValue = (fieldId, hierarchyLevelName = null) =>
      this._getFieldResponseValue(formResponses, fieldId, hierarchyLevelName)

    if (segments.length) {
      for (const segment of segments) {
        if (!segment || !segment.type) continue

        if (segment.type === 'field') {
          const value = getFieldValue(
            segment.field_id,
            segment.hierarchy_level_name,
          )
          const hasValue = value !== undefined && value !== null && value !== ''
          const hasStatic =
            segment.static_value !== undefined &&
            segment.static_value !== null &&
            String(segment.static_value).length > 0

          if (!hasValue && !hasStatic) {
            throw new Error(
              `Missing value for asset tag group field_id ${segment.field_id}`,
            )
          }
          const chunkLength =
            Number(segment.max_length) && Number(segment.max_length) > 0
              ? Number(segment.max_length)
              : null
          // Match asset_tag behavior: prefer actual field value; fall back to static when value absent
          const valToUse = hasValue ? value : segment.static_value
          const chunk = this._valueToTagChunk(valToUse, chunkLength)
          parts.push(chunk)

          // Capture class token for class-scoped sequencing if this segment is the Asset Class level
          const isAssetClassLevel =
            segment.hierarchy_level_name &&
            typeof segment.hierarchy_level_name === 'string' &&
            segment.hierarchy_level_name.toLowerCase() === 'asset class'

          const isConfiguredClassField =
            classFieldId && String(segment.field_id) === String(classFieldId)

          if (isAssetClassLevel || isConfiguredClassField) {
            classToken = chunk
          }
        } else if (segment.type === 'sequence') {
          const length = Number(segment.length) || 4
          const start = Number(segment.start) || 1
          const prefix = parts.join(separator)
          const nextSeq = await this._computeGroupSequence(
            prefix,
            separator,
            length,
            start + sequenceOffset,
            transaction,
            categoryClassId,
            classToken,
          )
          const seqPart = String(nextSeq).padStart(length, '0')
          parts.push(seqPart)
        } else {
          logger.warn('Unknown asset_tag_group segment type, skipping', {
            segment,
          })
        }
      }
    } else {
      // Fallback to legacy behavior if segments are absent
      const getFieldValueSimple = (fieldId) =>
        this._getFieldResponseValue(formResponses, fieldId, null)

      if (config.field_id) {
        const value = getFieldValueSimple(config.field_id)
        if (value === undefined || value === null || value === '') {
          throw new Error(
            `Missing value for asset tag group field_id ${config.field_id}`,
          )
        }
        const chunkLength =
          Number(config.field_length) ||
          Number(config.fieldLength) ||
          Number(config.length) ||
          12
        parts.push(this._valueToTagChunk(value, chunkLength))
      }

      if (config.asset_class_category_tag) {
        parts.push(this._valueToTagChunk(config.asset_class_category_tag, 24))
      }

      if (config.sequence) {
        const length = Number(config.sequence.length) || 4
        const start = Number(config.sequence.start) || 1
        const prefix = parts.join(separator)
        const nextSeq = await this._computeGroupSequence(
          prefix,
          separator,
          length,
          start + sequenceOffset,
          transaction,
          categoryClassId,
        )
        const seqPart = String(nextSeq).padStart(length, '0')
        parts.push(seqPart)
      }
    }

    if (!parts.length) {
      return assetData.asset_tag_group || null
    }

    return parts.join(separator)
  }

  _slugCode(str, maxLen) {
    if (!str) return 'GEN'
    const cleaned = String(str)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')

    // If no maxLen is provided, keep the full cleaned string
    if (!maxLen || maxLen <= 0) {
      return cleaned || 'GEN'
    }

    const sliced = cleaned.slice(0, maxLen)
    return sliced || 'GEN'
  }

  _extractSeq(tag, categoryCode) {
    if (!tag) return null
    const match = String(tag).match(/-(\d{1,6})$/)
    return match ? parseInt(match[1], 10) : null
  }

  _parseBarcodeToId(barcodeText) {
    if (!barcodeText || typeof barcodeText !== 'string') return null
    const match = barcodeText.match(/ASSET-(\d+)/i)
    if (!match) return null
    const id = parseInt(match[1], 10)
    return Number.isFinite(id) ? id : null
  }

  async _regenerateTagWithNextSeq(assetData, transaction, offset = 1) {
    // Kept for compatibility; now defers to _generateAssetTag with offset
    return this._generateAssetTag({
      assetData,
      transaction,
      sequenceOffset: offset,
    })
  }

  async _getFormTagConfig(formId, transaction) {
    const configs = await this._getFormTagConfigs(formId, transaction)
    return configs.asset_tag_config || null
  }

  async _getFormTagConfigs(formId, transaction) {
    if (!formId) return {}
    const form = await FormBuilder.findByPk(formId, { transaction })
    if (!form) return {}
    return {
      asset_tag_config: this._parseConfigObject(form.asset_tag_config),
      asset_tag_group_config: this._parseConfigObject(
        form.asset_tag_group_config,
      ),
    }
  }

  _parseConfigObject(raw) {
    if (raw === null || raw === undefined) return null
    if (typeof raw === 'object') return raw
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    }
    return raw
  }

  _valueToTagChunk(value, maxLen = null) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
      try {
        const flat = JSON.stringify(value)
        return this._slugCode(flat, maxLen)
      } catch {
        return this._slugCode(String(value), maxLen)
      }
    }
    return this._slugCode(String(value), maxLen)
  }

  async _computeConfigSequence(
    prefix,
    separator,
    length,
    start,
    transaction,
    columnName = 'asset_tag',
  ) {
    const column =
      columnName === 'asset_tag_group' ? 'asset_tag_group' : 'asset_tag'

    const safePrefix = prefix || ''
    const pattern = safePrefix ? `${safePrefix}${separator}%` : `%`

    const [rows] = await Asset.sequelize.query(
      `
        SELECT ${column}
        FROM assets
        WHERE ${column} LIKE :pattern
        ORDER BY asset_id DESC
        LIMIT 200
      `,
      { replacements: { pattern }, transaction },
    )

    const prefixWithSep = safePrefix ? `${safePrefix}${separator}` : ''
    const maxSeq = rows
      .map((r) => {
        const tag = String(r[column] || '')
        if (!tag.startsWith(prefixWithSep)) return null
        const remainder = tag.slice(prefixWithSep.length)
        const match = remainder.match(/^(\d+)/)
        return match ? parseInt(match[1], 10) : null
      })
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), start - 1)

    return maxSeq + 1
  }

  /**
   * Compute sequence for asset_tag_group with optional per-class scoping.
   * When categoryClassId is provided, sequence is computed only among assets
   * that belong to that asset_category_class (via asset_categories.asset_class_id).
   */
  async _computeGroupSequence(
    prefix,
    separator,
    length,
    start,
    transaction,
    categoryClassId = null,
    classToken = null,
  ) {
    const column = 'asset_tag_group'

    // When we captured the class token, count across all tags containing that class
    // token (middle segment), regardless of location prefix.
    if (classToken) {
      // Build LIKE pattern using the configured separator (supports backslash)
      const sepForLike = String(separator || '-').replace(/([%_\\])/g, '\\$1')
      const patternPrimary = `%${sepForLike}${classToken}${sepForLike}%`
      const patterns = [patternPrimary]

      const [rows] = await Asset.sequelize.query(
        `
          SELECT ${column}
          FROM assets
          WHERE ${patterns
            .map((_, idx) => `${column} LIKE :pattern${idx} ESCAPE '\\\\'`)
            .join(' OR ')}
          ORDER BY asset_id DESC
          LIMIT 500
        `,
        {
          replacements: patterns.reduce(
            (acc, p, idx) => ({ ...acc, [`pattern${idx}`]: p }),
            {},
          ),
          transaction,
        },
      )

      const maxSeq = rows
        .map((r) => {
          const tag = String(r[column] || '')
          const match = tag.match(/(\d+)$/)
          return match ? parseInt(match[1], 10) : null
        })
        .filter((n) => Number.isFinite(n))
        .reduce((a, b) => Math.max(a, b), start - 1)

      return maxSeq + 1
    }

    // If class token missing but class id exists, use class-scoped prefix matching
    if (categoryClassId) {
      const safePrefix = prefix || ''
      const sepForLike = String(separator || '-').replace(/([%_\\])/g, '\\$1')
      const prefixForPattern = safePrefix ? `${safePrefix}${sepForLike}` : ''
      const pattern = safePrefix ? `${prefixForPattern}%` : `%`
      const prefixWithSep = safePrefix ? `${safePrefix}${separator}` : ''

      const [rows] = await Asset.sequelize.query(
        `
          SELECT a.${column}
          FROM assets a
          LEFT JOIN asset_categories c ON a.category_id = c.category_id
          WHERE ${column} LIKE :pattern ESCAPE '\\\\'
            AND c.asset_class_id = :classId
          ORDER BY a.asset_id DESC
          LIMIT 200
        `,
        { replacements: { pattern, classId: categoryClassId }, transaction },
      )

      const maxSeq = rows
        .map((r) => {
          const tag = String(r[column] || '')
          if (!tag.startsWith(prefixWithSep)) return null
          const remainder = tag.slice(prefixWithSep.length)
          const match = remainder.match(/^(\\d+)/)
          return match ? parseInt(match[1], 10) : null
        })
        .filter((n) => Number.isFinite(n))
        .reduce((a, b) => Math.max(a, b), start - 1)

      return maxSeq + 1
    }

    // Fallback: prefix-scoped counter
    return this._computeConfigSequence(
      prefix,
      separator,
      length,
      start,
      transaction,
      column,
    )
  }

  async _getCategoryClassId(categoryId, transaction) {
    if (!categoryId) return null
    try {
      const [rows] = await Asset.sequelize.query(
        'SELECT asset_class_id FROM asset_categories WHERE category_id = :cid LIMIT 1',
        { replacements: { cid: categoryId }, transaction },
      )
      const raw = rows?.[0]?.asset_class_id
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? parsed : raw || null
    } catch (err) {
      logger.warn('Failed to resolve asset_class_id for category', {
        categoryId,
        error: err.message,
      })
      return null
    }
  }

  /**
   * Resolve asset_class_id (and optionally category_id) from a class_field value
   * supplied in the form payload. Accepts category ids, class ids, slugs, or names.
   */
  async _resolveClassFromFieldValue(rawValue, transaction) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return { classId: null, categoryId: null }
    }

    const numeric = Number(rawValue)
    if (Number.isFinite(numeric)) {
      // Direct class id
      const [classRows] = await Asset.sequelize.query(
        `
          SELECT asset_class_id
          FROM asset_category_classes
          WHERE asset_class_id = :id
          LIMIT 1
        `,
        { replacements: { id: numeric }, transaction },
      )
      if (classRows?.length) {
        return { classId: numeric, categoryId: null }
      }

      // Category id -> class id
      const [catRows] = await Asset.sequelize.query(
        `
          SELECT category_id, asset_class_id
          FROM asset_categories
          WHERE category_id = :cid
          LIMIT 1
        `,
        { replacements: { cid: numeric }, transaction },
      )
      if (catRows?.length) {
        const classIdRaw = catRows[0].asset_class_id
        const parsed = Number(classIdRaw)
        return {
          classId: Number.isFinite(parsed) ? parsed : classIdRaw || null,
          categoryId: catRows[0].category_id || numeric,
        }
      }
    }

    const val = String(rawValue)

    // Try match by class slug or name
    const [classRowsByText] = await Asset.sequelize.query(
      `
        SELECT asset_class_id
        FROM asset_category_classes
        WHERE LOWER(slug) = LOWER(:val) OR LOWER(name) = LOWER(:val)
        LIMIT 1
      `,
      { replacements: { val }, transaction },
    )
    if (classRowsByText?.length) {
      const classIdRaw = classRowsByText[0].asset_class_id
      const parsed = Number(classIdRaw)
      return {
        classId: Number.isFinite(parsed) ? parsed : classIdRaw || null,
        categoryId: null,
      }
    }

    // Try category name as a fallback
    const [catRowsByName] = await Asset.sequelize.query(
      `
        SELECT category_id, asset_class_id
        FROM asset_categories
        WHERE LOWER(name) = LOWER(:val)
        LIMIT 1
      `,
      { replacements: { val }, transaction },
    )
    if (catRowsByName?.length) {
      const classIdRaw = catRowsByName[0].asset_class_id
      const parsed = Number(classIdRaw)
      return {
        classId: Number.isFinite(parsed) ? parsed : classIdRaw || null,
        categoryId: catRowsByName[0].category_id || null,
      }
    }

    return { classId: null, categoryId: null }
  }

  /**
   * Resolve a value from formResponses for a given field, with optional hierarchy level.
   */
  _getFieldResponseValue(formResponses, fieldId, hierarchyLevelName = null) {
    const key = String(fieldId)
    if (
      !formResponses ||
      typeof formResponses !== 'object' ||
      !Object.prototype.hasOwnProperty.call(formResponses, key)
    ) {
      return undefined
    }

    const raw = formResponses[key]

    // Handle hierarchical_select structure: { selections, resolved: [{ level, id, label }] }
    if (
      hierarchyLevelName &&
      raw &&
      typeof raw === 'object' &&
      Array.isArray(raw.resolved)
    ) {
      const match = raw.resolved.find(
        (r) =>
          r &&
          typeof r.level === 'string' &&
          r.level.toLowerCase() === hierarchyLevelName.toLowerCase(),
      )
      if (match) {
        return match.id ?? match.label ?? match.value ?? undefined
      }
    }

    // If no resolved array yet (e.g., during create before persistence), try direct selection map
    if (hierarchyLevelName && raw && typeof raw === 'object') {
      const selections =
        typeof raw.selections === 'object' && raw.selections !== null
          ? raw.selections
          : raw

      const tryKeys = [
        hierarchyLevelName,
        hierarchyLevelName.toLowerCase(),
        hierarchyLevelName.replace(/\s+/g, '_'),
        hierarchyLevelName.toLowerCase().replace(/\s+/g, '_'),
      ]

      for (const k of tryKeys) {
        if (
          Object.prototype.hasOwnProperty.call(selections, k) &&
          selections[k] !== undefined
        ) {
          return selections[k]
        }
      }
    }

    return raw
  }

  /**
   * Resolve asset_class_id from form responses when category_id is missing.
   * Uses hierarchy segment with hierarchy_level_name 'Asset Class' (case-insensitive).
   */
  async _resolveClassIdFromResponses(
    formId,
    formResponses,
    segments = [],
    transaction,
  ) {
    if (!formResponses || typeof formResponses !== 'object') return null

    const classSegment = (segments || []).find(
      (s) =>
        s?.type === 'field' &&
        typeof s.hierarchy_level_name === 'string' &&
        s.hierarchy_level_name.toLowerCase() === 'asset class',
    )

    if (!classSegment) return null

    const rawVal = this._getFieldResponseValue(
      formResponses,
      classSegment.field_id,
      classSegment.hierarchy_level_name,
    )
    if (rawVal === undefined || rawVal === null || rawVal === '') return null

    // If numeric, treat as ID
    const numeric = Number(rawVal)
    if (Number.isFinite(numeric)) return numeric

    // Otherwise try to resolve by slug or name (case-insensitive)
    try {
      const [rows] = await Asset.sequelize.query(
        `
          SELECT asset_class_id
          FROM asset_category_classes
          WHERE LOWER(slug) = LOWER(:val) OR LOWER(name) = LOWER(:val)
          LIMIT 1
        `,
        { replacements: { val: String(rawVal) }, transaction },
      )
      const raw = rows?.[0]?.asset_class_id
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? parsed : raw || null
    } catch (err) {
      logger.warn('Failed to resolve asset_class_id from form responses', {
        value: rawVal,
        error: err.message,
      })
      return null
    }
  }

  async _computeNextSeq(categoryId, categoryCode, transaction) {
    try {
      const whereClause = categoryId
        ? 'category_id = :cid'
        : 'category_id IS NULL'

      const replacements = categoryId ? { cid: categoryId } : {}

      const [rows] = await Asset.sequelize.query(
        `
        SELECT asset_tag
        FROM assets
        WHERE ${whereClause}
          AND asset_tag IS NOT NULL
        ORDER BY asset_id DESC
        LIMIT 200
        `,
        { replacements, transaction },
      )

      const maxSeq = rows
        .map((r) => this._extractSeq(r.asset_tag, categoryCode))
        .filter((n) => Number.isFinite(n))
        .reduce((a, b) => Math.max(a, b), 0)

      return maxSeq + 1
    } catch (err) {
      logger.warn(
        'Failed to compute next asset tag sequence, defaulting to 1',
        {
          categoryId,
          error: err.message,
        },
      )
      return 1
    }
  }

  _parseHierarchyLevels(raw) {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'object') return Object.values(raw)
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  async _resolveHierarchySelection(field, rawValue) {
    if (!rawValue || typeof rawValue !== 'object') {
      return { selections: rawValue, resolved: [] }
    }

    const levels = this._parseHierarchyLevels(field.hierarchy_levels)
    if (!levels.length) return { selections: rawValue, resolved: [] }

    const qi = Asset.sequelize.getQueryInterface()
    const qg = qi.queryGenerator

    const resolved = []
    for (const level of levels) {
      if (!level) continue
      const { name, table, label_key: labelKey, value_key: valueKey } = level
      if (!name || !table || !labelKey || !valueKey) continue

      if (
        !IDENTIFIER_REGEX.test(table) ||
        !IDENTIFIER_REGEX.test(labelKey) ||
        !IDENTIFIER_REGEX.test(valueKey)
      ) {
        logger.warn('Hierarchy level contains invalid identifiers, skipping', {
          fieldId: field.id,
          level,
        })
        continue
      }

      const id =
        rawValue[name] ??
        rawValue[name?.toLowerCase?.()] ??
        rawValue[String(name).replace(/\s+/g, '_')]

      if (id === undefined || id === null) continue

      const sql = `SELECT ${qg.quoteIdentifier(
        labelKey,
      )} AS label FROM ${qg.quoteTable(table)} WHERE ${qg.quoteIdentifier(
        valueKey,
      )} = :id LIMIT 1`

      let label = null
      try {
        const [rows] = await Asset.sequelize.query(sql, {
          replacements: { id },
        })
        label = rows?.[0]?.label ?? null
      } catch (err) {
        logger.warn('Failed to resolve hierarchy label', {
          fieldId: field.id,
          level,
          error: err.message,
        })
      }

      resolved.push({ level: name, id, label })
    }

    return { selections: rawValue, resolved }
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
      } else if (field.type === 'hierarchical_select') {
        processedValue = await this._resolveHierarchySelection(field, rawValue)
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
          field_type: fv.field?.type || null,
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

  /**
   * Build a compact payload to encode inside the QR code.
   * Keeps core asset info and the provided form responses.
   */
  _buildQrPayload({
    asset,
    formResponses = {},
    formId = null,
    barcodeNumber = null,
    barcodePath = null,
  }) {
    if (!asset) return {}

    const payload = {
      version: '1',
      generated_at: new Date().toISOString(),
      asset_id: asset.asset_id,
      asset_tag: asset.asset_tag,
      asset_tag_group: asset.asset_tag_group,
      status: asset.status,
      approval_status: asset.approval_status,
      asset_location: asset.asset_location,
      category_id: asset.category_id ?? null,
      form_id: formId || asset.active_form_id || null,
      barcode: barcodeNumber || barcodePath || asset.barcode || null,
      form_responses:
        formResponses && Object.keys(formResponses).length
          ? formResponses
          : undefined,
    }

    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    )
  }

  /**
   * Generate and persist a QR code image for an asset.
   */
  async _generateAndStoreQrCode(
    asset,
    {
      formResponses = {},
      formId = null,
      barcodeNumber = null,
      barcodePath = null,
    } = {},
  ) {
    if (!asset || !asset.asset_id) return null

    const qrDir = path.join(__dirname, '../public/qrcodes')
    await fs.mkdir(qrDir, { recursive: true })

    const qrFilename = `qrcode_${asset.asset_id}.png`
    const fullQrPath = path.join(qrDir, qrFilename)

    const qrPayload = this._buildQrPayload({
      asset,
      formResponses,
      formId,
      barcodeNumber,
      barcodePath,
    })

    await generateQrCodeFile(qrPayload, fullQrPath, { width: 360 })

    const relativePath = `/qrcodes/${qrFilename}`
    await Asset.update(
      { qr_code: relativePath },
      { where: { asset_id: asset.asset_id } },
    )

    return relativePath
  }

  /**
   * Generate barcode + QR (using the same payload) and a combined sheet with both side by side.
   * Keeps naming and options consistent with /api/assets/codes.
   */
  async _generateAndStoreAssetCodes({
    asset,
    barcodeSourceText,
    qrPayload = null,
    orgLogoUrl = null,
    transaction,
  }) {
    if (!asset || !asset.asset_id || !barcodeSourceText) {
      throw new Error(
        'asset and barcodeSourceText are required for code generation',
      )
    }

    const codesDir = path.join(__dirname, '../public/codes')
    await fs.mkdir(codesDir, { recursive: true })

    const baseName = `asset_${asset.asset_id}`
    const barcodeFilename = `${baseName}_barcode.png`
    const qrFilename = `${baseName}_qrcode.png`
    const sheetFilename = `${baseName}_codes.png`

    const fullBarcodePath = path.join(codesDir, barcodeFilename)
    const fullQrPath = path.join(codesDir, qrFilename)
    const fullSheetPath = path.join(codesDir, sheetFilename)

    await generateBarcodeFile(barcodeSourceText, fullBarcodePath, {
      includeText: true,
    })

    // Generate QR without embedding logo (plain QR, using supplied payload when provided)
    const qrData = qrPayload || barcodeSourceText
    await generateQrCodeFile(qrData, fullQrPath, { width: 360 })

    // Build codesheet
    let sheetCreated = false
    try {
      const qrImg = await Jimp.read(fullQrPath)

      const gutter = 24

      if (orgLogoUrl) {
        // Layout: company logo (large) on the left, QR on the right, asset tag centered below
        let logoImg = null
        try {
          logoImg = await Jimp.read(orgLogoUrl)
        } catch (logoErr) {
          logger.warn('Failed to read organization logo for codesheet', {
            error: logoErr?.message,
          })
          logoImg = null
        }

        if (logoImg) {
          const desiredLogoHeight = Math.floor(qrImg.getHeight() * 0.9)
          const logoWidth = Math.floor(
            (logoImg.getWidth() / logoImg.getHeight()) * desiredLogoHeight,
          )
          logoImg.resize(logoWidth, desiredLogoHeight, Jimp.RESIZE_BILINEAR)

          const contentHeight = Math.max(desiredLogoHeight, qrImg.getHeight())
          const sheetWidth = logoImg.getWidth() + qrImg.getWidth() + gutter * 3
          const sheetHeight = contentHeight + gutter * 3 // extra gutter for tag text
          const sheet = new Jimp(sheetWidth, sheetHeight, 0xffffffff)

          const logoX = gutter
          const logoY = gutter + (contentHeight - logoImg.getHeight()) / 2
          const qrX = logoX + logoImg.getWidth() + gutter
          const qrY = gutter + (contentHeight - qrImg.getHeight()) / 2

          sheet.composite(logoImg, logoX, logoY)
          sheet.composite(qrImg, qrX, qrY)

          const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)
          const labelText = asset.asset_tag || barcodeSourceText
          const textWidth = Jimp.measureText(font, labelText)
          const textX = (sheetWidth - textWidth) / 2
          const textY = gutter + contentHeight + gutter / 2
          sheet.print(font, textX, textY, labelText)

          await sheet.writeAsync(fullSheetPath)
        } else {
          // If logo failed to load, fall back to QR-only layout
          const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)
          const labelText = asset.asset_tag || barcodeSourceText
          const textWidth = Jimp.measureText(font, labelText)
          const textHeight = Jimp.measureTextHeight(font, labelText, textWidth)

          const innerWidth = Math.max(qrImg.getWidth(), textWidth)
          const sheetWidth = innerWidth + gutter * 2
          const sheetHeight = qrImg.getHeight() + textHeight + gutter * 3
          const sheet = new Jimp(sheetWidth, sheetHeight, 0xffffffff)

          const qrX = gutter + (innerWidth - qrImg.getWidth()) / 2
          const qrY = gutter
          const textX = gutter + (innerWidth - textWidth) / 2
          const textY = qrY + qrImg.getHeight() + gutter

          sheet.composite(qrImg, qrX, qrY)
          sheet.print(font, textX, textY, labelText)

          await sheet.writeAsync(fullSheetPath)
        }
      } else {
        // Fallback: center QR with asset tag underneath (no logo available)
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)
        const labelText = asset.asset_tag || barcodeSourceText
        const textWidth = Jimp.measureText(font, labelText)
        const textHeight = Jimp.measureTextHeight(font, labelText, textWidth)

        const innerWidth = Math.max(qrImg.getWidth(), textWidth)
        const sheetWidth = innerWidth + gutter * 2
        const sheetHeight = qrImg.getHeight() + textHeight + gutter * 3
        const sheet = new Jimp(sheetWidth, sheetHeight, 0xffffffff)

        const qrX = gutter + (innerWidth - qrImg.getWidth()) / 2
        const qrY = gutter
        const textX = gutter + (innerWidth - textWidth) / 2
        const textY = qrY + qrImg.getHeight() + gutter

        sheet.composite(qrImg, qrX, qrY)
        sheet.print(font, textX, textY, labelText)

        await sheet.writeAsync(fullSheetPath)
      }

      sheetCreated = true
    } catch (sheetError) {
      logger.warn(
        'Failed to build combined code sheet; continuing with individual codes',
        {
          asset_id: asset.asset_id,
          error: sheetError.message,
        },
      )
    }

    const barcodePath = `/codes/${barcodeFilename}`
    const qrCodePath = `/codes/${qrFilename}`
    const sheetPath = sheetCreated ? `/codes/${sheetFilename}` : null

    await asset.update(
      { barcode: barcodePath, qr_code: qrCodePath, codesheet_path: sheetPath },
      { transaction },
    )

    // Ensure in-memory copy has the value for immediate response usage
    asset.setDataValue('codesheet_path', sheetPath)

    logger.info('Asset codes generated', {
      asset_id: asset.asset_id,
      barcodeTextLength: barcodeSourceText.length,
      barcodePath,
      qrCodePath,
      sheetPath,
    })

    return { barcodePath, qrCodePath, sheetPath }
  }

  /**
   * Build a human-readable text block for QR payload, prioritizing asset_tag first,
   * then selected form field labels/values. Skips camera and location field types.
   */
  async _buildHumanReadableQrString({
    asset,
    formId = null,
    formResponses = {},
    transaction,
  }) {
    const lines = []

    if (asset?.asset_tag) {
      lines.push(`ASSET TAG: ${asset.asset_tag}`)
    }

    if (asset?.name) {
      lines.push(`NAME: ${asset.name}`)
    }

    if (asset?.status) {
      lines.push(`STATUS: ${asset.status}`)
    }

    if (!formId) {
      return lines.join('\n\n')
    }

    const fields = await FormFields.findAll({
      where: { form_id: formId },
      attributes: ['id', 'label', 'type'],
      order: [['position', 'ASC']],
      transaction,
    })

    const SKIP_TYPES = new Set(['camera', 'location'])

    for (const field of fields) {
      if (!field) continue
      if (SKIP_TYPES.has(String(field.type || '').toLowerCase())) continue

      const val =
        formResponses?.[String(field.id)] ??
        formResponses?.[field.id] ??
        undefined
      if (val === undefined || val === null || val === '') continue

      const rendered = this._stringifyFormValue(val)
      if (!rendered) continue

      const label = field.label || `Field ${field.id}`
      lines.push(`${label.toUpperCase()}: ${rendered}`)
    }

    return lines.join('\n\n')
  }

  /**
   * Convert various form value shapes into a readable string.
   */
  _stringifyFormValue(val) {
    if (val === null || val === undefined) return ''

    if (Array.isArray(val)) {
      return val
        .map((v) => this._stringifyFormValue(v))
        .filter(Boolean)
        .join(', ')
    }

    if (typeof val === 'object') {
      if (Array.isArray(val.resolved)) {
        const resolved = val.resolved
          .map((r) => r?.label || r?.value || r?.id)
          .filter(Boolean)
        if (resolved.length) return resolved.join(' / ')
      }
      if (val.selections && typeof val.selections === 'object') {
        return Object.values(val.selections)
          .map((v) => this._stringifyFormValue(v))
          .filter(Boolean)
          .join(', ')
      }
      return Object.values(val)
        .map((v) => this._stringifyFormValue(v))
        .filter(Boolean)
        .join(', ')
    }

    return String(val)
  }

  /**
   * Fetch existing form responses as a simple object for QR embedding.
   */
  async _fetchFormResponsesForQr(assetId) {
    const values = await AssetFormValue.findAll({
      where: { asset_id: assetId },
      attributes: ['form_field_id', 'value'],
    })

    return values.reduce((acc, row) => {
      acc[String(row.form_field_id)] = _parseResponseValue(row.value)
      return acc
    }, {})
  }

  /**
   * Generate standalone barcode and QR code files from provided payloads.
   * @param {Object} params
   * @param {string} params.barcodeText - Text to encode in the barcode image.
   * @param {Object} params.qrData - JSON object to embed inside the QR code.
   * @returns {Promise<{barcodePath: string, qrCodePath: string}>}
   */
  async generateAdhocCodes({
    barcodeText,
    qrData,
    logoPath = null,
    logoScale = null,
  }) {
    if (!barcodeText || typeof barcodeText !== 'string') {
      throw new Error('barcodeText is required and must be a non-empty string')
    }

    const isValidObject =
      qrData !== null && typeof qrData === 'object' && !Array.isArray(qrData)

    // if (!isValidObject) {
    //   throw new Error('qrData must be a JSON object')
    // }

    const uniqueSuffix =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

    const barcodeDir = path.join(__dirname, '../public/barcodes/custom')
    await fs.mkdir(barcodeDir, { recursive: true })
    const barcodeFilename = `custom_barcode_${uniqueSuffix}.png`
    const fullBarcodePath = path.join(barcodeDir, barcodeFilename)

    await generateBarcodeFile(barcodeText, fullBarcodePath, {
      includeText: true,
    })

    const qrDir = path.join(__dirname, '../public/qrcodes/custom')
    await fs.mkdir(qrDir, { recursive: true })
    const qrFilename = `custom_qrcode_${uniqueSuffix}.png`
    const fullQrPath = path.join(qrDir, qrFilename)

    await generateQrCodeFile(qrData, fullQrPath, {
      width: 360,
      logoPath: logoPath || undefined,
      logoScale: logoScale || undefined,
    })

    const barcodePath = `/barcodes/custom/${barcodeFilename}`
    const qrCodePath = `/qrcodes/custom/${qrFilename}`
    const sheetPath = `/barcodes/custom/custom_codesheet_${uniqueSuffix}.png`

    logger.info('Ad-hoc barcode and QR code generated', {
      barcodeTextLength: barcodeText.length,
      hasQrData: Boolean(qrData && Object.keys(qrData).length),
      barcodePath,
      qrCodePath,
    })

    return { barcodePath, qrCodePath }
  }
}

function generateJointCodeSheet(barcodePath, qrPath, outputPath) {
  return new Promise((resolve, reject) => {
    Jimp.read([barcodePath, qrPath])
      .then(([barcodeImg, qrImg]) => {
        const gutter = 24
        const innerHeight = Math.max(barcodeImg.getHeight(), qrImg.getHeight())
        const sheetHeight = innerHeight + gutter * 2
    const sheetWidth = barcodeImg.getWidth() + qrImg.getWidth() + gutter * 3
        const sheet = new Jimp(sheetWidth, sheetHeight, 0xffffffff)
        sheet.composite(barcodeImg, gutter, gutter)
        sheet.composite(qrImg, barcodeImg.getWidth() + gutter * 2, gutter)
        sheet.write(outputPath, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve(outputPath)
          }
        })
      })
      .catch(reject)
  })
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
