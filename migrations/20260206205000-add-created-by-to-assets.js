'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets')
    if (!table.created_by) {
      await queryInterface.addColumn('assets', 'created_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'active_form_id',
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('assets')
    if (table.created_by) {
      await queryInterface.removeColumn('assets', 'created_by')
    }
  },
}
