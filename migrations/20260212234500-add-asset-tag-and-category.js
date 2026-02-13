"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('assets');

    if (!table.asset_tag) {
      await queryInterface.addColumn('assets', 'asset_tag', {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        after: 'asset_id',
      });
    }

    if (!table.category_id) {
      await queryInterface.addColumn('assets', 'category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'asset_categories', key: 'category_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'asset_tag',
      });
      await queryInterface.addIndex('assets', ['category_id']);
    }

    if (!table.asset_location) {
      await queryInterface.addColumn('assets', 'asset_location', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'category_id',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('assets');
    if (table.asset_location) {
      await queryInterface.removeColumn('assets', 'asset_location');
    }
    if (table.category_id) {
      await queryInterface.removeIndex('assets', ['category_id']).catch(() => {});
      await queryInterface.removeColumn('assets', 'category_id');
    }
    if (table.asset_tag) {
      await queryInterface.removeColumn('assets', 'asset_tag');
    }
  },
};
