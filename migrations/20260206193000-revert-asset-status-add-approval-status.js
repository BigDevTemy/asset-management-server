'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')
    if (table.status) {
      await queryInterface.changeColumn('assets', 'status', {
        type: Sequelize.ENUM(
          'available',
          'assigned',
          'in_repair',
          'retired',
          'disposed'
        ),
        allowNull: false,
        defaultValue: 'available',
      })
    }

    if (!table.approval_status && table.status) {
      await queryInterface.addColumn('assets', 'approval_status', {
        type: Sequelize.ENUM('PENDING', 'REJECTED', 'APPROVED'),
        allowNull: false,
        defaultValue: 'PENDING',
        after: 'status',
      })
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')

    if (table.approval_status) {
      await queryInterface.removeColumn('assets', 'approval_status')
    }

    if (table.status) {
      await queryInterface.changeColumn('assets', 'status', {
        type: Sequelize.ENUM('PENDING', 'REJECTED', 'APPROVED'),
        allowNull: false,
        defaultValue: 'PENDING',
      })
    }
  },
}
