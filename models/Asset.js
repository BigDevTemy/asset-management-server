'use strict'
const { Model } = require('sequelize')
const { SEQUELIZE_ENUMS, DEFAULTS } = require('../utils/constants')

module.exports = (sequelize, DataTypes) => {
  class Asset extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Asset belongs to AssetCategory
      // Asset.belongsTo(models.AssetCategory, {
      //   foreignKey: 'category_id',
      //   as: 'category'
      // });

      // Asset was captured with a specific dynamic form
      Asset.belongsTo(models.FormBuilder, {
        foreignKey: 'active_form_id',
        as: 'activeForm',
      })

      // Asset belongs to User (assigned user)
      // Asset.belongsTo(models.User, {
      //   foreignKey: 'assigned_to',
      //   as: 'assignedUser'
      // });

      // Asset was created by
      Asset.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator',
      })

      // Asset has many AssetTransactions
      // Asset.hasMany(models.AssetTransaction, {
      //   foreignKey: 'asset_id',
      //   as: 'transactions'
      // });

      // Asset has many MaintenanceSchedules
      // Asset.hasMany(models.MaintenanceSchedule, {
      //   foreignKey: 'asset_id',
      //   as: 'maintenanceSchedules'
      // });

      // Asset has many MaintenanceLogs
      // Asset.hasMany(models.MaintenanceLog, {
      //   foreignKey: 'asset_id',
      //   as: 'maintenanceLogs'
      // });

      // Asset has many AssetDocuments
      // Asset.hasMany(models.AssetDocument, {
      //   foreignKey: 'asset_id',
      //   as: 'documents'
      // });

      // Asset has many captured form values
      Asset.hasMany(models.AssetFormValue, {
        foreignKey: 'asset_id',
        as: 'formValues',
      })
    }
  }

  Asset.init(
    {
      asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      asset_tag: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      asset_location: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...SEQUELIZE_ENUMS.ASSET_STATUS),
        allowNull: false,
        defaultValue: DEFAULTS.ASSET_STATUS,
      },
      approval_status: {
        type: DataTypes.ENUM('PENDING', 'REJECTED', 'APPROVED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      barcode: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      qr_code: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      active_form_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Asset',
      tableName: 'assets',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
      indexes: [
        {
          fields: ['status'],
        },
        {
          fields: ['active_form_id'],
        },
        {
          fields: ['created_by'],
        },
        {
          fields: ['approval_status'],
        },
      ],
    },
  )

  return Asset
}
