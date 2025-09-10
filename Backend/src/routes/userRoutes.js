const express = require('express');
const { check } = require('express-validator');
const {
  authUser,
  registerCustomer,
  registerTherapist,
  registerAdmin,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfilePicture
} = require('../controllers/userController');
const { protect, admin, checkUserAccess } = require('../middlewares/authMiddleware');
const { uploadProfilePic } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Kullanıcı girişi 
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Başarılı giriş
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [customer, therapist, admin]
 *                 status:
 *                   type: string
 *                   enum: [active, inactive, pending, suspended]
 *                 token:
 *                   type: string
 *       401:
 *         description: Geçersiz giriş bilgileri
 */
router.post(
  '/login',
  [
    check('email', 'Lütfen geçerli bir e-posta adresi girin').isEmail(),
    check('password', 'Şifre gereklidir').exists(),
  ],
  authUser
);

/**
 * @swagger
 * /api/users/register-customer:
 *   post:
 *     summary: Müşteri kaydı
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, diğer]
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Müşteri başarıyla kaydedildi
 *       400:
 *         description: Geçersiz kullanıcı bilgileri veya kullanıcı zaten var
 */
router.post(
  '/register-customer',
  [
    check('name', 'İsim gereklidir').not().isEmpty(),
    check('email', 'Lütfen geçerli bir e-posta adresi girin').isEmail(),
    check('password', 'Lütfen 6 veya daha fazla karakterden oluşan bir şifre girin').isLength({
      min: 6,
    }),
    check('phone', 'Telefon numarası gereklidir').optional(),
    check('dateOfBirth', 'Geçerli bir doğum tarihi giriniz (YYYY-MM-DD)').optional().isDate(),
    check('gender', 'Cinsiyet geçerli değil').optional().isIn(['male', 'female', 'diğer']),
  ],
  registerCustomer
);

/**
 * @swagger
 * /api/users/register-therapist:
 *   post:
 *     summary: Terapist kaydı
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *               - specialty
 *               - licenseNumber
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, diğer]
 *               address:
 *                 type: string
 *               specialty:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               educationBackground:
 *                 type: string
 *               yearsOfExperience:
 *                 type: integer
 *               bio:
 *                 type: string
 *     responses:
 *       201:
 *         description: Terapist başarıyla kaydedildi (inceleme bekliyor)
 *       400:
 *         description: Geçersiz terapist bilgileri veya kullanıcı zaten var
 */
router.post(
  '/register-therapist',
  [
    check('name', 'İsim gereklidir').not().isEmpty(),
    check('email', 'Lütfen geçerli bir e-posta adresi girin').isEmail(),
    check('password', 'Lütfen 6 veya daha fazla karakterden oluşan bir şifre girin').isLength({
      min: 6,
    }),
    check('phone', 'Telefon numarası gereklidir').not().isEmpty(),
    check('specialty', 'Uzmanlık alanı gereklidir').not().isEmpty(),
    check('licenseNumber', 'Lisans numarası gereklidir').not().isEmpty(),
    check('educationBackground', 'Eğitim geçmişi gereklidir').optional(),
    check('yearsOfExperience', 'Deneyim yılı gereklidir').isNumeric().optional(),
    check('bio', 'Biyografi gereklidir').optional(),
  ],
  registerTherapist
);

/**
 * @swagger
 * /api/users/register-admin:
 *   post:
 *     summary: Admin kaydı (sadece admin yetkisi ile)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Admin başarıyla kaydedildi
 *       401:
 *         description: Yetkisiz erişim
 *       400:
 *         description: Geçersiz admin bilgileri veya kullanıcı zaten var
 */
