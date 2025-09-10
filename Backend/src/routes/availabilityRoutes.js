const express = require('express');
const { check } = require('express-validator');
const {
  getTherapistAvailability,
  updateAvailability,
  deleteAvailability,
  getAvailableTherapists
} = require('../controllers/availabilityController');
const { protect, therapist } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/availability/available-therapists:
 *   get:
 *     summary: Müsait terapistleri listele
 *     tags: [Availability]
 *     responses:
 *       200:
 *         description: Müsait terapistler listesi
 *       500:
 *         description: Sunucu hatası
 */
// Önemli: Spesifik route'ları daha genel olanlardan önce tanımla
router.get('/available-therapists', getAvailableTherapists);

/**
 * @swagger
 * /api/availability:
 *   post:
 *     summary: Müsaitlik zamanlarını ekle/güncelle
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - availabilities
 *             properties:
 *               userId:
 *                 type: integer
 *               availabilities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - dayOfWeek
 *                     - isWeekday
 *                     - startTime
 *                     - endTime
 *                   properties:
 *                     dayOfWeek:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                     isWeekday:
 *                       type: boolean
 *                     startTime:
 *                       type: string
 *                       format: time
 *                     endTime:
 *                       type: string
 *                       format: time
 *                     isAvailable:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Müsaitlik zamanları başarıyla güncellendi
 *       400:
 *         description: Geçersiz istek verileri
 *       401:
 *         description: Yetkisiz erişim
 */
router.post(
  '/',
  [
    protect,
    therapist,
    check('userId', 'Kullanıcı ID gereklidir').not().isEmpty(),
    check('availabilities', 'Müsaitlik zamanları bir dizi olmalıdır').isArray(),
    check('availabilities.*.dayOfWeek', 'Geçerli bir gün seçiniz').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    check('availabilities.*.startTime', 'Başlangıç zamanı gereklidir').not().isEmpty(),
    check('availabilities.*.endTime', 'Bitiş zamanı gereklidir').not().isEmpty(),
    check('availabilities.*.isWeekday', 'Haftaiçi/Haftasonu değeri gereklidir').isBoolean(),
  ],
  updateAvailability
);

/**
 * @swagger
 * /api/availability/{id}:
 *   delete:
 *     summary: Belirli bir müsaitlik zamanını sil
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Müsaitlik ID
 *     responses:
 *       200:
 *         description: Müsaitlik zamanı başarıyla silindi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Müsaitlik zamanı bulunamadı
 */
router.delete('/:id', protect, deleteAvailability);

/**
 * @swagger
 * /api/availability/{userId}:
 *   get:
 *     summary: Terapistin müsaitlik zamanlarını getir
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapistin müsaitlik zamanları
 *       404:
 *         description: Terapist bulunamadı
 */
router.get('/:userId', getTherapistAvailability);

module.exports = router;
