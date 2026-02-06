"use strict";
const { Model } = require("sequelize");
const { SEQUELIZE_ENUMS } = require("../utils/constants");

module.exports = (sequelize, DataTypes) => {
  class MaintenanceLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // MaintenanceLog belongs to Asset
      MaintenanceLog.belongsTo(models.Asset, {
        foreignKey: "asset_id",
        as: "asset",
      });

      // MaintenanceLog belongs to MaintenanceSchedule (optional)
      MaintenanceLog.belongsTo(models.MaintenanceSchedule, {
        foreignKey: "schedule_id",
        as: "schedule",
      });

      // MaintenanceLog belongs to User (performed by)
      MaintenanceLog.belongsTo(models.User, {
        foreignKey: "performed_by",
        as: "performedBy",
      });
    }
  }

  MaintenanceLog.init(
    {
      log_id: {
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
      schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "null for unscheduled maintenance",
        references: {
          model: "maintenance_schedules",
          key: "schedule_id",
        },
      },
      maintenance_type: {
        type: DataTypes.ENUM(...SEQUELIZE_ENUMS.MAINTENANCE_TYPE),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      performed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      performed_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: "0.00",
      },
      vendor: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      downtime_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: "0.00",
        comment: "how long asset was unavailable",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "MaintenanceLog",
      tableName: "maintenance_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
      indexes: [
        {
          fields: ["asset_id"],
        },
        {
          fields: ["schedule_id"],
        },
        {
          fields: ["performed_by"],
        },
        {
          fields: ["performed_date"],
        },
      ],
    }
  );

  return MaintenanceLog;
};
