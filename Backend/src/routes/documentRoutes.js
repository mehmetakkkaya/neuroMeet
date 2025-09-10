const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { 
  uploadDocument, 
  getUserDocuments, 
  getDocumentById, 
  downloadDocument, 
  updateDocumentStatus, 
  getPendingDocuments, 
  deleteDocument 
} = require('../controllers/documentController');
const { protect, admin, therapist } = require('../middlewares/authMiddleware');
const { upload } = require('../utils/fileUploadConfig');

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Belge yükle
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *               - documentType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 enum: [license, certificate, diploma, identity, other]
 *     responses:
 *       201:
 *         description: Belge başarıyla yüklendi
 *       400:
 *         description: Geçersiz girdi veya dosya
 *       401:
 *         description: Yetkisiz erişim
 */
router.post(
  '/upload',
  protect,
  // upload.single('file'),
  [
    check('title', 'Belge başlığı gereklidir').not().isEmpty(),
    check('documentType', 'Geçerli bir belge türü seçin').isIn(['license', 'certificate', 'diploma', 'identity', 'other']),
  ],
  uploadDocument
);

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Kullanıcıya ait belgeleri listele
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcının belge listesi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/', protect, getUserDocuments);

/**
 * @swagger
 * /api/documents/pending:
 *   get:
 *     summary: Bekleyen tüm belgeleri listele (Admin)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bekleyen belge listesi
 *       401:
 *         description: Yetkisiz erişim
 */
router.get('/pending', protect, admin, getPendingDocuments);

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: Belge detaylarını görüntüle
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Belge ID
 *     responses:
 *       200:
 *         description: Belge detayları
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Belge bulunamadı
 */
router.get('/:id', protect, getDocumentById);

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     summary: Belgeyi indir
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Belge ID
 *     responses:
 *       200:
 *         description: Belge dosyası
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Belge bulunamadı
 */
router.get('/:id/download', protect, downloadDocument);

/**
 * @swagger
 * /api/documents/{id}/status:
 *   put:
 *     summary: Belge durumunu güncelle (Admin)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Belge ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *               reviewNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Belge durumu güncellendi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Belge bulunamadı
 */
router.put(
  '/:id/status',
  protect,
  admin,
  [
    check('status', 'Geçerli bir durum seçin').isIn(['pending', 'approved', 'rejected']),
  ],
  updateDocumentStatus
);

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Belge sil
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Belge ID
 *     responses:
 *       200:
 *         description: Belge silindi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Belge bulunamadı
 */
router.delete('/:id', protect, deleteDocument);

module.exports = router;