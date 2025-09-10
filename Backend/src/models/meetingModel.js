const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./userModel');

const Meeting = sequelize.define(
  'Meeting',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Lütfen toplantı başlığı giriniz' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Lütfen toplantı açıklaması giriniz' },
      },
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Lütfen başlangıç zamanı giriniz' },
      },
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Lütfen bitiş zamanı giriniz' },
      },
    },
    meetingType: {
      type: DataTypes.ENUM('video', 'audio', 'in-person'),
      defaultValue: 'video',
    },
    meetingLink: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    hostId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    recurrencePattern: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'none'),
      defaultValue: 'none',
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in-progress', 'completed', 'cancelled'),
      defaultValue: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

// İlişkiler
Meeting.belongsTo(User, { as: 'host', foreignKey: 'hostId' });

// Participant modelini oluştur
const Participant = sequelize.define(
  'Participant',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined'),
      defaultValue: 'pending',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    meetingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Meeting,
        key: 'id',
      },
    },
  },
  {
    timestamps: true,
  }
);

// İlişkiler
Meeting.belongsToMany(User, {
  through: Participant,
  as: 'participants',
  foreignKey: 'meetingId',
});

User.belongsToMany(Meeting, {
  through: Participant,
  as: 'meetings',
  foreignKey: 'userId',
});

// Document modelini oluştur
const Document = sequelize.define(
  'Document',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    meetingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Meeting,
        key: 'id',
      },
    },
  },
  {
    timestamps: true,
  }
);

// İlişkiler
Meeting.hasMany(Document, { as: 'documents', foreignKey: 'meetingId' });
Document.belongsTo(Meeting, { foreignKey: 'meetingId' });

module.exports = { Meeting, Participant, Document }; 