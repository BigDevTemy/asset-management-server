'use strict'

const { FormBuilder, FormFields } = require('../models')
const CrudService = require('./crudService')
const logger = require('../utils/logger')

const defaultFormIncludes = [
  {
    model: FormFields,
    as: 'fields',
    required: false,
    order: [
      ['position', 'ASC'],
      ['created_at', 'ASC'],
    ],
  },
]

class FormBuilderService {
  constructor() {
    this.crudService = new CrudService(FormBuilder, {
      searchFields: ['name', 'description'],
      defaultSort: 'created_at',
      defaultOrder: 'DESC',
      defaultIncludes: defaultFormIncludes,
    })
  }

  async create(formPayload, additionalOptions = {}) {
    const { fields = [], formFields = [], ...formData } = formPayload
    const combinedFields = formFields.length ? formFields : fields
    const normalizedFormData = {
      ...formData,
      asset_tag_config: this._parseJsonLike(formData.asset_tag_config),
      asset_tag_group_config: this._parseJsonLike(
        formData.asset_tag_group_config,
      ),
    }
    const transaction =
      additionalOptions.transaction ||
      (await FormBuilder.sequelize.transaction())
    const externalTransaction = Boolean(additionalOptions.transaction)

    try {
      const form = await FormBuilder.create(normalizedFormData, {
        ...additionalOptions,
        transaction,
      })

      if (combinedFields.length) {
        await FormFields.bulkCreate(
          this._normalizeFields(combinedFields, form.form_id),
          { transaction },
        )
      }

      if (!externalTransaction) {
        await transaction.commit()
      }

      return this.getById(form.form_id, additionalOptions)
    } catch (error) {
      if (!externalTransaction) {
        await transaction.rollback()
      }

      logger.logError(error, {
        action: 'create_form',
        formData,
      })

      throw error
    }
  }

