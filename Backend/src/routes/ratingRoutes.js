const express = require('express');
const { check } = require('express-validator');
const {
  createRating,
  updateRating,
  getTherapistRatings,
  getNotRatedBookings,
  getRatingStats,
} = require('../controllers/ratingController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     summary: Randevu (booking) değerlendirmesi oluştur
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - rating
 *             properties:
 *               bookingId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               isAnonymous:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Değerlendirme başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz istek veya tamamlanmamış randevu
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Randevu bulunamadı
 *   get:
 *     summary: Genel değerlendirme istatistiklerini getir
 *     tags: [Ratings]
 *     responses:
 *       200:
 *         description: Değerlendirme istatistikleri
 */
router
  .route('/')
  .post(
    protect,
    [
      check('bookingId', 'Randevu ID gereklidir').not().isEmpty(),
      check('rating', 'Değerlendirme puanı 1-5 arasında olmalıdır').isInt({ min: 1, max: 5 }),
      check('comment', 'Yorum metni geçerli olmalıdır').optional(),
      check('isAnonymous', 'Anonim değeri geçerli olmalıdır').optional().isBoolean(),
    ],
    createRating
  )
  .get(getRatingStats);

/**
 * @swagger
 * /api/ratings/{id}:
 *   put:
 *     summary: Değerlendirmeyi güncelle
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Değerlendirme ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               isAnonymous:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Değerlendirme başarıyla güncellendi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Değerlendirme bulunamadı
 */
router.put(
  '/:id',
  protect,
  [
    check('rating', 'Değerlendirme puanı 1-5 arasında olmalıdır')
      .optional()
      .isInt({ min: 1, max: 5 }),
    check('comment', 'Yorum metni geçerli olmalıdır').optional(),
    check('isAnonymous', 'Anonim değeri geçerli olmalıdır').optional().isBoolean(),
  ],
  updateRating
);

/**
 * @swagger
 * /api/ratings/not-rated-bookings/{userId}:
 *   get:
 *     summary: Kullanıcının değerlendirmediği randevuları (bookings) getir
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kullanıcı ID
 *     responses:
 *       200:
 *         description: Değerlendirilmemiş randevular
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/not-rated-bookings/:userId', protect, getNotRatedBookings);

/**
 * @swagger
 * /api/therapists/{id}/ratings:
 *   get:
 *     summary: Terapistin tüm değerlendirmelerini getir
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapist değerlendirmeleri
 *       404:
 *         description: Terapist bulunamadı
 */
// Bu endpoint therapistRoutes.js içinde tanımlanabilir
// Burada referans için tutulmuştur
// router.get('/therapist/:therapistId/ratings', getTherapistRatings);

module.exports = router; 