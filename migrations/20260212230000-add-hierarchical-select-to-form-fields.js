'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    // Extend enum to include hierarchical_select
    await queryInterface.changeColumn('form_fields', 'type', {
      type: DataTypes.ENUM(
        'text',
        'select',
        'checkbox',
        'rating',
        'date',
        'location',
        'camera',
        'hierarchical_select',
      ),
      allowNull: false,
    })

    // Add hierarchy_levels config JSON
    await queryInterface.addColumn('form_fields', 'hierarchy_levels', {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      after: 'options_source',
    })
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    // Remove hierarchy_levels
    await queryInterface.removeColumn('form_fields', 'hierarchy_levels')

    // Revert enum without hierarchical_select
    await queryInterface.changeColumn('form_fields', 'type', {
      type: DataTypes.ENUM(
        'text',
        'select',
        'checkbox',
        'rating',
        'date',
        'location',
        'camera',
      ),
      allowNull: false,
    })
  },
}
