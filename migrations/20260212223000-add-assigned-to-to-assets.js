"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets');

    if (!table.assigned_to) {
      await queryInterface.addColumn('assets', 'assigned_to', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'created_by',
      });

      await queryInterface.addIndex('assets', ['assigned_to']);
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('assets');
    if (table.assigned_to) {
      await queryInterface.removeIndex('assets', ['assigned_to']);
      await queryInterface.removeColumn('assets', 'assigned_to');
    }
  },
};
