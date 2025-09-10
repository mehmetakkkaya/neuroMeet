const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Sabit güvenlik anahtarı (generateToken.js ile aynı değer)
const JWT_SECRET = 'neuromeet_secure_jwt_secret_key_fixed';

// Normal koruma - Aktif kullanıcıları kontrol eder
const protect = async (req, res, next) => {
  let token;

  console.log('Authorization Header:', req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token:', token);

      // Token kontrolü
      if (!token || token === 'null' || token === 'undefined') {
        res.status(401);
        throw new Error('Geçersiz token formatı');
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded Token:', decoded);

        req.user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });

        console.log('Bulunan Kullanıcı:', req.user ? `ID: ${req.user.id}, Role: ${req.user.role}` : 'Kullanıcı bulunamadı');

        // Kullanıcının hesabının aktif olup olmadığını kontrol et
        if (!req.user) {
          res.status(401);
          throw new Error('Kullanıcı bulunamadı');
        }

        if (req.user.status !== 'active') {
          res.status(401);
          throw new Error('Hesabınız şu anda aktif değil. Lütfen yönetici ile iletişime geçin.');
        }

        next();
      } catch (jwtError) {
        console.error('JWT Doğrulama Hatası:', jwtError.message);
        res.status(401);
        throw new Error(`JWT doğrulama hatası: ${jwtError.message}`);
      }
    } catch (error) {
      console.error('Koruma Middleware Hatası:', error.message);
      res.status(401);
      throw new Error('Yetkiniz yok, token geçersiz');
    }
  } else {
    res.status(401);
    throw new Error('Yetkiniz yok, token bulunamadı. Header içinde Bearer token gereklidir.');
  }
};

// Durum kontrolü olmadan token koruma (bekleyen terapistler için)
const protectWithoutStatusCheck = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Token kontrolü
      if (!token || token === 'null' || token === 'undefined') {
        res.status(401);
        throw new Error('Geçersiz token formatı');
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });

        // Kullanıcı var mı kontrol et, durum kontrolü yapma
        if (!req.user) {
          res.status(401);
          throw new Error('Kullanıcı bulunamadı');
        }

        next();
      } catch (jwtError) {
        console.error('JWT Doğrulama Hatası:', jwtError.message);
        res.status(401);
        throw new Error(`JWT doğrulama hatası: ${jwtError.message}`);
      }
    } catch (error) {
      console.error('Koruma Middleware Hatası:', error.message);
      res.status(401);
      throw new Error('Yetkiniz yok, token geçersiz');
    }
  } else {
    res.status(401);
    throw new Error('Yetkiniz yok, token bulunamadı. Header içinde Bearer token gereklidir.');
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Yönetici yetkiniz bulunmamaktadır');
  }
};

const therapist = (req, res, next) => {
  if (req.user && (req.user.role === 'therapist' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401);
    throw new Error('Terapist yetkiniz bulunmamaktadır');
  }
};

// Bekleyen terapistler için middleware
const pendingTherapist = (req, res, next) => {
  if (req.user && req.user.role === 'therapist') {
    next();
  } else {
    res.status(401);
    throw new Error('Terapist yetkiniz bulunmamaktadır');
  }
};

// Belirli bir kullanıcı için yetki kontrolü
const checkUserAccess = (req, res, next) => {
  if (
    req.user && (
      req.user.id === parseInt(req.params.id) || // Kendi hesabına erişim
      req.user.role === 'admin' // Admin her hesaba erişebilir
    )
  ) {
    next();
  } else {
    res.status(401);
    throw new Error('Bu kullanıcı bilgilerine erişim yetkiniz yok');
  }
};

module.exports = { protect, protectWithoutStatusCheck, admin, therapist, pendingTherapist, checkUserAccess }; 