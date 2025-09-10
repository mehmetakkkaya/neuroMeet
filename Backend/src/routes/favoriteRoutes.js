const express = require('express');
const { check } = require('express-validator');
const {
  addFavoriteTherapist,
  removeFavoriteTherapist,
  getUserFavorites,
  getTherapistFavoriteCount,
} = require('../controllers/favoriteController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/users/{id}/favorite:
 *   post:
 *     summary: Terapisti favorilere ekle
 *     tags: [Favorites]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - therapistId
 *             properties:
 *               therapistId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Terapist favorilere eklendi
 *       400:
 *         description: Geçersiz istek veya terapist zaten favorilerde
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Kullanıcı veya terapist bulunamadı
 */
router.post(
  '/users/:id/favorite',
  protect,
  [check('therapistId', 'Terapist ID gereklidir').not().isEmpty()],
  addFavoriteTherapist
);

/**
 * @swagger
 * /api/users/{id}/favorite/{therapistId}:
 *   delete:
 *     summary: Terapisti favorilerden çıkar
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kullanıcı ID
 *       - in: path
 *         name: therapistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapist favorilerden çıkarıldı
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Favori bulunamadı
 */
router.delete('/users/:id/favorite/:therapistId', protect, removeFavoriteTherapist);

/**
 * @swagger
 * /api/users/{id}/favorites:
 *   get:
 *     summary: Kullanıcının favori terapistlerini getir
 *     tags: [Favorites]
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
 *         description: Kullanıcının favori terapistleri
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/users/:id/favorites', protect, getUserFavorites);

/**
 * @swagger
 * /api/therapists/{id}/favorites/count:
 *   get:
 *     summary: Terapistin favori edilme sayısını getir
 *     tags: [Favorites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Terapist ID
 *     responses:
 *       200:
 *         description: Terapistin favori edilme sayısı
 *       404:
 *         description: Terapist bulunamadı
 */
router.get('/therapists/:id/favorites/count', getTherapistFavoriteCount);

module.exports = router; 