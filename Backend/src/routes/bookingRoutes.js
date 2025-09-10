const express = require('express');
const { check } = require('express-validator');
const {
  createBooking,
  getUserBookings,
  getTherapistBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  getTherapistBookedSlots
} = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Yeni randevu oluştur
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - therapistId
 *               - availabilityId
 *               - bookingDate
 *               - startTime
 *               - endTime
 *             properties:
 *               therapistId:
 *                 type: integer
 *               availabilityId:
 *                 type: integer
 *               bookingDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 format: time
 *               endTime:
 *                 type: string
 *                 format: time
 *               sessionType:
 *                 type: string
 *                 enum: [video, audio, in-person]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Randevu başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz erişim
 */
router.post(
  '/',
  protect,
  [
    check('therapistId', 'Terapist ID gereklidir').not().isEmpty(),
    check('availabilityId', 'Uygunluk ID gereklidir').not().isEmpty(),
    check('bookingDate', 'Geçerli bir randevu tarihi giriniz (YYYY-MM-DD)').isDate(),
    check('startTime', 'Başlangıç saati gereklidir').not().isEmpty(),
    check('endTime', 'Bitiş saati gereklidir').not().isEmpty(),
    check('sessionType', 'Geçerli bir seans türü belirtin')
      .optional()
      .isIn(['video', 'audio', 'in-person']),
  ],
  createBooking
);

/**
 * @swagger
 * /api/bookings/user/{userId}:
 *   get:
 *     summary: Kullanıcının randevularını getir
 *     tags: [Bookings]
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
 *         description: Kullanıcının randevuları
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/user/:userId', protect, getUserBookings);

/**
 * @swagger
 * /api/bookings/therapist/{therapistId}:
 *   get:
 *     summary: Terapistin randevularını getir
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: therapistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapistin randevuları
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/therapist/:therapistId', protect, getTherapistBookings);

/**
 * @swagger
 * /api/bookings/therapist/{therapistId}/booked-slots:
 *   get:
 *     summary: Belirli bir terapistin belirli bir tarihteki dolu saatlerini getir
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: therapistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Dolu saatleri getirilecek tarih (YYYY-MM-DD formatında)
 *     responses:
 *       200:
 *         description: Belirtilen tarihteki dolu başlangıç saatlerinin listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 format: time
 *                 example: "09:00:00"
 *       400:
 *         description: Geçersiz tarih formatı veya eksik parametre
 *       404:
 *         description: Terapist bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/therapist/:therapistId/booked-slots', getTherapistBookedSlots);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Randevu bilgilerini getir
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Randevu ID
 *     responses:
 *       200:
 *         description: Randevu bilgileri
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Randevu bulunamadı
 *   put:
 *     summary: Randevu durumunu güncelle
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Randevu ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Randevu başarıyla güncellendi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Randevu bulunamadı
 *   delete:
 *     summary: Randevuyu iptal et
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Randevu ID
 *     responses:
 *       200:
 *         description: Randevu iptal edildi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Randevu bulunamadı
 */
router
  .route('/:id')
  .get(protect, getBookingById)
  .put(
    protect,
    [
      check('status', 'Geçerli bir durum belirtin')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled', 'completed']),
      check('notes', 'Notlar geçerli olmalıdır').optional(),
    ],
    updateBooking
  )
  .delete(protect, cancelBooking);

module.exports = router; 