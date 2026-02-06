'use strict';
const { Model } = require('sequelize');
const { SEQUELIZE_ENUMS, DEFAULTS } = require('../utils/constants');

module.exports = (sequelize, DataTypes) => {
  class AssetTransaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // AssetTransaction belongs to Asset
      AssetTransaction.belongsTo(models.Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
      });
      
      // AssetTransaction belongs to User (requester)
      AssetTransaction.belongsTo(models.User, {
        foreignKey: 'requested_by',
        as: 'requester'
      });
      
      // AssetTransaction belongs to User (recipient)
      AssetTransaction.belongsTo(models.User, {
        foreignKey: 'requested_to',
        as: 'recipient'
      });
    }
  }
  
  AssetTransaction.init({
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    asset_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'assets',
        key: 'asset_id'
      }
    },
    requested_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    requested_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    action: {
      type: DataTypes.ENUM(...SEQUELIZE_ENUMS.TRANSACTION_ACTION),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(...SEQUELIZE_ENUMS.TRANSACTION_STATUS),
      allowNull: false,
      defaultValue: DEFAULTS.TRANSACTION_STATUS
    },
    from_location: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    to_location: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'internal notes for admins'
    },
    priority: {
      type: DataTypes.ENUM(...SEQUELIZE_ENUMS.TRANSACTION_PRIORITY),
      allowNull: false,
      defaultValue: DEFAULTS.TRANSACTION_PRIORITY
    },
    expected_completion_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    actual_completion_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    responded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AssetTransaction',
    tableName: 'asset_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        fields: ['asset_id']
      },
      {
        fields: ['requested_by']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ]
  });
  
  return AssetTransaction;
};