  async update(formId, payload, additionalOptions = {}) {
    const { fields = [], formFields, ...formData } = payload
    const combinedFields =
      Array.isArray(formFields) && formFields.length ? formFields : fields
    const normalizedFormData = {
      ...formData,
      ...(Object.prototype.hasOwnProperty.call(formData, 'asset_tag_config')
        ? { asset_tag_config: this._parseJsonLike(formData.asset_tag_config) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(
        formData,
        'asset_tag_group_config',
      )
        ? {
            asset_tag_group_config: this._parseJsonLike(
              formData.asset_tag_group_config,
            ),
          }
        : {}),
    }

    // Track which props were explicitly provided so we don't overwrite existing values unintentionally
    const providedOptionsById = new Map()
    const providedOptionsSourceById = new Map()
    const providedHierarchyById = new Map()
    combinedFields.forEach((field) => {
      const fieldId = Number.isFinite(Number(field.id)) ? Number(field.id) : null
      if (fieldId) {
        providedOptionsById.set(
          fieldId,
          Object.prototype.hasOwnProperty.call(field, 'options'),
        )
        providedOptionsSourceById.set(
          fieldId,
          Object.prototype.hasOwnProperty.call(field, 'options_source'),
        )
        providedHierarchyById.set(
          fieldId,
          Object.prototype.hasOwnProperty.call(field, 'hierarchy_levels'),
        )
      }
    })

    const transaction =
      additionalOptions.transaction ||
      (await FormBuilder.sequelize.transaction())
    const externalTransaction = Boolean(additionalOptions.transaction)

    try {
      const form = await FormBuilder.findByPk(formId, { transaction })
      if (!form) {
        if (!externalTransaction) {
          await transaction.rollback()
        }
        return null
      }

      if (Object.keys(normalizedFormData).length) {
        await form.update(normalizedFormData, { transaction })
      }

      if (Array.isArray(combinedFields)) {
        const existingFields = await FormFields.findAll({
          where: { form_id: formId },
          transaction,
        })

        const normalizedFields = this._normalizeFields(combinedFields, formId, {
          keepId: true,
        })

        const idsToKeep = []
        for (const field of normalizedFields) {
          const fieldId = Number.isFinite(field.id) ? field.id : null
          if (fieldId) {
            idsToKeep.push(fieldId)
            const { id, ...updateData } = field
            const existingField = existingFields.find((f) => f.id === fieldId)

            // Preserve existing options/options_source if the update payload omitted them
            if (existingField) {
              if (!providedOptionsById.get(fieldId)) {
                updateData.options = existingField.options
              }
              if (!providedOptionsSourceById.get(fieldId)) {
                updateData.options_source = existingField.options_source
              }
              if (!providedHierarchyById.get(fieldId)) {
                updateData.hierarchy_levels = existingField.hierarchy_levels
              }
            }

            await FormFields.update(updateData, {
              where: { id: fieldId, form_id: formId },
              transaction,
            })
          } else if (Object.keys(field).length) {
            const { id, ...createData } = field
            await FormFields.create(createData, { transaction })
          }
        }

        const fieldsToRemove = existingFields
          .map((field) => field.id)
          .filter((id) => !idsToKeep.includes(id))

        if (fieldsToRemove.length) {
          await FormFields.destroy({
            where: { id: fieldsToRemove },
            transaction,
          })
        }
      }

      if (!externalTransaction) {
        await transaction.commit()
      }

      return this.getById(formId, additionalOptions)
    } catch (error) {
      if (!externalTransaction) {
        await transaction.rollback()
      }

      logger.logError(error, {
        action: 'update_form',
        formId,
      })

      throw error
    }
  }

  async list(queryParams, additionalOptions = {}) {
    const result = await this.crudService.list(queryParams, additionalOptions)
    if (Array.isArray(result?.data)) {
      result.data = result.data.map((form) => this._parseConfigFields(form))
    }
    return result
  }

  async getById(formId, additionalOptions = {}) {
    const form = await this.crudService.getById(formId, additionalOptions)
    return this._parseConfigFields(form)
  }

  async delete(formId, additionalOptions = {}) {
    const transaction =
      additionalOptions.transaction ||
      (await FormBuilder.sequelize.transaction())
    const externalTransaction = Boolean(additionalOptions.transaction)

    try {
      await FormFields.destroy({
        where: { form_id: formId },
        transaction,
      })

      const deleted = await FormBuilder.destroy({
        where: { form_id: formId },
        transaction,
        ...additionalOptions,
      })

      if (!externalTransaction) {
        await transaction.commit()
      }

      return deleted > 0
    } catch (error) {
      if (!externalTransaction) {
        await transaction.rollback()
      }

      logger.logError(error, {
        action: 'delete_form',
        formId,
      })

      throw error
    }
  }

  async setActive(formId, additionalOptions = {}) {
    const transaction =
      additionalOptions.transaction ||
      (await FormBuilder.sequelize.transaction())
    const externalTransaction = Boolean(additionalOptions.transaction)

    try {
      const form = await FormBuilder.findByPk(formId, { transaction })
      if (!form) {
        if (!externalTransaction) await transaction.rollback()
        return null
      }

      // Deactivate all, then activate target
      await FormBuilder.update(
        { is_active: false },
        { where: {}, transaction },
      )

      await form.update({ is_active: true }, { transaction })

      if (!externalTransaction) await transaction.commit()

      return this.getById(formId, additionalOptions)
    } catch (error) {
      if (!externalTransaction) await transaction.rollback()
      logger.logError(error, {
        action: 'activate_form',
        formId,
      })
      throw error
    }
  }

  async deactivate(formId, additionalOptions = {}) {
    const transaction =
      additionalOptions.transaction ||
      (await FormBuilder.sequelize.transaction())
    const externalTransaction = Boolean(additionalOptions.transaction)

    try {
      const form = await FormBuilder.findByPk(formId, { transaction })
      if (!form) {
        if (!externalTransaction) await transaction.rollback()
        return null
      }

      await form.update({ is_active: false }, { transaction })

      if (!externalTransaction) await transaction.commit()

      return this.getById(formId, additionalOptions)
    } catch (error) {
      if (!externalTransaction) await transaction.rollback()
      logger.logError(error, {
        action: 'deactivate_form',
        formId,
      })
      throw error
    }
  }

  _normalizeFields(formFields, formId, options = {}) {
    return formFields.map((field, index) => {
      const hierarchyLevels = this._normalizeHierarchyLevels(
        field.hierarchy_levels,
        field.type,
      )

      const normalized = {
        ...field,
        form_id: formId,
        position: typeof field.position === 'number' ? field.position : index,
        options: Array.isArray(field.options) ? field.options : [],
        options_source:
          (field.type === 'select' || field.type === 'hierarchical_select') &&
          field.options_source
            ? field.options_source
            : null,
        hierarchy_levels: hierarchyLevels,
        allow_multiple:
          typeof field.allow_multiple === 'boolean'
            ? field.allow_multiple
            : false,
      }

      if (!options.keepId) {
        normalized.id = undefined
      } else if (normalized.id !== undefined && normalized.id !== null) {
        const parsedId = Number(normalized.id)
        normalized.id = Number.isFinite(parsedId) ? parsedId : undefined
      }

      return normalized
    })
  }

  /**
   * Normalize hierarchy_levels for hierarchical_select fields.
   * Ensures an array of level objects with expected keys, including link_id.
   * For non-hierarchical fields, returns null.
   */
  _normalizeHierarchyLevels(rawLevels, fieldType) {
    if (fieldType !== 'hierarchical_select') return null

    const parsed = this._parseJsonField(rawLevels)
    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .map((level) => {
        if (!level || typeof level !== 'object') return null

        const {
          name = null,
          table = null,
          label_key = null,
          value_key = null,
          parent_key = null,
          link_id = null,
          placeholder = null,
          auto_refresh,
        } = level

        return {
          name,
          table,
          label_key,
          value_key,
          parent_key,
          link_id,
          placeholder,
          auto_refresh: typeof auto_refresh === 'boolean' ? auto_refresh : false,
        }
      })
      .filter(Boolean)

    return cleaned.length ? cleaned : null
  }

  _parseJsonField(rawValue) {
    if (rawValue === null || rawValue === undefined) return null
    if (Array.isArray(rawValue) || typeof rawValue === 'object') return rawValue

    if (typeof rawValue === 'string') {
      let value = rawValue
      let depth = 0
      while (typeof value === 'string' && depth < 3) {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed) || typeof parsed === 'object') return parsed
          value = parsed
        } catch (err) {
          logger.warn('Failed to parse JSON field', {
            rawValue,
            error: err.message,
          })
          return null
        }
        depth += 1
      }
      return Array.isArray(value) || typeof value === 'object' ? value : null
    }

    return null
  }

  _parseJsonLike(rawValue) {
    if (rawValue === undefined) return undefined
    if (rawValue === null) return null
    if (typeof rawValue === 'object') return rawValue
    if (typeof rawValue !== 'string') return rawValue

    try {
      const parsed = JSON.parse(rawValue)
      return parsed
    } catch {
      return rawValue
    }
  }

  _parseConfigFields(form) {
    if (!form || typeof form !== 'object') return form
    return {
      ...form,
      asset_tag_config: this._parseJsonLike(form.asset_tag_config),
      asset_tag_group_config: this._parseJsonLike(form.asset_tag_group_config),
    }
  }
}

module.exports = FormBuilderService
