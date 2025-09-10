// scripts/initialIndexTherapists.js

// Önce dotenv'ı yükleyerek .env değişkenlerine erişelim
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Kök dizindeki .env'i gösterir

// Modeli doğrudan import et
const User = require('../src/models/userModel'); 

const { client } = require('../src/config/elasticsearch');
const { INDEX_NAME } = require('../src/utils/createTherapistNameIndex');
const { sequelize } = require('../src/config/db'); // Veritabanı bağlantısını yönetmek için

// Ana indexleme fonksiyonu
async function indexActiveTherapists() {
  console.log('Aktif terapistleri Elasticsearch\'e indexleme işlemi başlıyor...');

  try {
    // 1. Elasticsearch Bağlantısını Kontrol Et
    console.log('Elasticsearch bağlantısı kontrol ediliyor...');
    const isESConnected = await client.ping().catch(err => {
      console.error('Elasticsearch ping hatası:', err);
      return false;
    });

    if (!isESConnected) {
      console.error('Elasticsearch bağlantısı kurulamadı. İşlem iptal edildi.');
      return; // Bağlantı yoksa devam etme
    }
    console.log('Elasticsearch bağlantısı başarılı.');

    // 2. Veritabanı Bağlantısını Kontrol Et (Sequelize zaten başlangıçta bağlanıyor olmalı ama emin olalım)
    await sequelize.authenticate();
    console.log('Veritabanı bağlantısı başarılı.');

    // 3. Aktif Terapistleri Çek
    console.log('Aktif terapistler veritabanından çekiliyor...');
    const therapists = await User.findAll({
      where: {
        role: 'therapist',
        status: 'active'
      },
      attributes: ['id', 'name', 'status'] // Sadece gerekli alanları al
    });

    if (!therapists || therapists.length === 0) {
      console.log('Indexlenecek aktif terapist bulunamadı.');
      return; // Terapist yoksa devam etme
    }
    console.log(`${therapists.length} aktif terapist bulundu.`);

    // 4. Elasticsearch Bulk Operasyonlarını Hazırla
    console.log('Elasticsearch bulk operasyonları hazırlanıyor...');
    const operations = therapists.flatMap(therapist => [
      // Her doküman için bir index aksiyonu ve ardından dokümanın kendisi
      { index: { _index: INDEX_NAME, _id: therapist.id.toString() } },
      { 
        mysqlId: therapist.id, 
        name: therapist.name, 
        status: therapist.status 
      }
    ]);

    // 5. Bulk İsteğini Gönder
    console.log('Bulk indexleme isteği Elasticsearch\'e gönderiliyor...');
    const bulkResponse = await client.bulk({ 
      refresh: true, // Değişikliklerin hemen aranabilir olmasını sağla
      operations 
    });

    // 6. Sonucu Kontrol Et ve Logla
    if (bulkResponse.errors) {
      console.error('Bulk indexleme sırasında hatalar oluştu:');
      // Hatalı itemları logla
      bulkResponse.items.forEach((action, i) => {
        const operation = Object.keys(action)[0];
        if (action[operation].error) {
          console.error(`  Hata: ${action[operation].error.type}`);
          console.error(`  Sebep: ${action[operation].error.reason}`);
          console.error('  Doküman:', operations[i * 2 + 1]); // Hatalı dokümanı göster
        }
      });
    } else {
      console.log(`Başarıyla ${bulkResponse.items.length} terapist indexlendi.`);
    }

  } catch (error) {
    console.error('Indexleme scripti sırasında beklenmedik bir hata oluştu:', error);
  } finally {
    // İşlem bittikten sonra veritabanı bağlantısını kapat
    await sequelize.close();
    console.log('Veritabanı bağlantısı kapatıldı.');
  }
}

// Scripti çalıştır
indexActiveTherapists(); 