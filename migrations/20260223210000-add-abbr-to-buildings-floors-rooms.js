'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    await queryInterface.addColumn('buildings', 'abbr', {
      type: DataTypes.STRING(20),
      allowNull: true,
      after: 'name',
    })

    await queryInterface.addColumn('floors', 'abbr', {
      type: DataTypes.STRING(20),
      allowNull: true,
      after: 'name',
    })

    await queryInterface.addColumn('rooms', 'abbr', {
      type: DataTypes.STRING(20),
      allowNull: true,
      after: 'name',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rooms', 'abbr')
    await queryInterface.removeColumn('floors', 'abbr')
    await queryInterface.removeColumn('buildings', 'abbr')
  },
}
