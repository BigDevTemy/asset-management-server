'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      Room.belongsTo(models.Floor, {
        foreignKey: 'floor_id',
        as: 'floor',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    }
  }

  Room.init(
    {
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      floor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      abbr: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Room',
      tableName: 'rooms',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    },
  )

  return Room
}
