'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')

    // Only relax asset_tag if it still exists
    if (table.asset_tag) {
      await queryInterface.changeColumn('assets', 'asset_tag', {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      })
    }

    if (table.name) {
      await queryInterface.changeColumn('assets', 'name', {
        type: Sequelize.STRING(150),
        allowNull: true,
      })
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')

    if (table.asset_tag) {
      await queryInterface.changeColumn('assets', 'asset_tag', {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      })
    }

    if (table.name) {
      await queryInterface.changeColumn('assets', 'name', {
        type: Sequelize.STRING(150),
        allowNull: false,
      })
    }
  },
}
