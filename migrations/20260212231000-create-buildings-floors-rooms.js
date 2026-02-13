'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize

    // Buildings (root level)
    await queryInterface.createTable('buildings', {
      building_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // Floors (child of buildings)
    await queryInterface.createTable('floors', {
      floor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      building_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'buildings',
          key: 'building_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      number: {
        type: DataTypes.STRING(25),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    await queryInterface.addIndex('floors', ['building_id'])
    await queryInterface.addIndex('floors', ['building_id', 'name'])

    // Rooms (child of floors)
    await queryInterface.createTable('rooms', {
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      floor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'floors',
          key: 'floor_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    await queryInterface.addIndex('rooms', ['floor_id'])
    await queryInterface.addIndex('rooms', ['floor_id', 'name'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rooms')
    await queryInterface.dropTable('floors')
    await queryInterface.dropTable('buildings')
  },
}
