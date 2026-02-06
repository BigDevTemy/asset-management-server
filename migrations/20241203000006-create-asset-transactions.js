'use strict';
const { SEQUELIZE_ENUMS, DEFAULTS } = require('../utils/constants');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('asset_transactions', {
      transaction_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'assets',
          key: 'asset_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      requested_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      requested_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.ENUM(...SEQUELIZE_ENUMS.TRANSACTION_ACTION),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(...SEQUELIZE_ENUMS.TRANSACTION_STATUS),
        allowNull: false,
        defaultValue: DEFAULTS.TRANSACTION_STATUS
      },
      from_location: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      to_location: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'internal notes for admins'
      },
      priority: {
        type: Sequelize.ENUM(...SEQUELIZE_ENUMS.TRANSACTION_PRIORITY),
        allowNull: false,
        defaultValue: DEFAULTS.TRANSACTION_PRIORITY
      },
      expected_completion_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      actual_completion_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      responded_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('asset_transactions', ['asset_id']);
    await queryInterface.addIndex('asset_transactions', ['requested_by']);
    await queryInterface.addIndex('asset_transactions', ['status']);
    await queryInterface.addIndex('asset_transactions', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('asset_transactions');
  }
};
