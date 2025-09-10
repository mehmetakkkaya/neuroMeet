const express = require('express');
const { check } = require('express-validator');
const {
  sendMessage,
  getUserMessages,
  getChatHistory,
  getChatList,
  markMessagesAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Mesaj gönder
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: integer
 *               content:
 *                 type: string
 *               attachmentUrl:
 *                 type: string
 *               attachmentType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mesaj başarıyla gönderildi
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Alıcı bulunamadı
 */
router.post(
  '/send',
  protect,
  [
    check('receiverId', 'Alıcı ID gereklidir').not().isEmpty(),
    check('content', 'Mesaj içeriği gereklidir').not().isEmpty(),
  ],
  sendMessage
);

/**
 * @swagger
 * /api/messages/{userId}:
 *   get:
 *     summary: Kullanıcının mesaj geçmişini getir
 *     tags: [Messages]
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
 *         description: Kullanıcının mesaj geçmişi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/:userId', protect, getUserMessages);

/**
 * @swagger
 * /api/chat/{userId}/{otherUserId}:
 *   get:
 *     summary: İki kullanıcı arasındaki sohbet geçmişini getir
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kullanıcı ID
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diğer kullanıcı ID
 *     responses:
 *       200:
 *         description: Sohbet geçmişi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/chat/:userId/:otherUserId', protect, getChatHistory);

/**
 * @swagger
 * /api/chat/list/{userId}:
 *   get:
 *     summary: Kullanıcının sohbet listesini getir
 *     tags: [Messages]
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
 *         description: Kullanıcının sohbet listesi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/chat/list/:userId', protect, getChatList);

/**
 * @swagger
 * /api/messages/read:
 *   put:
 *     summary: Mesajları okundu olarak işaretle
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Mesajlar okundu olarak işaretlendi
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkisiz erişim
 */
router.put('/read', protect, markMessagesAsRead);

module.exports = router; 