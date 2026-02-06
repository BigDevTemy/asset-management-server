'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('organization_settings', 'currency', {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: 'USD',
    });
    await queryInterface.addColumn('organization_settings', 'currency_locale', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'en-US',
    });
    await queryInterface.addColumn('organization_settings', 'currency_fraction_digits', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 2,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('organization_settings', 'currency_fraction_digits');
    await queryInterface.removeColumn('organization_settings', 'currency_locale');
    await queryInterface.removeColumn('organization_settings', 'currency');
  }
};


