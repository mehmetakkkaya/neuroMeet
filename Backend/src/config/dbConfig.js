const dotenv = require('dotenv');
const path = require('path');

// .env dosyasının kök dizinde olduğunu varsayıyoruz
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Eğer process.env içinde tanımlı değilse, db.js'deki fallback değerleri kullan
const DB_NAME = process.env.DB_NAME || 'neuromeet';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'test';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Sequelize-cli'nin beklediği formatta config nesnesi
module.exports = {
  [NODE_ENV]: {
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    // Diğer dialectOptions, timezone vb. gerekirse eklenebilir
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    timezone: '+03:00',
  },
  // İhtiyaç halinde 'test' ve 'production' ortamları için de benzer konfigürasyonlar ekleyebilirsiniz.
  // Örneğin:
  // test: {
  //   username: process.env.TEST_DB_USER || 'root',
  //   password: process.env.TEST_DB_PASSWORD || null,
  //   database: process.env.TEST_DB_NAME || 'database_test',
  //   host: process.env.TEST_DB_HOST || '127.0.0.1',
  //   dialect: 'mysql'
  // },
  // production: {
  //   username: process.env.PROD_DB_USER,
  //   password: process.env.PROD_DB_PASSWORD,
  //   database: process.env.PROD_DB_NAME,
  //   host: process.env.PROD_DB_HOST,
  //   dialect: 'mysql'
  // }
}; 