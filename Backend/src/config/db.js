const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Environment variables konfigürasyonu
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('Veritabanı Bilgileri:', {
  name: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT
});

// Eğer .env dosyasından değerler alınamazsa, varsayılan değerleri kullan
const DB_NAME = process.env.DB_NAME || 'BURAYA_VERITABANI_ADI_YAZIN';
const DB_USER = process.env.DB_USER || 'BURAYA_KULLANICI_ADI_YAZIN';
const DB_PASSWORD = process.env.DB_PASSWORD || 'BURAYA_SIFRE_YAZIN';
const DB_HOST = process.env.DB_HOST || 'BURAYA_HOST_ADRESI_YAZIN';
const DB_PORT = process.env.DB_PORT || 3306;

const sequelize = new Sequelize(
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  {
    host: DB_HOST,
    dialect: 'mysql',
    port: DB_PORT,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    timezone: '+03:00', // Türkiye zaman dilimi
  }
);

let User;
const connectDB = async () => {
  try {
    // Bağlantı bilgilerini günlüğe kaydet
    console.log('Bağlantı denemesi başlatılıyor:');
    console.log(`Host: ${DB_HOST}, Port: ${DB_PORT}, DB: ${DB_NAME}, User: ${DB_USER}`);
    
    await sequelize.authenticate();
    console.log('MySQL veritabanı bağlantısı başarılı.');
    
    // Modelleri veritabanı ile senkronize et (force: false - varolan tabloları silmez)
    await sequelize.sync({ force: false });
    console.log('Veri modelleri senkronize edildi. (Tablo yapısı değiştirilmedi)');
    
    // User modülünü sonradan içe aktar
    User = require('../models/userModel');
    
    // Admin kullanıcısı oluşturma kodu kaldırıldı - güvenlik nedeniyle
    // İlk admin kullanıcısını manuel olarak oluşturun
    
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    console.error('Hata detayları:', {
      name: error.name,
      message: error.message,
    });
    
    // MySQL bağlantı hatalarını kontrol et
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      console.error('\nMySQL bağlantı hatası! Lütfen şunları kontrol edin:');
      console.error('1. MySQL sunucunuz çalışıyor mu?');
      console.error('2. .env dosyanızdaki veritabanı bilgileri doğru mu?');
      console.error('3. Veritabanı kullanıcısının erişim izinleri var mı?');
    }
    
    if (error.name === 'SequelizeConnectionRefusedError') {
      console.error('\nMySQL bağlantısı reddedildi. MySQL hizmeti çalışıyor mu?');
    }
    
    if (error.name === 'SequelizeDatabaseError' && error.parent?.errno === 1071) { // Too many keys hatası özel durumu
        console.error('\nVeritabanı Hatası: ' + error.parent.sqlMessage);
        console.error('Bu hata genellikle `sequelize.sync({ alter: true })` kullanılırken tabloda çok fazla index/key olmasından kaynaklanır.');
        console.error('Çözüm için `sequelize.sync({ force: false })` kullanın veya Sequelize Migrations ile şemayı yönetin.');
    }

    process.exit(1);
  }
};

module.exports = { connectDB, sequelize }; 