'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Floor extends Model {
    static associate(models) {
      Floor.belongsTo(models.Building, {
        foreignKey: 'building_id',
        as: 'building',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })

      Floor.hasMany(models.Room, {
        foreignKey: 'floor_id',
        as: 'rooms',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    }
  }

  Floor.init(
    {
      floor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      building_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      modelName: 'Floor',
      tableName: 'floors',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    },
  )

  return Floor
}
