"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if maintenance schedules already exist
    const existingSchedules = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM maintenance_schedules",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingSchedules[0].count === 0) {
      // Check if required assets and users exist
      const assets = await queryInterface.sequelize.query(
        "SELECT asset_id FROM assets ORDER BY asset_id LIMIT 20",
        { type: Sequelize.QueryTypes.SELECT }
      );
      const users = await queryInterface.sequelize.query(
        "SELECT user_id FROM users ORDER BY user_id LIMIT 20",
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (assets.length >= 4 && users.length >= 2) {
        await queryInterface.bulkInsert(
          "maintenance_schedules",
          [
            {
              asset_id: assets[0].asset_id,
              maintenance_type: "preventive",
              title: "Laptop System Cleanup",
              description: "Clean dust, update software, check battery health",
              frequency_days: 180,
              last_maintenance_date: "2025-06-15",
              next_maintenance_date: "2025-12-12",
              assigned_to: users[1]?.user_id || null,
              estimated_cost: 0.0,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              asset_id: assets[3]?.asset_id || assets[0].asset_id,
              maintenance_type: "preventive",
              title: "Desktop Hardware Check",
              description:
                "Verify all components, clean internals, update drivers",
              frequency_days: 365,
              last_maintenance_date: "2024-09-15",
              next_maintenance_date: "2025-09-15",
              assigned_to: users[1]?.user_id || null,
              estimated_cost: 50.0,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              asset_id: assets[7]?.asset_id || assets[0].asset_id,
              maintenance_type: "preventive",
              title: "Printer Maintenance",
              description: "Replace toner, clean rollers, calibrate",
              frequency_days: 90,
              last_maintenance_date: "2025-09-01",
              next_maintenance_date: "2025-11-30",
              assigned_to: users[2]?.user_id || null,
              estimated_cost: 75.0,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              asset_id: assets[15]?.asset_id || assets[0].asset_id,
              maintenance_type: "inspection",
              title: "Vehicle Service",
              description: "Oil change, tire rotation, brake inspection",
              frequency_days: 90,
              last_maintenance_date: "2025-09-01",
              next_maintenance_date: "2025-11-30",
              assigned_to: null,
              estimated_cost: 150.0,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          {}
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("maintenance_schedules", null, {});
  },
};
