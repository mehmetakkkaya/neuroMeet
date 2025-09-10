// Environment variables configuration - MUTLAKA EN BAŞTA YÜKLENMELİ!
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Diğer importlar dotenv yüklendikten SONRA gelmeli
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const { connectDB } = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middlewares/errorMiddleware');
const swaggerDocs = require('./src/config/swagger');
const { testConnection: testESConnection } = require('./src/config/elasticsearch');
const { createIndex: createTherapistNameESIndex } = require('./src/utils/createTherapistNameIndex');

// Ortam değişkenlerini KONTROL ET (dotenv yüklendikten sonra)
console.log('Server JWT_SECRET durumu:', process.env.JWT_SECRET ? 'Mevcut' : 'Eksik!');
console.log('NODE_ENV durumu:', process.env.NODE_ENV);
console.log('ELASTICSEARCH_NODE durumu:', process.env.ELASTICSEARCH_NODE);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Statik dosya sunumu (varsa)
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); 

// Basic route
app.get('/', (req, res) => {
  res.send('NeuroMeet API Sunucusu Çalışıyor');
});

// === API Routes ===
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/meetings', require('./src/routes/meetingRoutes'));
app.use('/api/documents', require('./src/routes/documentRoutes'));
app.use('/api/therapists', require('./src/routes/therapistRoutes'));
app.use('/api/availability', require('./src/routes/availabilityRoutes'));
app.use('/api/ratings', require('./src/routes/ratingRoutes'));
app.use('/api', require('./src/routes/favoriteRoutes')); 
app.use('/api/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/messages', require('./src/routes/messageRoutes'));

// === Swagger API Belgelendirmesi ===
swaggerDocs(app);

// === Error Handling Middleware ===
app.use(notFound);
app.use(errorHandler);

// === Sunucuyu Başlatan Async Fonksiyon ===
const startServer = async () => {
  try {
    // 1. Veritabanı bağlantısını kur ve bekle
    await connectDB(); 
    console.log('Veritabanı bağlantısı kuruldu.');
    
    // 2. Elasticsearch bağlantısını test et ve bekle
    const esConnected = await testESConnection();
    
    // 3. ES bağlantısı başarılıysa index'i oluştur/kontrol et ve bekle
    if (esConnected) {
      await createTherapistNameESIndex();
    } else {
      console.warn('Elasticsearch bağlantısı kurulamadığı için index oluşturma işlemi atlandı.');
    }
    
    // 4. TÜM hazırlıklar bittikten sonra sunucuyu dinlemeye başla
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

  } catch (error) {
    console.error("Sunucu başlatılırken kritik bir hata oluştu:", error);
    process.exit(1); // Uygulamayı durdur
  }
};

// === Sunucuyu Başlat ===
startServer(); 

