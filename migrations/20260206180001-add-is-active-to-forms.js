'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('forms', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'description',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('forms', 'is_active')
  },
}
