'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')

    if (!table.asset_tag_group) {
      await queryInterface.addColumn('assets', 'asset_tag_group', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'asset_tag',
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('assets')
    if (table.asset_tag_group) {
      await queryInterface.removeColumn('assets', 'asset_tag_group')
    }
  },
}
