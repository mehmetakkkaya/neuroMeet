const { Client } = require('@elastic/elasticsearch');
const dotenv = require('dotenv');
const path = require('path');

// Proje kök dizinindeki .env dosyasını yükle
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Ortam değişkenlerini kontrol et
if (!process.env.ELASTICSEARCH_NODE) {
  console.warn('Uyarı: ELASTICSEARCH_NODE ortam değişkeni ayarlanmamış. Varsayılan olarak "http://localhost:9200" kullanılacak.');
}

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'BURAYA_ELASTICSEARCH_URL_YAZIN',
  // Gerekirse kimlik doğrulama bilgileri eklenebilir
  // auth: {
  //   username: process.env.ELASTICSEARCH_USERNAME,
  //   password: process.env.ELASTICSEARCH_PASSWORD
  // },
  // Bağlantı zaman aşımı ve istek zaman aşımı ayarları
  requestTimeout: 60000, // 60 saniye
  pingTimeout: 3000,    // 3 saniye
  sniffOnStart: false,  // Başlangıçta node'ları koklama
  sniffOnConnectionFault: false, // Bağlantı hatasında node'ları koklama
  // === Tekrar: ES v8 Uyumluluğu için Header'ları Ayarla ===
  headers: { 
    'Accept': 'application/vnd.elasticsearch+json; compatible-with=8',
    'Content-Type': 'application/vnd.elasticsearch+json; compatible-with=8'
  }
  // === ===
});

async function testConnection() {
  try {
    await client.ping();
    console.log('Elasticsearch bağlantısı başarılı.');
    return true;
  } catch (error) {
    console.error('Elasticsearch bağlantı hatası:', error);
    // Detaylı hata mesajı loglama
    if (error.meta && error.meta.body) {
      console.error('Elasticsearch Hata Detayı:', error.meta.body);
    }
    return false;
  }
}

module.exports = { client, testConnection }; 