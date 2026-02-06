"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if asset documents already exist
    const existingDocuments = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM asset_documents",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingDocuments[0].count === 0) {
      // Get assets and users
      const assets = await queryInterface.sequelize.query(
        "SELECT asset_id FROM assets ORDER BY asset_id LIMIT 20",
        { type: Sequelize.QueryTypes.SELECT }
      );
      const users = await queryInterface.sequelize.query(
        "SELECT user_id FROM users ORDER BY user_id LIMIT 20",
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (assets.length > 0 && users.length > 0) {
        await queryInterface.bulkInsert(
          "asset_documents",
          [
            {
              asset_id: assets[0].asset_id,
              document_type: "invoice",
              title: "Purchase Invoice - Dell Latitude 5520",
              description: "Original purchase invoice from Dell",
              file_name: "dell_invoice_LAP001.pdf",
              file_path: "/uploads/documents/dell_invoice_LAP001.pdf",
              file_size: 245678,
              file_type: "application/pdf",
              uploaded_by: users[0].user_id,
              created_at: new Date(),
            },
            {
              asset_id: assets[0].asset_id,
              document_type: "warranty",
              title: "Dell Warranty Certificate",
              description: "3-year warranty documentation",
              file_name: "dell_warranty_LAP001.pdf",
              file_path: "/uploads/documents/dell_warranty_LAP001.pdf",
              file_size: 189234,
              file_type: "application/pdf",
              uploaded_by: users[0].user_id,
              created_at: new Date(),
            },
            {
              asset_id: assets[2]?.asset_id || assets[0].asset_id,
              document_type: "manual",
              title: "MacBook Pro User Manual",
              description: "Official Apple user guide",
              file_name: "macbook_manual_LAP003.pdf",
              file_path: "/uploads/documents/macbook_manual_LAP003.pdf",
              file_size: 3456789,
              file_type: "application/pdf",
              uploaded_by: users[1]?.user_id || users[0].user_id,
              created_at: new Date(),
            },
            {
              asset_id: assets[15]?.asset_id || assets[0].asset_id,
              document_type: "certificate",
              title: "Vehicle Registration",
              description: "Toyota Camry registration certificate",
              file_name: "vehicle_reg_VEH001.pdf",
              file_path: "/uploads/documents/vehicle_reg_VEH001.pdf",
              file_size: 567890,
              file_type: "application/pdf",
              uploaded_by: users[0].user_id,
              created_at: new Date(),
            },
            {
              asset_id: assets[7]?.asset_id || assets[0].asset_id,
              document_type: "service_report",
              title: "Printer Repair Report",
              description: "Service report from paper jam fix",
              file_name: "printer_repair_PRT001.pdf",
              file_path: "/uploads/documents/printer_repair_PRT001.pdf",
              file_size: 123456,
              file_type: "application/pdf",
              uploaded_by: users[2]?.user_id || users[0].user_id,
              created_at: new Date(),
            },
          ],
          {}
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("asset_documents", null, {});
  },
};
