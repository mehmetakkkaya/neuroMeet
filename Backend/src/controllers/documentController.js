const TherapistDocument = require('../models/documentModel');
const User = require('../models/userModel');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

// @desc    Belge yükle
// @route   POST /api/documents/upload
// @access  Private (Terapist/Admin)
const uploadDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Lütfen bir dosya seçin' });
    }

    const { title, description, documentType } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Dosya bilgilerini oluştur
    const document = await TherapistDocument.create({
      title,
      description,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      documentType: documentType || 'other',
      userId: req.user.id,
      status: 'pending'
    });

    // Terapist kullanıcısını pending durumuna getir
    if (user.role === 'therapist' && user.status !== 'active') {
      user.status = 'pending';
      await user.save();
    }

    res.status(201).json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        status: document.status,
        createdAt: document.createdAt
      },
      message: 'Belge başarıyla yüklendi ve inceleme için gönderildi'
    });
  } catch (error) {
    console.error('Belge yükleme hatası:', error);
    res.status(500).json({ message: 'Belge yüklenirken bir hata oluştu', error: error.message });
  }
};

// @desc    Kullanıcıya ait belgeleri getir
// @route   GET /api/documents
// @access  Private
const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await TherapistDocument.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(documents);
  } catch (error) {
    console.error('Belgeler alınırken hata:', error);
    res.status(500).json({ message: 'Belgeler alınırken bir hata oluştu', error: error.message });
  }
};

// @desc    Belirli bir belgeyi getir
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = async (req, res) => {
  try {
    const document = await TherapistDocument.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Belge bulunamadı' });
    }

    // Yetki kontrolü - sadece belge sahibi veya admin
    if (document.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bu belgeye erişim yetkiniz yok' });
    }

    res.json(document);
  } catch (error) {
    console.error('Belge alınırken hata:', error);
    res.status(500).json({ message: 'Belge alınırken bir hata oluştu', error: error.message });
  }
};

// @desc    Belgeyi indir
// @route   GET /api/documents/:id/download
// @access  Private
const downloadDocument = async (req, res) => {
  try {
    const document = await TherapistDocument.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Belge bulunamadı' });
    }

    // Yetki kontrolü - sadece belge sahibi veya admin
    if (document.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bu belgeye erişim yetkiniz yok' });
    }

    const filePath = document.filePath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Dosya bulunamadı' });
    }

    res.download(filePath, document.originalName);
  } catch (error) {
    console.error('Belge indirilirken hata:', error);
    res.status(500).json({ message: 'Belge indirilirken bir hata oluştu', error: error.message });
  }
};

// @desc    Belge durumunu güncelle (Admin)
// @route   PUT /api/documents/:id/status
// @access  Private/Admin
const updateDocumentStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reviewNotes } = req.body;

    const document = await TherapistDocument.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Belge bulunamadı' });
    }

    // Belge durumunu güncelle
    document.status = status;
    document.reviewNotes = reviewNotes || document.reviewNotes;
    document.reviewedBy = req.user.id;
    document.reviewedAt = new Date();

    await document.save();

    // Eğer bu bir lisans belgesi ve onaylandıysa, terapist durumunu güncelle
    if (document.documentType === 'license' && status === 'approved') {
      const therapist = await User.findByPk(document.userId);
      if (therapist && therapist.role === 'therapist') {
        // Terapistin tüm zorunlu belgeleri onaylandı mı kontrol et
        const pendingDocs = await TherapistDocument.count({
          where: {
            userId: therapist.id,
            documentType: 'license',
            status: 'pending'
          }
        });

        if (pendingDocs === 0) {
          therapist.status = 'active';
          await therapist.save();
        }
      }
    }

    res.json({
      success: true,
      document: {
        id: document.id,
        status: document.status,
        reviewedAt: document.reviewedAt,
        reviewNotes: document.reviewNotes
      },
      message: `Belge durumu başarıyla '${status}' olarak güncellendi`
    });
  } catch (error) {
    console.error('Belge durumu güncellenirken hata:', error);
    res.status(500).json({ message: 'Belge durumu güncellenirken bir hata oluştu', error: error.message });
  }
};

// @desc    Tüm bekleyen belgeleri listele (Admin)
// @route   GET /api/documents/pending
// @access  Private/Admin
const getPendingDocuments = async (req, res) => {
  try {
    const documents = await TherapistDocument.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role', 'status'],
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json(documents);
  } catch (error) {
    console.error('Bekleyen belgeler alınırken hata:', error);
    res.status(500).json({ message: 'Bekleyen belgeler alınırken bir hata oluştu', error: error.message });
  }
};

// @desc    Belgeyi sil
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const document = await TherapistDocument.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Belge bulunamadı' });
    }

    // Yetki kontrolü - sadece belge sahibi veya admin
    if (document.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bu belgeyi silme yetkiniz yok' });
    }

    // Dosyayı fiziksel olarak sil
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Veritabanından kaydı sil
    await document.destroy();

    res.json({ message: 'Belge başarıyla silindi' });
  } catch (error) {
    console.error('Belge silinirken hata:', error);
    res.status(500).json({ message: 'Belge silinirken bir hata oluştu', error: error.message });
  }
};

module.exports = {
  uploadDocument,
  getUserDocuments,
  getDocumentById,
  downloadDocument,
  updateDocumentStatus,
  getPendingDocuments,
  deleteDocument
};