'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('request_logs', {
      request_log_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      request_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING(2048),
        allowNull: false,
      },
      path: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      referrer: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_headers: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      request_query: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      request_params: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      request_body: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      response_headers: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      response_content_type: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      response_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      has_error: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    await queryInterface.addIndex('request_logs', ['created_at'])
    await queryInterface.addIndex('request_logs', ['method', 'status_code'])
    await queryInterface.addIndex('request_logs', ['user_id', 'created_at'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('request_logs')
  },
}
