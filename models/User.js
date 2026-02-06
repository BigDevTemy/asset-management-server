'use strict';
const { Model } = require('sequelize');
const { SEQUELIZE_ENUMS, DEFAULTS } = require('../utils/constants');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // User belongs to Department
      User.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department'
      });
      
      // User has many Assets (assigned assets)
      User.hasMany(models.Asset, {
        foreignKey: 'assigned_to',
        as: 'assignedAssets'
      });
      
      // User has many AssetTransactions (as requester)
      User.hasMany(models.AssetTransaction, {
        foreignKey: 'requested_by',
        as: 'requestedTransactions'
      });
      
      // User has many AssetTransactions (as recipient)
      User.hasMany(models.AssetTransaction, {
        foreignKey: 'requested_to',
        as: 'receivedTransactions'
      });

      // User has many MaintenanceSchedules (assigned)
      User.hasMany(models.MaintenanceSchedule, {
        foreignKey: 'assigned_to',
        as: 'assignedMaintenanceSchedules'
      });

      // User has many MaintenanceLogs (performed)
      User.hasMany(models.MaintenanceLog, {
        foreignKey: 'performed_by',
        as: 'performedMaintenanceLogs'
      });

      // User has many AssetDocuments (uploaded)
      User.hasMany(models.AssetDocument, {
        foreignKey: 'uploaded_by',
        as: 'uploadedDocuments'
      });

    }
  }
  
  User.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'department_id'
      }
    },
    role: {
      type: DataTypes.ENUM(...SEQUELIZE_ENUMS.USER_ROLE),
      allowNull: false,
      defaultValue: DEFAULTS.USER_ROLE
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(...SEQUELIZE_ENUMS.USER_STATUS),
      allowNull: false,
      defaultValue: DEFAULTS.USER_STATUS
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['department_id']
      },
      {
        fields: ['status']
      }
    ]
  });
  
  return User;
};
