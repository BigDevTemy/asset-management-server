'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('assets', 'codesheet_path', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'qr_code',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('assets', 'codesheet_path')
  },
}
