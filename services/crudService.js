'use strict'

const { Op } = require('sequelize')

/**
 * Generic CRUD Service for Sequelize models
 * Provides reusable CRUD operations with pagination, search, and filtering
 */
class CrudService {
  constructor(model, options = {}) {
    this.model = model
    this.options = {
      // Default search fields - can be overridden per model
      searchFields: options.searchFields || [],
      // Default sort field
      defaultSort: options.defaultSort || 'created_at',
      // Default sort order
      defaultOrder: options.defaultOrder || 'DESC',
      // Default page size
      defaultPageSize: options.defaultPageSize || 10,
      // Maximum page size
      maxPageSize: options.maxPageSize || 100,
      // Fields to exclude from search
      excludeFromSearch: options.excludeFromSearch || [
        'password_hash',
        'created_at',
        'updated_at',
      ],
      // Include associations by default
      defaultIncludes: options.defaultIncludes || [],
      // Fields to exclude from response
      excludeFromResponse: options.excludeFromResponse || ['password_hash'],
      ...options,
    }
  }

  /**
   * Get paginated list with search and filtering
   * @param {Object} queryParams - Query parameters from request
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {Object} Paginated result with data and metadata
   */
  async list(queryParams = {}, additionalOptions = {}) {
    try {
      const {
        page = 1,
        limit = this.options.defaultPageSize,
        search = '',
        sortBy = this.options.defaultSort,
        sortOrder = this.options.defaultOrder,
        ...filters
      } = queryParams

      const {
        include: extraIncludes = [],
        where: extraWhere = {},
        ...restAdditionalOptions
      } = additionalOptions

      // Validate and sanitize pagination parameters
      const pageNumber = Math.max(1, parseInt(page, 10))
      const pageSize = Math.min(
        this.options.maxPageSize,
        Math.max(1, parseInt(limit, 10)),
      )
      const offset = (pageNumber - 1) * pageSize

      console.log({ filters })
      console.log({ search })

      // Build where clause
      const whereClause = this._buildWhereClause(filters, search)
      const mergedWhere = {
        ...whereClause,
        ...extraWhere,
      }

      // Build order clause
      const orderClause = this._buildOrderClause(sortBy, sortOrder)

      // Build include clause
      const includeClause = this._buildIncludeClause(extraIncludes)
      console.log('includeClause:', JSON.stringify(includeClause, null, 2))

      console.log({ whereClause })

      // Execute query
      const { count, rows } = await this.model.findAndCountAll({
        where: mergedWhere,
        include: includeClause,
        order: orderClause,
        limit: pageSize,
        offset: offset,
        distinct: true,
        ...restAdditionalOptions,
      })

      // Calculate pagination metadata
      const totalPages = Math.ceil(count / pageSize)
      const hasNextPage = pageNumber < totalPages
      const hasPrevPage = pageNumber > 1

      // Remove sensitive fields from response
      const sanitizedRows = this._sanitizeResponse(rows)

      return {
        data: sanitizedRows,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: count,
          itemsPerPage: pageSize,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          search,
          sortBy,
          sortOrder,
          appliedFilters: filters,
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch ${this.model.name} list: ${error.message}`,
      )
    }
  }

  /**
   * Get single record by ID
   * @param {number|string} id - Record ID
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {Object|null} Record data or null if not found
   */
  async getById(id, additionalOptions = {}) {
    try {
      const includeClause = this._buildIncludeClause(additionalOptions.include)

      const record = await this.model.findByPk(id, {
        include: includeClause,
        ...additionalOptions,
      })

      if (!record) {
        return null
      }

      return this._sanitizeResponse(record)
    } catch (error) {
      throw new Error(
        `Failed to fetch ${this.model.name} by ID: ${error.message}`,
      )
    }
  }

  /**
   * Create new record
   * @param {Object} data - Record data
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {Object} Created record
   */
  async create(data, additionalOptions = {}) {
    try {
      const record = await this.model.create(data, additionalOptions)
      return this._sanitizeResponse(record)
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        }))
        throw new Error(
          `Validation failed: ${validationErrors.map((e) => e.message).join(', ')}`,
        )
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error(`Record with this data already exists`)
      }
      throw new Error(`Failed to create ${this.model.name}: ${error.message}`)
    }
  }

  /**
   * Update record by ID
   * @param {number|string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {Object|null} Updated record or null if not found
   */
  async update(id, data, additionalOptions = {}) {
    try {
      const [affectedCount] = await this.model.update(data, {
        where: { [this._getPrimaryKey()]: id },
        ...additionalOptions,
      })

      if (affectedCount === 0) {
        return null
      }

      // Return updated record
      return await this.getById(id, additionalOptions)
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        }))
        throw new Error(
          `Validation failed: ${validationErrors.map((e) => e.message).join(', ')}`,
        )
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error(`Record with this data already exists`)
      }
      throw new Error(`Failed to update ${this.model.name}: ${error.message}`)
    }
  }

  /**
   * Delete record by ID (hard delete)
   * @param {number|string} id - Record ID
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {boolean} True if deleted, false if not found
   */
  async delete(id, additionalOptions = {}) {
    try {
      const deletedCount = await this.model.destroy({
        where: { [this._getPrimaryKey()]: id },
        ...additionalOptions,
      })

      return deletedCount > 0
    } catch (error) {
      throw new Error(`Failed to delete ${this.model.name}: ${error.message}`)
    }
  }

  /**
   * Bulk delete records by IDs
   * @param {Array} ids - Array of record IDs
   * @param {Object} additionalOptions - Additional Sequelize options
   * @returns {number} Number of deleted records
   */
  async bulkDelete(ids, additionalOptions = {}) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('IDs array is required and must not be empty')
      }

      const deletedCount = await this.model.destroy({
        where: { [this._getPrimaryKey()]: { [Op.in]: ids } },
        ...additionalOptions,
      })

      return deletedCount
    } catch (error) {
      throw new Error(
        `Failed to bulk delete ${this.model.name}: ${error.message}`,
      )
    }
  }

  /**
   * Check if record exists by ID
   * @param {number|string} id - Record ID
   * @returns {boolean} True if exists, false otherwise
   */
  async exists(id) {
    try {
      const count = await this.model.count({
        where: { [this._getPrimaryKey()]: id },
      })
      return count > 0
    } catch (error) {
      throw new Error(
        `Failed to check ${this.model.name} existence: ${error.message}`,
      )
    }
  }

  /**
   * Get count of records with optional filters
   * @param {Object} filters - Filter conditions
   * @returns {number} Count of records
   */
  async count(filters = {}) {
    try {
      const whereClause = this._buildWhereClause(filters)
      return await this.model.count({ where: whereClause })
    } catch (error) {
      throw new Error(`Failed to count ${this.model.name}: ${error.message}`)
    }
  }

  /**
   * Get dropdown list (simplified records for select components)
   * @param {Object} options - Options for dropdown
   * @param {string} options.valueField - Field to use as value (default: primary key)
   * @param {string} options.labelField - Field to use as label (default: 'name')
   * @param {Object} options.filters - Filter conditions
   * @param {string} options.sortBy - Sort field (default: labelField)
   * @param {string} options.sortOrder - Sort order (default: 'ASC')
   * @returns {Array} Array of simplified records
   */
  async dropdown(options = {}) {
    try {
      const {
        valueField = this._getPrimaryKey(),
        labelField = 'name',
        filters = {},
        sortBy = labelField,
        sortOrder = 'ASC',
      } = options

      // Build where clause (only filters, no search)
      const whereClause = this._buildWhereClause(filters)

      // Build order clause
      const orderClause = this._buildOrderClause(sortBy, sortOrder)

      // Execute query
      const records = await this.model.findAll({
        where: whereClause,
        order: orderClause,
        attributes: [valueField, labelField],
      })

      // Transform to dropdown format
      return records.map((record) => {
        const dataValues = record.dataValues || record
        return {
          value: dataValues[valueField],
          label: dataValues[labelField],
        }
      })
    } catch (error) {
      throw new Error(
        `Failed to fetch ${this.model.name} dropdown: ${error.message}`,
      )
    }
  }

  /**
   * Build where clause for search and filters
   * @private
   */
  _buildWhereClause(filters = {}, search = '') {
    const whereClause = {}

    // Add search conditions
    if (search && this.options.searchFields.length > 0) {
      const searchConditions = this.options.searchFields.map((field) => ({
        [field]: {
          [Op.like]: `%${search}%`,
        },
      }))
      whereClause[Op.or] = searchConditions
    }

    // Add filter conditions
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== undefined &&
        filters[key] !== null &&
        filters[key] !== ''
      ) {
        // Handle array values (for IN operations)
        if (Array.isArray(filters[key])) {
          whereClause[key] = { [Op.in]: filters[key] }
        } else {
          whereClause[key] = filters[key]
        }
      }
    })

    return whereClause
  }

  /**
   * Build order clause
   * @private
   */
  _buildOrderClause(sortBy, sortOrder) {
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : this.options.defaultOrder

    return [[sortBy, validSortOrder]]
  }

  /**
   * Build include clause for associations
   * @private
   */
  _buildIncludeClause(additionalIncludes = []) {
    const includes = [...this.options.defaultIncludes, ...additionalIncludes]
    return includes.length > 0 ? includes : undefined
  }

  /**
   * Sanitize response by removing sensitive fields
   * @private
   */
  _sanitizeResponse(data) {
    if (!data) return data

    if (Array.isArray(data)) {
      return data.map((item) => this._sanitizeResponse(item))
    }

    if (data.dataValues) {
      const sanitized = { ...data.dataValues }
      this.options.excludeFromResponse.forEach((field) => {
        delete sanitized[field]
      })
      return sanitized
    }

    const sanitized = { ...data }
    this.options.excludeFromResponse.forEach((field) => {
      delete sanitized[field]
    })
    return sanitized
  }

  /**
   * Get primary key field name
   * @private
   */
  _getPrimaryKey() {
    return this.model.primaryKeyAttribute || 'id'
  }
}

module.exports = CrudService
