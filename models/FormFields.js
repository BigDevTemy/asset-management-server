'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class FormFields extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      FormFields.belongsTo(models.FormBuilder, {
        foreignKey: 'form_id',
        as: 'formBuilder',
      })
    }
  }

  FormFields.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'form_id',
        },
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          'text',
          'select',
          'checkbox',
          'rating',
          'date',
          'location',
          'camera',
        ),
        allowNull: false,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      placeholder: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      options: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      allow_multiple: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      max_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'FormFields',
      tableName: 'form_fields',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,
    },
  )

  return FormFields
}
