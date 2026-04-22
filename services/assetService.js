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
const http = require('http')
const https = require('https')
const { Op } = require('sequelize')

const IDENTIFIER_REGEX = /^[A-Za-z0-9_]+$/
const PRINT_LABEL_WIDTH = 400
const PRINT_LABEL_HEIGHT = 200
const PRINT_LABEL_SIDE_PADDING = 12
const PRINT_ROW_GAP = 10
const PRINT_TAG_GAP = 6
const PRINT_QR_SIZE = 112
const PRINT_LOGO_MAX_WIDTH = 110
const PRINT_LOGO_MAX_HEIGHT = 56
const IMAGE_EXPORT_DOWNLOAD_CONCURRENCY = 4
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50
const ZIP_LOCAL_FILE_HEADER = 0x04034b50
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50
const ZIP_VERSION = 20

const CRC32_TABLE = (() => {
  const table = new Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

async function buildScaledAssetTagLabel(labelText, maxWidth = null) {
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)
  const textWidth = Jimp.measureText(font, labelText)
  const textHeight = Jimp.measureTextHeight(font, labelText, textWidth)
  const labelImage = new Jimp(textWidth, textHeight, 0x00000000)

  labelImage.print(font, 0, 0, labelText)

  if (maxWidth && labelImage.getWidth() > maxWidth) {
    const scaledHeight = Math.max(
      Math.round((labelImage.getHeight() * maxWidth) / labelImage.getWidth()),
      1,
    )
    labelImage.resize(maxWidth, scaledHeight, Jimp.RESIZE_BILINEAR)
  }

  return labelImage
}

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

      const formConfigs = form_id
        ? await this._getFormTagConfigs(form_id, transaction)
        : {}

      const generateTags = async (offset = 0, force = false) => {
        const tags = {}

        if (force || !sanitizedCoreData.asset_tag) {
          tags.asset_tag = await this._generateAssetTag({
            assetData: { ...sanitizedCoreData, ...tags },
            formId: form_id,
            formResponses: form_responses,
            tagConfig: formConfigs?.asset_tag_config || null,
            transaction,
            sequenceOffset: offset,
          })
        }

        if (
          formConfigs?.asset_tag_group_config?.enabled &&
          (force || !sanitizedCoreData.asset_tag_group)
        ) {
          tags.asset_tag_group = await this._generateAssetTagGroup({
            assetData: { ...sanitizedCoreData, ...tags },
            formId: form_id,
            formResponses: form_responses,
            tagGroupConfig: formConfigs.asset_tag_group_config,
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
          qrCodeConfig: formConfigs?.qr_code_config || null,
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

    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      ...filters
    } = normalizedParams

    const summaryWhere = {
      ...this.crudService._buildWhereClause(filters, search),
      ...(additionalOptions.where || {}),
    }

    const [totalApproved, totalPending] = await Promise.all([
      Asset.count({
        where: {
          ...summaryWhere,
          approval_status: 'APPROVED',
        },
      }),
      Asset.count({
        where: {
          ...summaryWhere,
          approval_status: 'PENDING',
        },
      }),
    ])

    return this._withFlatFields({
      ...result,
      summary: {
        totalCaptured: result.pagination?.totalItems || 0,
        totalApproved,
        totalPending,
      },
    })
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
      limit,
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

    const hasLimit =
      limit !== undefined && limit !== null && String(limit).trim() !== ''
    const parsedLimit = hasLimit ? parseInt(limit, 10) : null
    const cappedLimit =
      parsedLimit && Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 200)
        : null
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

    sql += ` ORDER BY ${safeLabel} ${sortDirection}`

    if (cappedLimit) {
      sql += ` LIMIT ${cappedLimit}`
    }

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

  async exportAssetsArchive() {
    const exportData = await this._prepareAssetsExportData()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exportsDir = path.join(__dirname, '../public/exports')
    await fs.mkdir(exportsDir, { recursive: true })
    const fileName = `assets-export-${timestamp}.zip`
    const publicPath = `/exports/${fileName}`
    const zipEntries = [
      {
        path: `assets-data-${timestamp}.xlsx`,
        data: exportData.workbookBuffer,
      },
      ...exportData.imageEntries,
    ]
    const buffer = createZipArchive(zipEntries)
    await fs.writeFile(path.join(exportsDir, fileName), buffer)

    return {
      fileName,
      publicPath,
      assetCount: exportData.assetCount,
      worksheetCount: exportData.worksheetCount,
      imageCount: exportData.imageCount,
      skippedImages: exportData.skippedImages,
    }
  }

  async exportAssetsExcel() {
    const exportData = await this._prepareAssetsExportData({ includeImages: false })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exportsDir = path.join(__dirname, '../public/exports')
    await fs.mkdir(exportsDir, { recursive: true })
    const fileName = `assets-export-excel-${timestamp}.xlsx`
    const publicPath = `/exports/${fileName}`

    await fs.writeFile(path.join(exportsDir, fileName), exportData.workbookBuffer)

    return {
      fileName,
      publicPath,
      assetCount: exportData.assetCount,
      worksheetCount: exportData.worksheetCount,
    }
  }

  async exportAssetImages() {
    const exportData = await this._prepareAssetsExportData({ includeWorkbook: false })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exportsDir = path.join(__dirname, '../public/exports')
    await fs.mkdir(exportsDir, { recursive: true })
    const fileName = `assets-export-images-${timestamp}.zip`
    const publicPath = `/exports/${fileName}`
    const zipEntries = exportData.imageEntries.length
      ? exportData.imageEntries
      : [
          {
            path: 'README.txt',
            data: Buffer.from('No asset images were found for export.', 'utf8'),
          },
        ]

    const buffer = createZipArchive(zipEntries)
    await fs.writeFile(path.join(exportsDir, fileName), buffer)

    return {
      fileName,
      publicPath,
      assetCount: exportData.assetCount,
      imageCount: exportData.imageCount,
      skippedImages: exportData.skippedImages,
    }
  }

  async exportAssetImagesArchive({ onProgress } = {}) {
    const imageManifest = await this._collectAssetImageExportManifest()
    const totalItems = imageManifest.imageTargets.length

    if (typeof onProgress === 'function') {
      await onProgress({
        progress: totalItems ? 0 : 100,
        totalItems,
        processedItems: 0,
        assetCount: imageManifest.assetCount,
        imageCount: 0,
        skippedImages: 0,
      })
    }

    const { imageEntries, skippedImages } = await this._downloadAssetImageEntries(
      imageManifest.imageTargets,
      {
        assetCount: imageManifest.assetCount,
        onProgress,
      },
    )

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exportsDir = path.join(__dirname, '../public/exports')
    await fs.mkdir(exportsDir, { recursive: true })
    const fileName = `assets-export-images-${timestamp}.zip`
    const publicPath = `/exports/${fileName}`
    const zipEntries = imageEntries.length
      ? imageEntries
      : [
          {
            path: 'README.txt',
            data: Buffer.from('No asset images were found for export.', 'utf8'),
          },
        ]

    const buffer = createZipArchive(zipEntries)
    await fs.writeFile(path.join(exportsDir, fileName), buffer)

    return {
      fileName,
      publicPath,
      assetCount: imageManifest.assetCount,
      imageCount: imageEntries.length,
      skippedImages,
      totalItems,
    }
  }

  async _prepareAssetsExportData({
    includeWorkbook = true,
    includeImages = true,
  } = {}) {
    const forms = await FormBuilder.findAll({
      attributes: ['form_id', 'name'],
      include: [
        {
          model: FormFields,
          as: 'fields',
          attributes: ['id', 'label', 'type', 'position'],
          required: false,
        },
      ],
      order: [
        ['name', 'ASC'],
        [{ model: FormFields, as: 'fields' }, 'position', 'ASC'],
      ],
    })

    const assets = await Asset.findAll({
      include: [
        {
          model: AssetFormValue,
          as: 'formValues',
          attributes: ['form_field_id', 'value'],
          required: false,
          include: [
            {
              model: FormFields,
              as: 'field',
              attributes: ['id', 'label', 'type', 'position'],
            },
          ],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email', 'employee_id'],
          required: false,
        },
        {
          model: FormBuilder,
          as: 'activeForm',
          attributes: ['form_id', 'name'],
          required: false,
        },
      ],
      order: [
        ['created_at', 'DESC'],
        [{ model: AssetFormValue, as: 'formValues' }, 'form_field_id', 'ASC'],
      ],
    })

    const formsById = new Map(forms.map((form) => [form.form_id, form]))
    const groups = new Map()

    for (const assetRecord of assets) {
      const asset = assetRecord.get({ plain: true })
      const formId = asset.active_form_id || null
      const fallbackForm = formId ? formsById.get(formId) : null
      const formName =
        asset.activeForm?.name ||
        fallbackForm?.name ||
        (formId ? `Form ${formId}` : 'Unassigned Assets')
      const fieldsFromAssetValues = (asset.formValues || [])
        .map((entry) => entry.field)
        .filter(Boolean)
      const fields = (asset.activeForm?.fields || fallbackForm?.fields || fieldsFromAssetValues || [])
        .slice()
        .sort((a, b) => (a.position || 0) - (b.position || 0))
      const groupKey = formId === null ? 'unassigned' : `form:${formId}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          formId,
          formName,
          fields,
          assets: [],
        })
      }

      const group = groups.get(groupKey)
      if (!group.fields.length && fields.length) {
        group.fields = fields
      }
      group.assets.push(asset)
    }

    if (!groups.size) {
      groups.set('Assets', {
        formId: null,
        formName: 'Assets',
        fields: [],
        assets: [],
      })
    }

    const imagePathByUrl = new Map()
    const worksheets = []

    for (const group of groups.values()) {
      const rows = []
      const baseHeaders = [
        'Asset ID',
        'Asset Tag',
        'Asset Class Tag',
        'Approval Status',
        'Created By',
        'Creator Email',
        'Employee ID',
        'Notes',
        'Barcode',
        'QR Code',
        'Created At',
        'Updated At',
      ]
      const fieldColumns = buildFieldColumnMap(group.fields, baseHeaders)

      for (const asset of group.assets) {
        const formValues = Array.isArray(asset.formValues) ? asset.formValues : []
        const valuesByFieldId = new Map(
          formValues.map((entry) => [String(entry.form_field_id), _parseResponseValue(entry.value)]),
        )

        const row = {
          'Asset ID': asset.asset_id,
          'Asset Tag': asset.asset_tag || '',
          'Asset Tag Group': asset.asset_tag_group || '',
          'Approval Status': asset.approval_status || '',
          'Created By': asset.creator?.full_name || '',
          'Creator Email': asset.creator?.email || '',
          'Employee ID': asset.creator?.employee_id || '',
          Notes: asset.notes || '',
          Barcode: asset.barcode || '',
          'QR Code': asset.qr_code || '',
          'Created At': this._formatExportDate(asset.created_at),
          'Updated At': this._formatExportDate(asset.updated_at),
        }

        for (const field of group.fields) {
          const rawValue = valuesByFieldId.get(String(field.id))
          const normalizedValue = this._normalizeExportFieldValue(rawValue)

          if (field.type === 'camera') {
            const imageUrls = this._extractImageUrls(rawValue)

            for (let index = 0; index < imageUrls.length; index += 1) {
              const imageUrl = imageUrls[index]
              if (!imagePathByUrl.has(imageUrl)) {
                const imagePath = this._buildExportImagePath({
                  formName: group.formName,
                  assetTag: asset.asset_tag,
                  imageIndex: index + 1,
                  imageUrl,
                })
                imagePathByUrl.set(imageUrl, imagePath)
              }
            }
          } else {
            const columns = fieldColumns.get(String(field.id))
            row[columns.valueHeader] = normalizedValue
          }
        }

        rows.push(row)
      }

      const orderedHeaders = [...baseHeaders]

      for (const field of group.fields) {
        if (field.type === 'camera') {
          continue
        }
        const columns = fieldColumns.get(String(field.id))
        orderedHeaders.push(columns.valueHeader)
      }

      worksheets.push({
        name: group.formName,
        headers: orderedHeaders,
        rows,
      })
    }

    const workbookBuffer = includeWorkbook
      ? this._buildXlsxBuffer(worksheets)
      : null

    const imageEntries = []
    let skippedImages = 0
    if (includeImages) {
      for (const [imageUrl, imagePath] of imagePathByUrl.entries()) {
        try {
          const { buffer } = await this._downloadFile(imageUrl)
          imageEntries.push({
            path: imagePath,
            data: buffer,
          })
        } catch (error) {
          skippedImages += 1
          logger.warn('Skipping asset export image download', {
            imageUrl,
            imagePath,
            error: error.message,
          })
        }
      }
    }

    return {
      workbookBuffer,
      imageEntries,
      assetCount: assets.length,
      worksheetCount: worksheets.length,
      imageCount: imageEntries.length,
      skippedImages,
    }
  }

  async _collectAssetImageExportManifest() {
    const assets = await Asset.findAll({
      attributes: ['asset_id', 'asset_tag', 'active_form_id'],
      include: [
        {
          model: AssetFormValue,
          as: 'formValues',
          attributes: ['form_field_id', 'value'],
          required: false,
          include: [
            {
              model: FormFields,
              as: 'field',
              attributes: ['id', 'label', 'type'],
              required: false,
            },
          ],
        },
        {
          model: FormBuilder,
          as: 'activeForm',
          attributes: ['form_id', 'name'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
    })

    const imagePathByUrl = new Map()

    for (const assetRecord of assets) {
      const asset = assetRecord.get({ plain: true })
      const formName = asset.activeForm?.name || 'Unassigned Assets'

      for (const entry of asset.formValues || []) {
        if (String(entry?.field?.type).toLowerCase() !== 'camera') {
          continue
        }

        const rawValue = _parseResponseValue(entry.value)
        const imageUrls = this._extractImageUrls(rawValue)

        for (let index = 0; index < imageUrls.length; index += 1) {
          const imageUrl = imageUrls[index]
          if (!imagePathByUrl.has(imageUrl)) {
            imagePathByUrl.set(imageUrl, {
              imageUrl,
              imagePath: this._buildExportImagePath({
                formName,
                assetTag: asset.asset_tag,
                imageIndex: index + 1,
                imageUrl,
              }),
            })
          }
        }
      }
    }

    return {
      assetCount: assets.length,
      imageTargets: Array.from(imagePathByUrl.values()),
    }
  }

  async _downloadAssetImageEntries(
    imageTargets,
    { assetCount = 0, onProgress } = {},
  ) {
    const targets = Array.isArray(imageTargets) ? imageTargets : []
    const imageEntries = []
    let skippedImages = 0
    let processedItems = 0
    let currentIndex = 0
    const concurrency = Math.max(
      1,
      Math.min(IMAGE_EXPORT_DOWNLOAD_CONCURRENCY, targets.length || 1),
    )

    const reportProgress = async () => {
      if (typeof onProgress !== 'function') {
        return
      }

      const progress = targets.length
        ? Math.min(
            100,
            Math.round((processedItems / Math.max(targets.length, 1)) * 100),
          )
        : 100

      await onProgress({
        progress,
        totalItems: targets.length,
        processedItems,
        assetCount,
        imageCount: imageEntries.length,
        skippedImages,
      })
    }

    const worker = async () => {
      while (currentIndex < targets.length) {
        const target = targets[currentIndex]
        currentIndex += 1

        try {
          const { buffer } = await this._downloadFile(target.imageUrl)
          imageEntries.push({
            path: target.imagePath,
            data: buffer,
          })
        } catch (error) {
          skippedImages += 1
          logger.warn('Skipping asset export image download', {
            imageUrl: target.imageUrl,
            imagePath: target.imagePath,
            error: error.message,
          })
        } finally {
          processedItems += 1
          await reportProgress()
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    return {
      imageEntries,
      skippedImages,
    }
  }

  _normalizeAssetFilters(params = {}) {
    const {
      form_id,
      start_date,
      end_date,
      startDate,
      endDate,
      ...rest
    } = params
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
      qr_code_config: this._parseConfigObject(form.qr_code_config),
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
    const assetTagScope =
      column === 'asset_tag'
        ? this._getAssetTagSequenceScope(safePrefix, separator)
        : null
    const pattern = assetTagScope
      ? `%${assetTagScope.searchToken}%`
      : safePrefix
        ? `${safePrefix}${separator}%`
        : `%`

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
        if (assetTagScope) {
          const tagParts = this._splitTagParts(tag, separator)
          const sequenceIndex = tagParts.length - 1
          const tagScope = tagParts.slice(
            sequenceIndex - assetTagScope.parts.length,
            sequenceIndex,
          )
          const matchesScope = assetTagScope.parts.every(
            (part, index) => tagScope[index] === part,
          )

          if (!matchesScope) return null

          const sequencePart = tagParts[sequenceIndex]
          return /^\d+$/.test(sequencePart)
            ? parseInt(sequencePart, 10)
            : null
        }

        if (!tag.startsWith(prefixWithSep)) return null
        const remainder = tag.slice(prefixWithSep.length)
        const match = remainder.match(/^(\d+)/)
        return match ? parseInt(match[1], 10) : null
      })
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), start - 1)

    return maxSeq + 1
  }

  _getAssetTagSequenceScope(prefix, separator) {
    const parts = this._splitTagParts(prefix, separator)

    // For tags like xx-xx-xx-xx-CE-APPLICATIONSERVERS-001, the sequence
    // should follow CE-APPLICATIONSERVERS instead of the full location prefix.
    if (parts.length < 6) return null

    const scopedParts = parts.slice(-2)
    return {
      parts: scopedParts,
      searchToken: `${scopedParts.join(separator)}${separator}`,
    }
  }

  _splitTagParts(value, separator) {
    if (!value) return []
    const safeSeparator =
      typeof separator === 'string' && separator.length ? separator : '-'

    return String(value)
      .split(safeSeparator)
      .filter((part) => part !== '')
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

    await generateQrCodeFile(qrPayload, fullQrPath, { width: 240, margin: 0 })

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
    const codesheetQrWidth = 240
    await generateQrCodeFile(qrData, fullQrPath, {
      width: codesheetQrWidth,
      margin: 0,
    })

    // Build codesheet
    let sheetCreated = false
    try {
      const qrImg = await Jimp.read(fullQrPath)
      const sheetQrImg = qrImg.clone()
      const combinedSheetQrSize = PRINT_QR_SIZE
      sheetQrImg.contain(
        combinedSheetQrSize,
        combinedSheetQrSize,
        Jimp.RESIZE_BILINEAR,
      )

      const sidePadding = PRINT_LABEL_SIDE_PADDING
      const logoQrGap = PRINT_ROW_GAP
      const textGap = PRINT_TAG_GAP
      const labelText = asset.asset_tag || barcodeSourceText
      const labelImg = await buildScaledAssetTagLabel(
        labelText,
        PRINT_LABEL_WIDTH - sidePadding * 2,
      )
      const textWidth = labelImg.getWidth()
      const textHeight = labelImg.getHeight()
      const sheet = new Jimp(PRINT_LABEL_WIDTH, PRINT_LABEL_HEIGHT, 0xffffffff)

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
          if (typeof logoImg.autocrop === 'function') {
            logoImg.autocrop({ cropOnlyFrames: false, leaveBorder: 0 })
          }

          const maxLogoWidth = PRINT_LOGO_MAX_WIDTH
          const maxLogoHeight = PRINT_LOGO_MAX_HEIGHT
          const logoScale = Math.min(
            maxLogoWidth / logoImg.getWidth(),
            maxLogoHeight / logoImg.getHeight(),
            1,
          )
          const logoWidth = Math.max(Math.floor(logoImg.getWidth() * logoScale), 1)
          const logoHeight = Math.max(
            Math.floor(logoImg.getHeight() * logoScale),
            1,
          )
          logoImg.resize(logoWidth, logoHeight, Jimp.RESIZE_BILINEAR)

          const rowHeight = Math.max(
            logoImg.getHeight(),
            sheetQrImg.getHeight(),
          )
          const contentWidth =
            logoImg.getWidth() + logoQrGap + sheetQrImg.getWidth()
          const contentX = (PRINT_LABEL_WIDTH - contentWidth) / 2
          const blockHeight = rowHeight + textGap + textHeight
          const blockY = (PRINT_LABEL_HEIGHT - blockHeight) / 2
          const logoX = contentX
          const logoY = blockY + (rowHeight - logoImg.getHeight()) / 2
          const qrX = logoX + logoImg.getWidth() + logoQrGap
          const qrY = blockY + (rowHeight - sheetQrImg.getHeight()) / 2

          sheet.composite(logoImg, logoX, logoY)
          sheet.composite(sheetQrImg, qrX, qrY)

          const textX = (PRINT_LABEL_WIDTH - textWidth) / 2
          const textY = blockY + rowHeight + textGap
          sheet.composite(labelImg, textX, textY)

          await sheet.writeAsync(fullSheetPath)
        } else {
          // If logo failed to load, fall back to QR-only layout
          const blockHeight = sheetQrImg.getHeight() + textGap + textHeight
          const blockY = (PRINT_LABEL_HEIGHT - blockHeight) / 2
          const qrX = (PRINT_LABEL_WIDTH - sheetQrImg.getWidth()) / 2
          const qrY = blockY
          const textX = (PRINT_LABEL_WIDTH - textWidth) / 2
          const textY = blockY + sheetQrImg.getHeight() + textGap

          sheet.composite(sheetQrImg, qrX, qrY)
          sheet.composite(labelImg, textX, textY)

          await sheet.writeAsync(fullSheetPath)
        }
      } else {
        // Fallback: center QR with asset tag underneath (no logo available)
        const blockHeight = sheetQrImg.getHeight() + textGap + textHeight
        const blockY = (PRINT_LABEL_HEIGHT - blockHeight) / 2
        const qrX = (PRINT_LABEL_WIDTH - sheetQrImg.getWidth()) / 2
        const qrY = blockY
        const textX = (PRINT_LABEL_WIDTH - textWidth) / 2
        const textY = blockY + sheetQrImg.getHeight() + textGap

        sheet.composite(sheetQrImg, qrX, qrY)
        sheet.composite(labelImg, textX, textY)

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
    qrCodeConfig = null,
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

    const parsedQrCodeConfig = this._parseConfigObject(qrCodeConfig)
    const selectedFieldIds = this._extractQrFieldIds(parsedQrCodeConfig)
    const selectedOrder = new Map(
      selectedFieldIds.map((id, index) => [Number(id), index]),
    )
    const configExplicitlyEnabled = Boolean(
      parsedQrCodeConfig &&
        typeof parsedQrCodeConfig === 'object' &&
        !Array.isArray(parsedQrCodeConfig) &&
        parsedQrCodeConfig.enabled === true,
    )
    const useConfiguredSelection =
      configExplicitlyEnabled || selectedFieldIds.length > 0

    const fieldsForQr = useConfiguredSelection
      ? fields
          .filter((field) => selectedOrder.has(Number(field.id)))
          .sort(
            (a, b) =>
              selectedOrder.get(Number(a.id)) - selectedOrder.get(Number(b.id)),
          )
      : fields

    const SKIP_TYPES = new Set(['camera', 'location'])

    for (const field of fieldsForQr) {
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

  _extractQrFieldIds(qrCodeConfig) {
    const parsed = this._parseConfigObject(qrCodeConfig)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return []
    }

    if (parsed.enabled === false) {
      return []
    }

    if (!Array.isArray(parsed.field_ids)) {
      return []
    }

    const normalized = parsed.field_ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
      .map((id) => Math.trunc(id))

    return [...new Set(normalized)]
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

  _normalizeExportFieldValue(value) {
    if (value === null || value === undefined) {
      return ''
    }

    if (typeof value === 'string') {
      return value
    }

    return this._stringifyFormValue(value)
  }

  _extractImageUrls(value) {
    if (!value) {
      return []
    }

    const values = Array.isArray(value) ? value : [value]

    return values
      .filter((entry) => typeof entry === 'string' && /^https?:\/\//i.test(entry))
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  _buildExportImagePath({
    formName,
    assetTag,
    imageIndex,
    imageUrl,
  }) {
    const folderName = sanitizePathSegment(formName || 'unassigned-assets')
    const fileName = buildExportImageFileName(assetTag, imageIndex, imageUrl)
    return `asset-images/${folderName}/${fileName}`
  }

  _formatExportDate(value) {
    if (!value) {
      return ''
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
  }

  _buildXlsxBuffer(worksheets) {
    const safeWorksheets = Array.isArray(worksheets) && worksheets.length
      ? worksheets
      : [{ name: 'Assets', headers: ['Message'], rows: [{ Message: 'No assets found' }] }]

    const usedNames = new Set()
    const normalizedSheets = safeWorksheets.map((worksheet, index) => {
      const headers = Array.isArray(worksheet.headers) ? worksheet.headers : []
      const rows = Array.isArray(worksheet.rows) ? worksheet.rows : []
      return {
        id: index + 1,
        relId: `rId${index + 1}`,
        fileName: `sheet${index + 1}.xml`,
        name: uniqueWorksheetName(worksheet.name, usedNames),
        headers,
        rows,
      }
    })

    const entries = [
      {
        path: '[Content_Types].xml',
        data: Buffer.from(buildXlsxContentTypes(normalizedSheets.length), 'utf8'),
      },
      {
        path: '_rels/.rels',
        data: Buffer.from(buildXlsxRootRels(), 'utf8'),
      },
      {
        path: 'docProps/app.xml',
        data: Buffer.from(buildXlsxAppProps(normalizedSheets), 'utf8'),
      },
      {
        path: 'docProps/core.xml',
        data: Buffer.from(buildXlsxCoreProps(), 'utf8'),
      },
      {
        path: 'xl/workbook.xml',
        data: Buffer.from(buildXlsxWorkbook(normalizedSheets), 'utf8'),
      },
      {
        path: 'xl/_rels/workbook.xml.rels',
        data: Buffer.from(buildXlsxWorkbookRels(normalizedSheets), 'utf8'),
      },
      {
        path: 'xl/styles.xml',
        data: Buffer.from(buildXlsxStyles(), 'utf8'),
      },
      ...normalizedSheets.map((sheet) => ({
        path: `xl/worksheets/${sheet.fileName}`,
        data: Buffer.from(buildXlsxWorksheet(sheet), 'utf8'),
      })),
    ]

    return createZipArchive(entries)
  }

  async _downloadFile(url) {
    const targetUrl = new URL(url)
    const client = targetUrl.protocol === 'http:' ? http : https

    return new Promise((resolve, reject) => {
      const request = client.get(targetUrl, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume()
          resolve(
            this._downloadFile(new URL(response.headers.location, targetUrl).toString()),
          )
          return
        }

        if (response.statusCode !== 200) {
          response.resume()
          reject(
            new Error(`Unexpected response status ${response.statusCode}`),
          )
          return
        }

        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: response.headers['content-type'] || null,
          })
        })
      })

      request.on('error', reject)
      request.setTimeout(20000, () => {
        request.destroy(new Error('Image download timed out'))
      })
    })
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

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeWorksheetName(name) {
  const base = String(name || 'Sheet')
    .replace(/[:\\/?*\[\]]/g, '_')
    .trim()
  return (base || 'Sheet').slice(0, 31)
}

function buildFieldColumnMap(fields, reservedHeaders = []) {
  const usedHeaders = new Set(reservedHeaders)
  const columnMap = new Map()

  for (const field of fields || []) {
    const baseLabel = String(field?.label || `Field ${field?.id || ''}`).trim() || `Field ${field?.id || ''}`
    const valueHeader = uniqueHeaderName(baseLabel, usedHeaders)
    const urlHeader =
      String(field?.type).toLowerCase() === 'camera'
        ? uniqueHeaderName(`${baseLabel} URLs`, usedHeaders)
        : null

    columnMap.set(String(field.id), {
      valueHeader,
      urlHeader,
    })
  }

  return columnMap
}

function uniqueWorksheetName(name, usedNames) {
  const base = sanitizeWorksheetName(name)
  let candidate = base
  let counter = 1

  while (usedNames.has(candidate)) {
    const suffix = `_${counter}`
    candidate = `${base.slice(0, Math.max(31 - suffix.length, 1))}${suffix}`
    counter += 1
  }

  usedNames.add(candidate)
  return candidate
}

function uniqueHeaderName(name, usedNames) {
  const base = String(name || 'Column').trim() || 'Column'
  let candidate = base
  let counter = 1

  while (usedNames.has(candidate)) {
    candidate = `${base} (${counter})`
    counter += 1
  }

  usedNames.add(candidate)
  return candidate
}

function sanitizePathSegment(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}

function buildExportImageFileName(assetTag, imageIndex, imageUrl) {
  const rawTag = String(assetTag || 'asset').trim()
  const safeTag = rawTag
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset'

  const originalName = getFileNameFromUrl(imageUrl)
  if (originalName) {
    return `${safeTag}_${originalName}`
  }

  const fileStem = `${sanitizePathSegment(safeTag)}_${String(imageIndex).padStart(3, '0')}`
  const extension = getExtensionFromUrl(imageUrl)
  return `${fileStem}${extension}`
}

function getExtensionFromUrl(imageUrl) {
  try {
    const parsed = new URL(imageUrl)
    const ext = path.extname(parsed.pathname || '').toLowerCase()
    if (ext && ext.length <= 5) {
      return ext
    }
  } catch {
    return '.jpg'
  }

  return '.jpg'
}

function getFileNameFromUrl(imageUrl) {
  try {
    const parsed = new URL(imageUrl)
    const fileName = path.basename(parsed.pathname || '').trim()
    if (!fileName) {
      return ''
    }

    return fileName.replace(/[\\/:*?"<>|]/g, '-')
  } catch {
    return ''
  }
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2) & 0x1f) >>> 0)
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f)

  return { dosDate, dosTime }
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createZipArchive(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const entry of entries) {
    const fileName = String(entry.path || '').replace(/\\/g, '/')
    const data = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data || '')
    const fileNameBuffer = Buffer.from(fileName, 'utf8')
    const checksum = crc32(data)
    const { dosDate, dosTime } = getDosDateTime()

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER, 0)
    localHeader.writeUInt16LE(ZIP_VERSION, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(checksum, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(fileNameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localParts.push(localHeader, fileNameBuffer, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER, 0)
    centralHeader.writeUInt16LE(ZIP_VERSION, 4)
    centralHeader.writeUInt16LE(ZIP_VERSION, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(checksum, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)

    centralParts.push(centralHeader, fileNameBuffer)
    offset += localHeader.length + fileNameBuffer.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const localFiles = Buffer.concat(localParts)
  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY, 0)
  endRecord.writeUInt16LE(0, 4)
  endRecord.writeUInt16LE(0, 6)
  endRecord.writeUInt16LE(entries.length, 8)
  endRecord.writeUInt16LE(entries.length, 10)
  endRecord.writeUInt32LE(centralDirectory.length, 12)
  endRecord.writeUInt32LE(localFiles.length, 16)
  endRecord.writeUInt16LE(0, 20)

  return Buffer.concat([localFiles, centralDirectory, endRecord])
}

function buildXlsxContentTypes(sheetCount) {
  const worksheetOverrides = Array.from({ length: sheetCount }, (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${worksheetOverrides}
</Types>`
}

function buildXlsxRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

function buildXlsxAppProps(sheets) {
  const titles = sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>OpenAI Export</Application>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">${titles}</vt:vector>
  </TitlesOfParts>
</Properties>`
}

function buildXlsxCoreProps() {
  const created = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>OpenAI</dc:creator>
  <cp:lastModifiedBy>OpenAI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`
}

function buildXlsxWorkbook(sheets) {
  const sheetXml = sheets
    .map(
      (sheet) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${sheet.id}" r:id="${sheet.relId}"/>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`
}

function buildXlsxWorkbookRels(sheets) {
  const relationships = sheets
    .map(
      (sheet) =>
        `<Relationship Id="${sheet.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/${sheet.fileName}"/>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relationships}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

function buildXlsxStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`
}

function buildXlsxWorksheet(sheet) {
  const allRows = [sheet.headers, ...sheet.rows.map((row) => sheet.headers.map((header) => row?.[header] ?? ''))]
  const rowXml = allRows
    .map((rowValues, rowIndex) => {
      const cells = rowValues
        .map((value, colIndex) =>
          buildXlsxCell({
            ref: `${toExcelColumnName(colIndex + 1)}${rowIndex + 1}`,
            value,
            styleIndex: rowIndex === 0 ? 1 : 0,
          }),
        )
        .join('')
      return `<row r="${rowIndex + 1}">${cells}</row>`
    })
    .join('')

  const lastColumn = toExcelColumnName(Math.max(sheet.headers.length, 1))
  const lastRow = Math.max(allRows.length, 1)

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetData>${rowXml}</sheetData>
</worksheet>`
}

function buildXlsxCell({ ref, value, styleIndex = 0 }) {
  const text = String(value ?? '')
  const preserve = /^[\s]|[\s]$|\n/.test(text) ? ' xml:space="preserve"' : ''
  return `<c r="${ref}" t="inlineStr" s="${styleIndex}"><is><t${preserve}>${escapeXml(text)}</t></is></c>`
}

function toExcelColumnName(columnNumber) {
  let n = Number(columnNumber)
  let name = ''

  while (n > 0) {
    const remainder = (n - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    n = Math.floor((n - 1) / 26)
  }

  return name || 'A'
}

module.exports = AssetService
