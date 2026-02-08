'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AssetFormValue extends Model {
    static associate(models) {
      AssetFormValue.belongsTo(models.Asset, {
        foreignKey: 'asset_id',
        as: 'asset',
      })
      AssetFormValue.belongsTo(models.FormBuilder, {
        foreignKey: 'form_id',
        as: 'form',
      })
      AssetFormValue.belongsTo(models.FormFields, {
        foreignKey: 'form_field_id',
        as: 'field',
      })
    }
  }

  AssetFormValue.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      form_field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      value: {
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
      modelName: 'AssetFormValue',
      tableName: 'asset_form_values',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    },
  )

  return AssetFormValue
}
