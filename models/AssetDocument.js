"use strict";
const { Model } = require("sequelize");
const { SEQUELIZE_ENUMS } = require("../utils/constants");

module.exports = (sequelize, DataTypes) => {
  class AssetDocument extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // AssetDocument belongs to Asset
      AssetDocument.belongsTo(models.Asset, {
        foreignKey: "asset_id",
        as: "asset",
      });

      // AssetDocument belongs to User (uploaded by)
      AssetDocument.belongsTo(models.User, {
        foreignKey: "uploaded_by",
        as: "uploadedBy",
      });
    }
  }

  AssetDocument.init(
    {
      document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "assets",
          key: "asset_id",
        },
      },
      document_type: {
        type: DataTypes.ENUM(...SEQUELIZE_ENUMS.DOCUMENT_TYPE),
        allowNull: false,
        defaultValue: "other",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: "server path or URL to file",
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "size in bytes",
      },
      file_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "MIME type",
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "AssetDocument",
      tableName: "asset_documents",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
      indexes: [
        {
          fields: ["asset_id"],
        },
        {
          fields: ["uploaded_by"],
        },
        {
          fields: ["document_type"],
        },
      ],
    }
  );

  return AssetDocument;
};
