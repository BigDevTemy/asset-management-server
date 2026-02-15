"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [{ count }] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM locations",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (Number(count) > 0) return;

    const now = new Date();
    const locations = [
      { name: "Headquarters", slug: "headquarters" },
      { name: "Main Warehouse", slug: "main-warehouse" },
      { name: "Repair Hub", slug: "repair-hub" },
      { name: "Remote Office", slug: "remote-office" },
      { name: "Data Center", slug: "data-center" }
    ].map((loc) => ({
      ...loc,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("locations", locations, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("locations", null, {});
  },
};
