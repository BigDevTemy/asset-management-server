'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organization_settings', {
      setting_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      organization_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        defaultValue: 'My Organization'
      },
      logo_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      primary_color: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: '#3B82F6'
      },
      secondary_color: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: '#EF4444'
      },
      admin_email: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('organization_settings');
  }
};
