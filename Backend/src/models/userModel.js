const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/db');
// Elasticsearch client'ı import et
const { client } = require('../config/elasticsearch'); 
const { INDEX_NAME } = require('../utils/createTherapistNameIndex'); // Doğru index adını al

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Lütfen isim giriniz' },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Lütfen geçerli bir email adresi giriniz' },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, 100],
          msg: 'Şifre en az 6 karakter olmalıdır',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('customer', 'therapist', 'admin'),
      defaultValue: 'customer',
    },
    profilePicture: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Terapistler için ek alanlar
    specialty: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    educationBackground: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    yearsOfExperience: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sessionFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending', 'suspended'),
      defaultValue: 'pending',
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },

      // ----- YENİ ELASTICSEARCH HOOK'LARI -----
      afterCreate: async (user, options) => {
        if (user.role === 'therapist' && user.status === 'active') {
          try {
            // Bağlantıyı kontrol et
            const isConnected = await client.ping().catch(() => false);
            if (!isConnected) {
              console.error('ES bağlantısı yok, afterCreate indexleme atlandı.');
              return;
            }
            await client.index({
              index: INDEX_NAME,
              id: user.id.toString(), 
              document: {
                mysqlId: user.id,
                name: user.name,
                status: user.status
              }
            });
            console.log(`Terapist indexlendi (afterCreate): ID ${user.id}`);
          } catch (error) {
            console.error(`ES indexleme hatası (afterCreate): ID ${user.id}`, error.meta ? error.meta.body : error);
          }
        }
      },
      afterUpdate: async (user, options) => {
        if (user.role !== 'therapist') return; 

        const isActive = user.status === 'active';
        const wasActive = user.previous('status') === 'active';
        const nameChanged = user.changed('name');
        const statusChanged = user.changed('status');

        try {
          const isConnected = await client.ping().catch(() => false);
          if (!isConnected) {
            console.error('ES bağlantısı yok, afterUpdate işlemi atlandı.');
            return;
          }
          const docExists = await client.exists({ index: INDEX_NAME, id: user.id.toString() }).catch(() => false);
          
          // Durum aktif olduysa veya aktifken ismi değiştiyse indexle/güncelle
          if ((isActive && statusChanged) || (isActive && nameChanged)) {
            await client.index({
              index: INDEX_NAME,
              id: user.id.toString(),
              document: {
                mysqlId: user.id,
                name: user.name,
                status: user.status
              }
            });
            console.log(`Terapist indexlendi/güncellendi (afterUpdate): ID ${user.id}`);
          } 
          // Durum aktif değilse veya aktiften değiştiyse ve indexte varsa sil
          else if ((!isActive && statusChanged && docExists) || (!isActive && docExists)) { 
             await client.delete({ index: INDEX_NAME, id: user.id.toString() });
             console.log(`Terapist index'ten silindi (afterUpdate): ID ${user.id}`);
          }
        } catch (error) {
          console.error(`ES güncelleme/silme hatası (afterUpdate): ID ${user.id}`, error.meta ? error.meta.body : error);
        }
      },
      afterDestroy: async (user, options) => {
        if (user.role === 'therapist') {
          try {
            const isConnected = await client.ping().catch(() => false);
            if (!isConnected) {
              console.error('ES bağlantısı yok, afterDestroy işlemi atlandı.');
              return;
            }
            // Silmeden önce varlığını kontrol etmek daha güvenli olabilir
            const docExists = await client.exists({ index: INDEX_NAME, id: user.id.toString() }).catch(() => false);
            if(docExists) {
                await client.delete({ index: INDEX_NAME, id: user.id.toString() });
                console.log(`Terapist index'ten silindi (afterDestroy): ID ${user.id}`);
            }
          } catch (error) {
             if (error.meta && error.meta.statusCode !== 404) {
                console.error(`ES silme hatası (afterDestroy): ID ${user.id}`, error.meta.body);
             } else if (!error.meta) {
                console.error(`ES silme hatası (afterDestroy): ID ${user.id}`, error);
             }
          }
        }
      }
      // ----- HOOK SONU -----
    },
  }
);

// Şifre doğrulama metodu
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User; 