'use strict';
const { Model } = require('sequelize');
const { SEQUELIZE_ENUMS, DEFAULTS } = require('../utils/constants');

module.exports = (sequelize, DataTypes) => {
  class Asset extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Asset belongs to AssetCategory
      Asset.belongsTo(models.AssetCategory, {
        foreignKey: 'category_id',
        as: 'category'
      });
      
      // Asset belongs to User (assigned user)
      Asset.belongsTo(models.User, {
        foreignKey: 'assigned_to',
        as: 'assignedUser'
      });
      
      // Asset has many AssetTransactions
      Asset.hasMany(models.AssetTransaction, {
        foreignKey: 'asset_id',
        as: 'transactions'
      });

      // Asset has many MaintenanceSchedules
      Asset.hasMany(models.MaintenanceSchedule, {
        foreignKey: 'asset_id',
        as: 'maintenanceSchedules'
      });

      // Asset has many MaintenanceLogs
      Asset.hasMany(models.MaintenanceLog, {
        foreignKey: 'asset_id',
        as: 'maintenanceLogs'
      });

      // Asset has many AssetDocuments
      Asset.hasMany(models.AssetDocument, {
        foreignKey: 'asset_id',
        as: 'documents'
      });
    }
  }
  
  Asset.init({
    asset_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    asset_tag: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    serial_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'asset_categories',
        key: 'category_id'
      }
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    purchase_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    purchase_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    warranty_expiry: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    supplier: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(...SEQUELIZE_ENUMS.ASSET_STATUS),
      allowNull: false,
      defaultValue: DEFAULTS.ASSET_STATUS
    },
    condition_rating: {
      type: DataTypes.ENUM(...SEQUELIZE_ENUMS.ASSET_CONDITION),
      allowNull: false,
      defaultValue: DEFAULTS.ASSET_CONDITION
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    assignment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    barcode: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    qr_code: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Asset',
    tableName: 'assets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        fields: ['asset_tag']
      },
      {
        fields: ['serial_number']
      },
      {
        fields: ['status']
      },
      {
        fields: ['assigned_to']
      },
      {
        fields: ['category_id']
      }
    ]
  });
  
  return Asset;
};
