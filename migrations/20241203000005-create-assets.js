'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assets', {
      asset_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      barcode: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      qr_code: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      active_form_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'forms', key: 'form_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('available', 'assigned', 'in_repair', 'retired', 'disposed'),
        allowNull: false,
        defaultValue: 'available',
      },
      approval_status: {
        type: Sequelize.ENUM('PENDING', 'REJECTED', 'APPROVED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('assets', ['active_form_id']);
    await queryInterface.addIndex('assets', ['created_by']);
    await queryInterface.addIndex('assets', ['status']);
    await queryInterface.addIndex('assets', ['approval_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('assets');
  },
};
