'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')
    if (!table.status) {
      // status column no longer exists; skip
      return
    }

    await queryInterface.changeColumn('assets', 'status', {
      type: Sequelize.ENUM('PENDING', 'REJECTED', 'APPROVED'),
      allowNull: false,
      defaultValue: 'PENDING',
    })
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')
    if (!table.status) return

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
  },
}
