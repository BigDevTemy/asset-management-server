"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("maintenance_schedules", {
      schedule_id: {
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
      maintenance_type: {
        type: Sequelize.ENUM(
          "preventive",
          "inspection",
          "calibration",
          "cleaning",
          "other"
        ),
        allowNull: false,
        defaultValue: "preventive",
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      frequency_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "how often maintenance should occur (in days)",
      },
      last_maintenance_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      next_maintenance_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "user responsible for maintenance",
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      estimated_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: "0.00",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    // Add indexes
    await queryInterface.addIndex("maintenance_schedules", ["asset_id"], {
      name: "maintenance_schedules_asset_id",
    });
    await queryInterface.addIndex(
      "maintenance_schedules",
      ["next_maintenance_date"],
      {
        name: "maintenance_schedules_next_date",
      }
    );
    await queryInterface.addIndex("maintenance_schedules", ["assigned_to"], {
      name: "maintenance_schedules_assigned_to",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("maintenance_schedules");
  },
};
