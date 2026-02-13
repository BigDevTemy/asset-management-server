'use strict'

const CrudService = require('./crudService')
const {
  User,
  Department,
  Asset,
  AssetCategory,
  AssetTransaction,
  OrganizationSettings,
  AssetFormValue,
  FormFields,
  FormBuilder,
} = require('../models')

/**
 * Factory function to create CRUD services for different models
 * Pre-configured with model-specific options
 */

// User CRUD Service Configuration
const createUserCrudService = () => {
  return new CrudService(User, {
    searchFields: ['full_name', 'email', 'employee_id', 'position'],
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    defaultPageSize: 10,
    maxPageSize: 100,
    excludeFromSearch: ['password_hash', 'created_at', 'updated_at'],
    defaultIncludes: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name'],
      },
    ],
    excludeFromResponse: ['password_hash'],
  })
}

// Department CRUD Service Configuration
const createDepartmentCrudService = () => {
  return new CrudService(Department, {
    searchFields: ['name', 'description', 'manager_name'],
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    defaultPageSize: 10,
    maxPageSize: 100,
    excludeFromSearch: ['created_at'],
    defaultIncludes: [],
    excludeFromResponse: [],
  })
}

// Asset CRUD Service Configuration
const createAssetCrudService = () => {
  return new CrudService(Asset, {
    searchFields: [],
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    defaultPageSize: 10,
    maxPageSize: 100,
    excludeFromSearch: ['created_at', 'updated_at'],
    defaultIncludes: [
      {
        model: AssetFormValue,
        as: 'formValues',
        attributes: ['form_field_id', 'value'],
        include: [
          {
            model: FormFields,
            as: 'field',
            attributes: ['label', 'type'],
          },
        ],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email', 'employee_id'],
      },
      {
        model: FormBuilder,
        as: 'activeForm',
        attributes: ['form_id', 'name'],
        required: false,
        include: [
          {
            model: FormFields,
            as: 'fields',
            attributes: [
              'id',
              'label',
              'type',
              'options',
              'options_source',
              'hierarchy_levels',
              'allow_multiple',
              'position',
            ],
          },
        ],
      },
    ],
    excludeFromResponse: [],
  })
}

// Asset Category CRUD Service Configuration
const createAssetCategoryCrudService = () => {
  return new CrudService(AssetCategory, {
    searchFields: ['name', 'description'],
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    defaultPageSize: 10,
    maxPageSize: 100,
    excludeFromSearch: ['created_at', 'updated_at'],
    defaultIncludes: [],
    excludeFromResponse: [],
  })
}

// Asset Transaction CRUD Service Configuration
const createAssetTransactionCrudService = () => {
  return new CrudService(AssetTransaction, {
    searchFields: ['transaction_type', 'notes'],
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    defaultPageSize: 10,
    maxPageSize: 100,
    excludeFromSearch: ['created_at', 'updated_at'],
    defaultIncludes: [
      {
        model: Asset,
        as: 'asset',
        attributes: ['asset_id', 'asset_tag', 'name'],
        include: [
          {
            model: AssetCategory,
            as: 'category',
            attributes: ['category_id', 'name'],
          },
        ],
      },
      {
        model: User,
        as: 'requestedBy',
        attributes: ['user_id', 'full_name', 'email', 'employee_id'],
      },
      {
        model: User,
        as: 'requestedTo',
        attributes: ['user_id', 'full_name', 'email', 'employee_id'],
        required: false,
      },
    ],
    excludeFromResponse: [],
  })
}

// Organization Settings CRUD Service Configuration
const createOrganizationSettingsCrudService = () => {
  return new CrudService(OrganizationSettings, {
    searchFields: ['organization_name', 'contact_email'],
    defaultSort: 'created_at',
    defaultOrder: 'DESC',
    defaultPageSize: 10,
    maxPageSize: 100,
    excludeFromSearch: ['created_at', 'updated_at'],
    defaultIncludes: [],
    excludeFromResponse: [],
  })
}

/**
 * Main factory function
 * @param {string} modelName - Name of the model
 * @returns {CrudService} Configured CRUD service instance
 */
const createCrudService = (modelName) => {
  const services = {
    User: createUserCrudService,
    Department: createDepartmentCrudService,
    Asset: createAssetCrudService,
    AssetCategory: createAssetCategoryCrudService,
    AssetTransaction: createAssetTransactionCrudService,
    OrganizationSettings: createOrganizationSettingsCrudService,
  }

  const serviceFactory = services[modelName]
  if (!serviceFactory) {
    throw new Error(
      `No CRUD service configuration found for model: ${modelName}`,
    )
  }

  return serviceFactory()
}

module.exports = {
  createCrudService,
  createUserCrudService,
  createDepartmentCrudService,
  createAssetCrudService,
  createAssetCategoryCrudService,
  createAssetTransactionCrudService,
  createOrganizationSettingsCrudService,
}
