'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    await queryInterface.changeColumn('form_fields', 'type', {
      type: DataTypes.ENUM(
        'text',
        'select',
        'checkbox',
        'rating',
        'date',
        'location',
        'camera',
      ),
      allowNull: false,
    })
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    await queryInterface.changeColumn('form_fields', 'type', {
      type: DataTypes.ENUM('text', 'select', 'checkbox', 'rating'),
      allowNull: false,
    })
  },
}
