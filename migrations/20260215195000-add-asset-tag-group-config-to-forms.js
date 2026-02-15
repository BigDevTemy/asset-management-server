'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    await queryInterface.addColumn('forms', 'asset_tag_group_config', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      after: 'asset_tag_config',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('forms', 'asset_tag_group_config')
  },
}
