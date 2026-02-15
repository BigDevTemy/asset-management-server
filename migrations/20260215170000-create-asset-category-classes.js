'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('asset_category_classes', {
      asset_class_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true,
      },
      allotted_categories: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ),
      },
    })

    await queryInterface.addIndex('asset_category_classes', ['name'])
    await queryInterface.addIndex('asset_category_classes', ['slug'])

    // Add asset_class_id to asset_categories
    await queryInterface.addColumn('asset_categories', 'asset_class_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'asset_category_classes', key: 'asset_class_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })

    await queryInterface.addIndex('asset_categories', ['asset_class_id'])
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('asset_categories', ['asset_class_id'])
    await queryInterface.removeColumn('asset_categories', 'asset_class_id')
    await queryInterface.dropTable('asset_category_classes')
  },
}
