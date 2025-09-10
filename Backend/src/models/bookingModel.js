const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./userModel');
const Availability = require('./availabilityModel');

const Booking = sequelize.define(
  'Booking',
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
    availabilityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Availability,
        key: 'id',
      },
    },
    bookingDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
      defaultValue: 'pending',
    },
    sessionType: {
      type: DataTypes.ENUM('video', 'audio', 'in-person'),
      defaultValue: 'video',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

// İlişkiler
Booking.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Booking.belongsTo(User, { as: 'therapist', foreignKey: 'therapistId' });
Booking.belongsTo(Availability, { foreignKey: 'availabilityId' });

User.hasMany(Booking, { as: 'userBookings', foreignKey: 'userId' });
User.hasMany(Booking, { as: 'therapistBookings', foreignKey: 'therapistId' });
Availability.hasMany(Booking, { foreignKey: 'availabilityId' });

module.exports = Booking; 