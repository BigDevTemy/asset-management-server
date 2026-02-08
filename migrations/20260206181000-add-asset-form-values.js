'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    const table = await queryInterface.describeTable('assets')
    // Add active_form_id to assets to track which form captured values if missing
    if (!table.active_form_id) {
      await queryInterface.addColumn('assets', 'active_form_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'forms',
          key: 'form_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'notes',
      })
    }

    // Table to store per-asset answers to dynamic form fields
    await queryInterface.createTable('asset_form_values', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'assets',
          key: 'asset_id',
        },
        onDelete: 'CASCADE',
      },
      form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'form_id',
        },
        onDelete: 'CASCADE',
      },
      form_field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'form_fields',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    await queryInterface.addIndex('asset_form_values', ['asset_id'])
    await queryInterface.addIndex('asset_form_values', ['form_id'])
    await queryInterface.addIndex('asset_form_values', ['form_field_id'])
    await queryInterface.addIndex('asset_form_values', ['asset_id', 'form_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('asset_form_values')
    const table = await queryInterface.describeTable('assets')
    if (table.active_form_id) {
      await queryInterface.removeColumn('assets', 'active_form_id')
    }
  },
}
