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
    const transaction =
      additionalOptions.transaction ||
      (await FormBuilder.sequelize.transaction())
    const externalTransaction = Boolean(additionalOptions.transaction)

    try {
      const form = await FormBuilder.create(formData, {
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

      if (Object.keys(formData).length) {
        await form.update(formData, { transaction })
      }

      if (Array.isArray(combinedFields)) {
        await FormFields.destroy({
          where: { form_id: formId },
          transaction,
        })

        if (combinedFields.length) {
          await FormFields.bulkCreate(
            this._normalizeFields(combinedFields, formId),
            { transaction },
          )
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
    return this.crudService.list(queryParams, additionalOptions)
  }

  async getById(formId, additionalOptions = {}) {
    return this.crudService.getById(formId, additionalOptions)
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

  _normalizeFields(formFields, formId) {
    return formFields.map((field, index) => ({
      ...field,
      id: undefined, // let DB autogenerate integer id
      form_id: formId,
      position: typeof field.position === 'number' ? field.position : index,
      options: Array.isArray(field.options) ? field.options : [],
      allow_multiple:
        typeof field.allow_multiple === 'boolean'
          ? field.allow_multiple
          : false,
    }))
  }
}

module.exports = FormBuilderService
