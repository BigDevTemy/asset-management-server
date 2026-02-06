'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrganizationSettings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  
  OrganizationSettings.init({
    setting_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    organization_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: 'My Organization'
    },
    logo_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    primary_color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#3B82F6'
    },
    secondary_color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#EF4444'
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'USD'
    },
    currency_locale: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'en-US'
    },
    currency_fraction_digits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2
    },
    admin_email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_format: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'MM/DD/YYYY'
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
    modelName: 'OrganizationSettings',
    tableName: 'organization_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });
  
  return OrganizationSettings;
};
