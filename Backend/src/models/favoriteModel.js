const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./userModel');

const Favorite = sequelize.define(
  'Favorite',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    therapistId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'therapistId'],
      },
    ],
  }
);

// İlişkiler
Favorite.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Favorite.belongsTo(User, { as: 'therapist', foreignKey: 'therapistId' });

User.hasMany(Favorite, { as: 'favorites', foreignKey: 'userId' });
User.hasMany(Favorite, { as: 'favoritedBy', foreignKey: 'therapistId' });

module.exports = Favorite; 