'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if organization settings already exist
    const existingSettings = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM organization_settings',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingSettings[0].count === 0) {
      await queryInterface.bulkInsert('organization_settings', [
        {
          organization_name: 'My Organization',
          admin_email: 'admin@myorg.com',
          created_at: new Date(),
          updated_at: new Date()
        }
      ], {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('organization_settings', null, {});
  }
};
