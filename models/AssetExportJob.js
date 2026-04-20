'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AssetExportJob extends Model {
    static associate(models) {
      AssetExportJob.belongsTo(models.User, {
        foreignKey: 'requested_by',
        as: 'requester',
      })
    }
  }

  AssetExportJob.init(
    {
      export_job_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      job_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'queued',
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      progress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_items: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      processed_items: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      asset_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      image_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      skipped_images: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      file_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
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
      modelName: 'AssetExportJob',
      tableName: 'asset_export_jobs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
      indexes: [
        {
          fields: ['job_type', 'status'],
        },
        {
          fields: ['requested_by', 'created_at'],
        },
      ],
    },
  )

  return AssetExportJob
}
