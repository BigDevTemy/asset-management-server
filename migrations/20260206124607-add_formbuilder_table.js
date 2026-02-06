'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    // Parent form table
    await queryInterface.createTable('forms', {
      form_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // Fields belonging to a form
    await queryInterface.createTable('form_fields', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'form_id',
        },
        onDelete: 'CASCADE',
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('text', 'select', 'checkbox', 'rating'),
        allowNull: false,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      placeholder: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      options: {
        // store select/checkbox option strings; empty array for text/rating
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      allow_multiple: {
        // relevant only for checkbox type
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      max_rating: {
        // relevant only for rating type
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    await queryInterface.addIndex('form_fields', ['form_id'])
    await queryInterface.addIndex('form_fields', ['form_id', 'position'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('form_fields')
    await queryInterface.dropTable('forms')
  },
}
