'use strict';
const { USER_ROLES, USER_STATUS } = require('../utils/constants');
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if users already exist
    const existingUsers = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM users',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingUsers[0].count === 0) {
      await queryInterface.bulkInsert('users', [
        {
          full_name: 'System Administrator',
          email: 'admin@gmail.com',
          role: USER_ROLES.ADMIN,
          password_hash: await bcrypt.hash('admin@123', 10),
          employee_id: 'EMP001',
          position: 'System Administrator',
          department_id: 1,
          status: USER_STATUS.ACTIVE,
          created_at: new Date(),
          updated_at: new Date()
        },
      ], {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
