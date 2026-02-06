'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('organization_settings', 'date_format', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'MM/DD/YYYY'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('organization_settings', 'date_format');
  }
};