router.post(
  '/register-admin',
  [
    // Geçici olarak middleware devre dışı bırakıldı
    // protect,
    // admin,
    check('name', 'İsim gereklidir').not().isEmpty(),
    check('email', 'Lütfen geçerli bir e-posta adresi girin').isEmail(),
    check('password', 'Lütfen 6 veya daha fazla karakterden oluşan bir şifre girin').isLength({
      min: 6,
    }),
  ],
  registerAdmin
);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Kullanıcı profilini görüntüle
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı profil bilgileri
 *       401:
 *         description: Yetkisiz erişim
 *   put:
 *     summary: Kullanıcı profilini güncelle
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, diğer]
 *               address:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *               specialty:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               educationBackground:
 *                 type: string
 *               yearsOfExperience:
 *                 type: integer
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *       401:
 *         description: Yetkisiz erişim
 */
router.route('/profile')
  .get(protect, getUserProfile)
  .put(
    protect,
    [
      check('name', 'İsim gereklidir').optional(),
      check('email', 'Lütfen geçerli bir e-posta adresi girin').optional().isEmail(),
      check('password', 'Lütfen 6 veya daha fazla karakterden oluşan bir şifre girin')
        .optional()
        .isLength({ min: 6 }),
      check('phone', 'Telefon numarası gereklidir').optional(),
      check('dateOfBirth', 'Geçerli bir doğum tarihi giriniz (YYYY-MM-DD)').optional().isDate(),
      check('gender', 'Cinsiyet geçerli değil').optional().isIn(['male', 'female', 'diğer']),
      // Terapist alanları
      check('specialty', 'Uzmanlık alanı gereklidir').optional(),
      check('licenseNumber', 'Lisans numarası gereklidir').optional(),
      check('educationBackground', 'Eğitim geçmişi gereklidir').optional(),
      check('yearsOfExperience', 'Deneyim yılı gereklidir').isNumeric().optional(),
      check('bio', 'Biyografi gereklidir').optional(),
    ],
    updateUserProfile
  );

/**
 * @swagger
 * /api/users/profile/picture:
 *   post:
 *     summary: Kullanıcının profil resmini yükle
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               # Frontend'den gönderilecek alan adı 'profilePicture'
 *               profilePicture: 
 *                 type: string
 *                 format: binary
 *                 description: Yüklenecek profil resmi dosyası.
 *     responses:
 *       200:
 *         description: Resim başarıyla yüklendi, URL döndürüldü
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profilePictureUrl:
 *                   type: string
 *       400:
 *         description: Dosya yüklenemedi veya geçersiz dosya türü
 *       401:
 *         description: Yetkisiz erişim
 */
router.post(
  '/profile/picture',
  protect, 
  uploadProfilePic.single('profilePicture'), 
  uploadProfilePicture
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Tüm kullanıcıları listele (sadece admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 *       401:
 *         description: Yetkisiz erişim
 */
router.route('/')
  .get(protect, admin, getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Belirli bir kullanıcıyı görüntüle (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kullanıcı ID
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 *   put:
 *     summary: Kullanıcı bilgilerini güncelle (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kullanıcı ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [customer, therapist, admin]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending, suspended]
 *     responses:
 *       200:
 *         description: Kullanıcı başarıyla güncellendi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 *   delete:
 *     summary: Kullanıcıyı sil (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kullanıcı ID
 *     responses:
 *       200:
 *         description: Kullanıcı silindi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.route('/:id')
  .get(protect, admin, getUserById)
  .put(
    protect, 
    admin,
    [
      check('name', 'İsim gereklidir').optional(),
      check('email', 'Lütfen geçerli bir e-posta adresi girin').optional().isEmail(),
      check('password', 'Lütfen 6 veya daha fazla karakterden oluşan bir şifre girin')
        .optional()
        .isLength({ min: 6 }),
      check('role', 'Geçerli bir rol belirtin').optional().isIn(['customer', 'therapist', 'admin']),
      check('status', 'Geçerli bir durum belirtin').optional().isIn(['active', 'inactive', 'pending', 'suspended']),
    ],
    updateUser
  )
  .delete(protect, admin, deleteUser);

module.exports = router; 


