'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    await queryInterface.addColumn('forms', 'asset_tag_config', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('forms', 'asset_tag_config')
  },
}
