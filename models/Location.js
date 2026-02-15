'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    static associate(models) {
      // define associations here when needed
    }
  }

  Location.init(
    {
      location_id: {
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
      slug: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
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
      modelName: 'Location',
      tableName: 'locations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    },
  )

  return Location
}
