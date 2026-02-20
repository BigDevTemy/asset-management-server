'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Building extends Model {
    static associate(models) {
      Building.belongsTo(models.Location, {
        foreignKey: 'location_id',
        as: 'location',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      })

      Building.hasMany(models.Floor, {
        foreignKey: 'building_id',
        as: 'floors',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    }
  }

  Building.init(
    {
      building_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      location_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      modelName: 'Building',
      tableName: 'buildings',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    },
  )

  return Building
}
