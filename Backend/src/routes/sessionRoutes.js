const express = require('express');
const { check } = require('express-validator');
const {
  createSession,
  getUserSessions,
  getTherapistSessions,
  getSessionById,
  updateSession,
  deleteSession,
} = require('../controllers/sessionController');
const { protect, checkUserAccess } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Yeni seans oluştur
 *     tags: [Sessions]
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
 *               - therapistId
 *               - sessionDate
 *               - endTime
 *               - price
 *             properties:
 *               userId:
 *                 type: integer
 *               therapistId:
 *                 type: integer
 *               sessionDate:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               sessionType:
 *                 type: string
 *                 enum: [video, audio, in-person]
 *               price:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Seans başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz erişim
 */
router.post(
  '/',
  protect,
  [
    check('userId', 'Kullanıcı ID gereklidir').not().isEmpty(),
    check('therapistId', 'Terapist ID gereklidir').not().isEmpty(),
    check('sessionDate', 'Seans tarihi gereklidir').isISO8601(),
    check('endTime', 'Bitiş zamanı gereklidir').isISO8601(),
    check('sessionType', 'Geçerli bir seans türü belirtin')
      .optional()
      .isIn(['video', 'audio', 'in-person']),
    check('price', 'Geçerli bir fiyat belirtin').isNumeric(),
  ],
  createSession
);

/**
 * @swagger
 * /api/sessions/user/{userId}:
 *   get:
 *     summary: Kullanıcının tüm seanslarını getir
 *     tags: [Sessions]
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
 *         description: Kullanıcının seansları
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/user/:userId', protect, getUserSessions);

/**
 * @swagger
 * /api/sessions/therapist/{therapistId}:
 *   get:
 *     summary: Terapistin tüm seanslarını getir
 *     tags: [Sessions]
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
 *         description: Terapistin seansları
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Terapist bulunamadı
 */
router.get('/therapist/:therapistId', protect, getTherapistSessions);

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Seans bilgilerini getir
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Seans ID
 *     responses:
 *       200:
 *         description: Seans bilgileri
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Seans bulunamadı
 *   put:
 *     summary: Seans durumunu güncelle
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Seans ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, in-progress, completed, cancelled, no-show]
 *               notes:
 *                 type: string
 *               meetingLink:
 *                 type: string
 *     responses:
 *       200:
 *         description: Seans başarıyla güncellendi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Seans bulunamadı
 *   delete:
 *     summary: Seans sil
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Seans ID
 *     responses:
 *       200:
 *         description: Seans silindi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Seans bulunamadı
 */
router
  .route('/:id')
  .get(protect, getSessionById)
  .put(
    protect,
    [
      check('status', 'Geçerli bir durum belirtin')
        .optional()
        .isIn(['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show']),
    ],
    updateSession
  )
  .delete(protect, deleteSession);

module.exports = router; 