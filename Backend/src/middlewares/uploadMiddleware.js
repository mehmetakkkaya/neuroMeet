const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Yükleme klasörünü belirle ve yoksa oluştur
const uploadDir = path.join(__dirname, '../../public/uploads/profilePictures');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk depolama ayarları
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Dosyaların kaydedileceği yer
  },
  filename: function (req, file, cb) {
    // Dosya adını benzersiz yap (kullanıcıId-zamanDamgası.uzantı)
    // req.user'ın authMiddleware tarafından eklendiğini varsayıyoruz
    const userId = req.user ? req.user.id : 'unknown'; 
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, userId + '-' + uniqueSuffix + extension);
  }
});

// Dosya türü filtresi (sadece resimlere izin ver)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
  }
};

// Multer middleware'ini oluştur
const uploadProfilePic = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5 MB limit
  },
  fileFilter: fileFilter
});

module.exports = { uploadProfilePic }; // Export ederken obje içinde yapalım 