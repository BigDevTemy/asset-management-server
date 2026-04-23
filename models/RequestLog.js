'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class RequestLog extends Model {
    static associate(models) {
      RequestLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      })
    }
  }

  RequestLog.init(
    {
      request_log_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      request_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      method: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING(2048),
        allowNull: false,
      },
      path: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      status_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      duration_ms: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      referrer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      request_headers: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      request_query: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      request_params: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      request_body: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      response_headers: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      response_body: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      response_content_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      response_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      has_error: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      error_message: {
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
      modelName: 'RequestLog',
      tableName: 'request_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['request_id'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['method', 'status_code'],
        },
        {
          fields: ['user_id', 'created_at'],
        },
      ],
    }
  )

  return RequestLog
}
