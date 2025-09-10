const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// .env dosyasının yolunu belirterek yükleme
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// JWT Secret - .env dosyasından yüklenir
const JWT_SECRET = process.env.JWT_SECRET || 'BURAYA_JWT_SECRET_ANAHTARI_YAZIN';

// Debug log
console.log('JWT_SECRET kontrol ediliyor:', JWT_SECRET ? 'Değer mevcut' : 'Değer bulunamadı');

// id parametresi artık MongoDB ObjectId değil, integer ID
const generateToken = (id) => {
  console.log(`[generateToken] Token oluşturuluyor: Kullanıcı ID=${id}`);
  
  // ID'nin geçerli olduğundan emin ol
  if (!id) {
    console.error('[generateToken] Hata: Geçersiz kullanıcı ID');
    throw new Error('Token oluşturmak için geçerli bir kullanıcı ID gerekmektedir');
  }
  
  try {
    const token = jwt.sign({ id }, JWT_SECRET, {
      expiresIn: '30d',
    });
    
    console.log(`[generateToken] Token başarıyla oluşturuldu: ${token.substring(0, 20)}...`);
    return token;
  } catch (error) {
    console.error(`[generateToken] JWT oluşturma hatası: ${error.message}`);
    throw new Error(`Token oluşturulamadı: ${error.message}`);
  }
};

module.exports = generateToken; 