"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if maintenance logs already exist
    const existingLogs = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM maintenance_logs",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingLogs[0].count === 0) {
      // Get assets, schedules, and users
      const assets = await queryInterface.sequelize.query(
        "SELECT asset_id FROM assets ORDER BY asset_id LIMIT 20",
        { type: Sequelize.QueryTypes.SELECT }
      );
      const schedules = await queryInterface.sequelize.query(
        "SELECT schedule_id FROM maintenance_schedules ORDER BY schedule_id LIMIT 10",
        { type: Sequelize.QueryTypes.SELECT }
      );
      const users = await queryInterface.sequelize.query(
        "SELECT user_id FROM users ORDER BY user_id LIMIT 20",
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (assets.length > 0 && users.length > 0) {
        await queryInterface.bulkInsert(
          "maintenance_logs",
          [
            {
              asset_id: assets[0].asset_id,
              schedule_id: schedules[0]?.schedule_id || null,
              maintenance_type: "preventive",
              title: "Laptop System Cleanup",
              description:
                "Cleaned dust, updated Windows 11, battery health: 87%",
              performed_by: users[1]?.user_id || users[0].user_id,
              performed_date: "2025-06-15",
              cost: 0.0,
              vendor: null,
              notes: null,
              downtime_hours: 1.5,
              created_at: new Date(),
            },
            {
              asset_id: assets[7]?.asset_id || assets[0].asset_id,
              schedule_id: null,
              maintenance_type: "corrective",
              title: "Printer Paper Jam Fix",
              description: "Cleared paper jam, replaced feed roller",
              performed_by: users[2]?.user_id || users[0].user_id,
              performed_date: "2025-08-20",
              cost: 25.0,
              vendor: "Local Tech Services",
              notes: null,
              downtime_hours: 0.5,
              created_at: new Date(),
            },
            {
              asset_id: assets[15]?.asset_id || assets[0].asset_id,
              schedule_id: schedules[3]?.schedule_id || null,
              maintenance_type: "inspection",
              title: "Vehicle Quarterly Service",
              description: "Oil changed, tires rotated, all fluids topped up",
              performed_by: users[0].user_id,
              performed_date: "2025-09-01",
              cost: 145.0,
              vendor: "Toyota Service Center",
              notes: null,
              downtime_hours: 3.0,
              created_at: new Date(),
            },
          ],
          {}
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("maintenance_logs", null, {});
  },
};
