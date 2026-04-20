'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('asset_export_jobs', {
      export_job_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      job_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'queued',
      },
      requested_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_items: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      processed_items: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      asset_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      image_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      skipped_images: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      file_path: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('asset_export_jobs', ['job_type', 'status'])
    await queryInterface.addIndex('asset_export_jobs', ['requested_by', 'created_at'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('asset_export_jobs')
  },
}
