const express = require('express');
const { check } = require('express-validator');
const {
  getAllTherapists,
  getTherapistById,
  searchTherapists,
  getTherapistsBySpecialty,
  getAllSpecialties,
  getTopRatedTherapists,
  getTherapistProfile,
  updateTherapistProfile,
  getPendingTherapists,
  approveTherapist,
  rejectTherapist,
  getTherapistPendingDashboard,
  searchTherapistsByNameES,
  getTherapistSessionFee
} = require('../controllers/therapistController');
const { getTherapistRatings } = require('../controllers/ratingController');
const { protect, admin, checkUserAccess, protectWithoutStatusCheck, pendingTherapist } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/therapists:
 *   get:
 *     summary: Tüm aktif terapistleri listele
 *     tags: [Therapists]
 *     responses:
 *       200:
 *         description: Terapist listesi başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   profilePicture:
 *                     type: string
 *                   specialty:
 *                     type: string
 *                   educationBackground:
 *                     type: string
 *                   yearsOfExperience:
 *                     type: integer
 *                   bio:
 *                     type: string
 */
router.get('/', getAllTherapists);

/**
 * @swagger
 * /api/therapists/search:
 *   get:
 *     summary: İsim ve uzmanlık alanına göre terapist ara (DB)
 *     tags: [Therapists]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Terapist adı
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *         description: Uzmanlık alanı
 *     responses:
 *       200:
 *         description: Arama sonuçları başarıyla alındı
 */
router.get('/search', searchTherapists);

/**
 * @swagger
 * /api/therapists/search-name:
 *   get:
 *     summary: Elasticsearch ile terapist adına göre ara
 *     tags: [Therapists]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Aranacak terapist adı (en az 2 karakter)
 *     responses:
 *       200:
 *         description: Arama sonuçları (ID ve isim)
 *       400:
 *         description: Geçersiz arama terimi
 *       500:
 *         description: Arama sırasında hata oluştu
 */
router.get('/search-name', searchTherapistsByNameES);

/**
 * @swagger
 * /api/therapists/specialties:
 *   get:
 *     summary: Tüm uzmanlık alanlarını listele
 *     tags: [Therapists]
 *     responses:
 *       200:
 *         description: Uzmanlık alanları listesi başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/specialties', getAllSpecialties);

/**
 * @swagger
 * /api/therapists/top-rated:
 *   get:
 *     summary: En çok tercih edilen terapistleri listele
 *     tags: [Therapists]
 *     responses:
 *       200:
 *         description: Terapist listesi başarıyla alındı
 */
router.get('/top-rated', getTopRatedTherapists);

/**
 * @swagger
 * /api/therapists/my-profile:
 *   get:
 *     summary: Terapistin kendi profilini görüntüle (sadece terapistler için)
 *     tags: [Therapists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Terapist profil bilgileri
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Sadece terapistler erişebilir
 *   put:
 *     summary: Terapist profilini güncelle (sadece terapistler için)
 *     tags: [Therapists]
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
 *                 enum: [male, female, other]
 *               address:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *               specialty:
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
 *       403:
 *         description: Sadece terapistler erişebilir
 */
router.route('/my-profile')
  .get(protect, getTherapistProfile)
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
      check('gender', 'Cinsiyet geçerli değil').optional().isIn(['male', 'female', 'other']),
      check('specialty', 'Uzmanlık alanı gereklidir').optional(),
      check('educationBackground', 'Eğitim geçmişi gereklidir').optional(),
      check('yearsOfExperience', 'Deneyim yılı gereklidir').isNumeric().optional(),
      check('bio', 'Biyografi gereklidir').optional(),
    ],
    updateTherapistProfile
  );

/**
 * @swagger
 * /api/therapists/pending-approval:
 *   get:
 *     summary: Onay bekleyen terapistleri listele (admin)
 *     tags: [Therapists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onay bekleyen terapist listesi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/pending-approval', protect, admin, getPendingTherapists);

/**
 * @swagger
 * /api/therapists/pending-dashboard:
 *   get:
 *     summary: Bekleyen terapistler için durum sayfası
 *     tags: [Therapists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Terapist durumu ve onay süreci bilgileri
 *       401:
 *         description: Yetkisiz erişim
 *       403:
 *         description: Sadece terapistler erişebilir
 */
router.get('/pending-dashboard', protectWithoutStatusCheck, pendingTherapist, getTherapistPendingDashboard);

/**
 * @swagger
 * /api/therapists/specialty/{specialty}:
 *   get:
 *     summary: Belirli bir uzmanlık alanına sahip terapistleri listele
 *     tags: [Therapists]
 *     parameters:
 *       - in: path
 *         name: specialty
 *         required: true
 *         schema:
 *           type: string
 *         description: Uzmanlık alanı
 *     responses:
 *       200:
 *         description: Terapist listesi başarıyla alındı
 */
router.get('/specialty/:specialty', getTherapistsBySpecialty);

/**
 * @swagger
 * /api/therapists/{id}:
 *   get:
 *     summary: Belirli bir terapistin bilgilerini görüntüle
 *     tags: [Therapists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapist bilgileri başarıyla alındı
 *       404:
 *         description: Terapist bulunamadı
 */
router.get('/:id', getTherapistById);

/**
 * @swagger
 * /api/therapists/{id}/ratings:
 *   get:
 *     summary: Belirli bir terapistin tüm değerlendirmelerini getir (Public)
 *     tags: [Therapists, Ratings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapistin değerlendirmeleri (yorumlar dahil)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Rating' 
 *       404:
 *         description: Terapist bulunamadı
 */
router.get('/:id/ratings', getTherapistRatings);

/**
 * @swagger
 * /api/therapists/{id}/session-fee:
 *   get:
 *     summary: Belirli bir terapistin seans ücretini getir (Public)
 *     tags: [Therapists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapistin seans ücreti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionFee:
 *                   type: number
 *                   format: float
 *       404:
 *         description: Aktif terapist bulunamadı
 */
router.get('/:id/session-fee', getTherapistSessionFee);

/**
 * @swagger
 * /api/therapists/approve/{id}:
 *   put:
 *     summary: Terapist başvurusunu onayla (admin)
 *     tags: [Therapists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapist başarıyla onaylandı
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Terapist bulunamadı
 */
router.put('/approve/:id', protect, admin, approveTherapist);

/**
 * @swagger
 * /api/therapists/reject/{id}:
 *   put:
 *     summary: Terapist başvurusunu reddet (admin)
 *     tags: [Therapists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapist başvurusu reddedildi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Terapist bulunamadı
 */
router.put('/reject/:id', protect, admin, rejectTherapist);

module.exports = router; 