'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class FormBuilder extends Model {
    static associate(models) {
      FormBuilder.hasMany(models.FormFields, {
        foreignKey: 'form_id',
        as: 'fields',
      })
    }
  }

  FormBuilder.init(
    {
      form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      asset_tag_config: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      modelName: 'FormBuilder',
      tableName: 'forms',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
      indexes: [{ fields: ['form_id'] }],
    },
  )

  return FormBuilder
}
