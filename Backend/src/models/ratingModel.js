const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./userModel');
const Booking = require('./bookingModel');

const Rating = sequelize.define(
  'Rating',
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
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Booking,
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);

// İlişkiler
Rating.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Rating.belongsTo(User, { as: 'therapist', foreignKey: 'therapistId' });
Rating.belongsTo(Booking, { foreignKey: 'bookingId' });

User.hasMany(Rating, { as: 'givenRatings', foreignKey: 'userId' });
User.hasMany(Rating, { as: 'receivedRatings', foreignKey: 'therapistId' });
Booking.hasOne(Rating, { foreignKey: 'bookingId' });

module.exports = Rating; 