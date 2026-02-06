'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if departments already exist
    const existingDepartments = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM departments',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingDepartments[0].count === 0) {
      await queryInterface.bulkInsert('departments', [
        {
          name: 'IT Department',
          description: 'Information Technology and Systems',
          created_at: new Date()
        },
        {
          name: 'Human Resources',
          description: 'HR and Employee Management',
          created_at: new Date()
        },
        {
          name: 'Finance',
          description: 'Accounting and Financial Management',
          created_at: new Date()
        },
        {
          name: 'Operations',
          description: 'General Operations',
          created_at: new Date()
        }
      ], {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('departments', null, {});
  }
};
