'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Drop asset_tag column if it exists
    await queryInterface.removeColumn('assets', 'asset_tag').catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    // Re-add asset_tag column on rollback
    await queryInterface.addColumn('assets', 'asset_tag', {
      type: Sequelize.STRING(100),
      allowNull: true,
      unique: true,
    });
  },
}
