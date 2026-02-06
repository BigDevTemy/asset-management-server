"use strict";
const { Model } = require("sequelize");
const { SEQUELIZE_ENUMS, DEFAULTS } = require("../utils/constants");

module.exports = (sequelize, DataTypes) => {
  class MaintenanceSchedule extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // MaintenanceSchedule belongs to Asset
      MaintenanceSchedule.belongsTo(models.Asset, {
        foreignKey: "asset_id",
        as: "asset",
      });

      // MaintenanceSchedule belongs to User (assigned user)
      MaintenanceSchedule.belongsTo(models.User, {
        foreignKey: "assigned_to",
        as: "assignedUser",
      });

      // MaintenanceSchedule has many MaintenanceLogs
      MaintenanceSchedule.hasMany(models.MaintenanceLog, {
        foreignKey: "schedule_id",
        as: "logs",
      });
    }
  }

  MaintenanceSchedule.init(
    {
      schedule_id: {
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
      maintenance_type: {
        type: DataTypes.ENUM(...SEQUELIZE_ENUMS.MAINTENANCE_TYPE),
        allowNull: false,
        defaultValue: "preventive",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      frequency_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "how often maintenance should occur (in days)",
      },
      last_maintenance_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      next_maintenance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "user responsible for maintenance",
        references: {
          model: "users",
          key: "user_id",
        },
      },
      estimated_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: "0.00",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      modelName: "MaintenanceSchedule",
      tableName: "maintenance_schedules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
      indexes: [
        {
          fields: ["asset_id"],
        },
        {
          fields: ["next_maintenance_date"],
        },
        {
          fields: ["assigned_to"],
        },
      ],
    }
  );

  return MaintenanceSchedule;
};
