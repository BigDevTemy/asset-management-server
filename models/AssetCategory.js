'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AssetCategory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      AssetCategory.belongsTo(models.AssetCategoryClass, {
        foreignKey: 'asset_class_id',
        as: 'assetClass',
      })
    }
  }

  AssetCategory.init(
    {
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      asset_class_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      depreciation_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: 'annual depreciation percentage',
      },
      default_warranty_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 12,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'AssetCategory',
      tableName: 'asset_categories',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,
    },
  )

  return AssetCategory
}
