const { sequelize } = require('../config/db');
const User = require('../models/userModel');
const { Meeting, Participant, Document } = require('../models/meetingModel');
const dotenv = require('dotenv');
const path = require('path');

// .env dosyasını yükle
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('Veritabanı oluşturma işlemi başlatılıyor...');
console.log('Veritabanı bilgileri:', {
  name: process.env.DB_NAME || 'neuromeet',
  user: process.env.DB_USER || 'root',
  password: 'XXXX', // Gizlilik için şifre gösterilmiyor
  host: process.env.DB_HOST || '127.0.0.1'
});

// Modelleri veritabanına senkronize et
const initDB = async () => {
  try {
    // Bağlantıyı test et
    await sequelize.authenticate();
    console.log('MySQL bağlantısı başarılı.');

    // Tüm tabloları ve ilişkileri oluştur (force: true tüm tabloları siler ve yeniden oluşturur)
    await sequelize.sync({ force: true });
    console.log('Tüm tablolar ve ilişkiler başarıyla oluşturuldu.');

    // Test verileri eklenebilir
    const admin = await User.create({
      name: 'Admin Kullanıcı',
      email: 'admin@neuromeet.com',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    });
    console.log('Admin kullanıcı oluşturuldu:', admin.id);

    // İşlem başarılı
    console.log('Veritabanı başarıyla oluşturuldu.');
    process.exit(0);
  } catch (error) {
    console.error('Veritabanı oluşturma hatası:', error);
    process.exit(1);
  }
};

// İşlemi başlat
initDB(); 