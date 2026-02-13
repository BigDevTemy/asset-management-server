'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    await queryInterface.addColumn('form_fields', 'options_sources', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      after: 'options',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('form_fields', 'options_source')
  },
}
