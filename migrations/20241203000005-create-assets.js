'use strict';
const { SEQUELIZE_ENUMS, DEFAULTS } = require('../utils/constants');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assets', {
      asset_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      asset_tag: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      serial_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'asset_categories',
          key: 'category_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      purchase_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      purchase_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      warranty_expiry: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      supplier: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM(...SEQUELIZE_ENUMS.ASSET_STATUS),
        allowNull: false,
        defaultValue: DEFAULTS.ASSET_STATUS
      },
      condition_rating: {
        type: Sequelize.ENUM(...SEQUELIZE_ENUMS.ASSET_CONDITION),
        allowNull: false,
        defaultValue: DEFAULTS.ASSET_CONDITION
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assignment_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      barcode: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      qr_code: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      notes: {
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

    // Add indexes
    await queryInterface.addIndex('assets', ['asset_tag']);
    await queryInterface.addIndex('assets', ['serial_number']);
    await queryInterface.addIndex('assets', ['status']);
    await queryInterface.addIndex('assets', ['assigned_to']);
    await queryInterface.addIndex('assets', ['category_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('assets');
  }
};
