const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Yüklenen dosyalar için klasörü oluştur
const createFolderIfNotExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Dosya yükleme hedef klasörü
const uploadDir = path.join(__dirname, '../../src/uploads/documents');
createFolderIfNotExists(uploadDir);

// Dosya depolama konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Kullanıcıya özgü klasör oluştur
    const userId = req.user.id;
    const userDir = path.join(uploadDir, `user_${userId}`);
    createFolderIfNotExists(userDir);
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Dosya adı formatı: timestamp-original-name.ext
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const newFilename = `${timestamp}-${path.basename(file.originalname, fileExtension)}${fileExtension}`;
    cb(null, newFilename);
  }
});

// Dosya filtreleme (sadece izin verilen dosya tipleri)
const fileFilter = (req, file, cb) => {
  // İzin verilen dosya tipleri
  const allowedFileTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Geçersiz dosya tipi. Sadece PDF, JPG, PNG, JPEG, DOC ve DOCX dosyaları kabul edilir.'), false);
  }
};

// Multer konfigürasyonu
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maksimum dosya boyutu
  }
});

module.exports = { upload };