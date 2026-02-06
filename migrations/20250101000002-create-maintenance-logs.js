"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("maintenance_logs", {
      log_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "assets",
          key: "asset_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      schedule_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "null for unscheduled maintenance",
        references: {
          model: "maintenance_schedules",
          key: "schedule_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      maintenance_type: {
        type: Sequelize.ENUM(
          "preventive",
          "corrective",
          "inspection",
          "calibration",
          "cleaning",
          "other"
        ),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      performed_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: "0.00",
      },
      vendor: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      downtime_hours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: "0.00",
        comment: "how long asset was unavailable",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("maintenance_logs", ["asset_id"], {
      name: "maintenance_logs_asset_id",
    });
    await queryInterface.addIndex("maintenance_logs", ["schedule_id"], {
      name: "maintenance_logs_schedule_id",
    });
    await queryInterface.addIndex("maintenance_logs", ["performed_by"], {
      name: "maintenance_logs_performed_by",
    });
    await queryInterface.addIndex("maintenance_logs", ["performed_date"], {
      name: "maintenance_logs_performed_date",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("maintenance_logs");
  },
};
