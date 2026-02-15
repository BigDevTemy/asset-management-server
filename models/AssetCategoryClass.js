'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AssetCategoryClass extends Model {
    static associate(models) {
      AssetCategoryClass.hasMany(models.AssetCategory, {
        foreignKey: 'asset_class_id',
        as: 'categories',
      })
    }
  }

  AssetCategoryClass.init(
    {
      asset_class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      allotted_categories: {
        type: DataTypes.JSON,
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
      modelName: 'AssetCategoryClass',
      tableName: 'asset_category_classes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    },
  )

  return AssetCategoryClass
}
