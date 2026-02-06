"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("asset_documents", {
      document_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "assets",
          key: "asset_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      document_type: {
        type: Sequelize.ENUM(
          "invoice",
          "manual",
          "warranty",
          "certificate",
          "service_report",
          "photo",
          "other"
        ),
        allowNull: false,
        defaultValue: "other",
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: "server path or URL to file",
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "size in bytes",
      },
      file_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "MIME type",
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("asset_documents", ["asset_id"], {
      name: "asset_documents_asset_id",
    });
    await queryInterface.addIndex("asset_documents", ["uploaded_by"], {
      name: "asset_documents_uploaded_by",
    });
    await queryInterface.addIndex("asset_documents", ["document_type"], {
      name: "asset_documents_document_type",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("asset_documents");
  },
};
