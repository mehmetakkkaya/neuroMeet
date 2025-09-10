const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Session = require('../models/sessionModel');
const User = require('../models/userModel');

// @desc    Yeni seans oluştur
// @route   POST /api/sessions
// @access  Private
const createSession = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, therapistId, sessionDate, endTime, sessionType, price, notes } = req.body;

  // Kullanıcı ve terapist var mı kontrol et
  const user = await User.findByPk(userId);
  if (!user) {
    res.status(404);
    throw new Error('Kullanıcı bulunamadı');
  }

  const therapist = await User.findByPk(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    res.status(404);
    throw new Error('Terapist bulunamadı');
  }

  const session = await Session.create({
    userId,
    therapistId,
    sessionDate,
    endTime,
    sessionType: sessionType || 'video',
    price,
    notes,
  });

  res.status(201).json(session);
});

// @desc    Kullanıcının tüm seanslarını getir
// @route   GET /api/sessions/user/:userId
// @access  Private
const getUserSessions = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  // Kullanıcının varlığını kontrol et
  const user = await User.findByPk(userId);
  if (!user) {
    res.status(404);
    throw new Error('Kullanıcı bulunamadı');
  }

  // Yetki kontrolü - kendi seanslarına veya admin ise erişebilir
  if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  const sessions = await Session.findAll({
    where: { userId },
    include: [
      {
        model: User,
        as: 'therapist',
        attributes: ['id', 'name', 'email', 'specialty', 'profilePicture'],
      },
    ],
    order: [['sessionDate', 'DESC']],
  });

  res.json(sessions);
});

// @desc    Terapistin tüm seanslarını getir
// @route   GET /api/sessions/therapist/:therapistId
// @access  Private
const getTherapistSessions = asyncHandler(async (req, res) => {
  const therapistId = req.params.therapistId;

  // Terapistin varlığını kontrol et
  const therapist = await User.findByPk(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    res.status(404);
    throw new Error('Terapist bulunamadı');
  }

  // Yetki kontrolü - kendi seanslarına veya admin ise erişebilir
  if (req.user.id.toString() !== therapistId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  const sessions = await Session.findAll({
    where: { therapistId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'profilePicture'],
      },
    ],
    order: [['sessionDate', 'DESC']],
  });

  res.json(sessions);
});

// @desc    Seans bilgilerini getir
// @route   GET /api/sessions/:id
// @access  Private
const getSessionById = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;

  const session = await Session.findByPk(sessionId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'profilePicture'],
      },
      {
        model: User,
        as: 'therapist',
        attributes: ['id', 'name', 'email', 'specialty', 'profilePicture'],
      },
    ],
  });

  if (!session) {
    res.status(404);
    throw new Error('Seans bulunamadı');
  }

  // Yetki kontrolü - kendi seansına veya admin ise erişebilir
  if (
    req.user.id.toString() !== session.userId.toString() &&
    req.user.id.toString() !== session.therapistId.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  res.json(session);
});

// @desc    Seans durumunu güncelle
// @route   PUT /api/sessions/:id
// @access  Private
const updateSession = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sessionId = req.params.id;
  const { status, notes, meetingLink } = req.body;

  const session = await Session.findByPk(sessionId);

  if (!session) {
    res.status(404);
    throw new Error('Seans bulunamadı');
  }

  // Yetki kontrolü - kendi seansını veya admin ise güncelleyebilir
  if (
    req.user.id.toString() !== session.therapistId.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // Güncellenecek alanlar
  if (status) session.status = status;
  if (notes) session.notes = notes;
  if (meetingLink) session.meetingLink = meetingLink;

  await session.save();

  res.json(session);
});

// @desc    Seans sil
// @route   DELETE /api/sessions/:id
// @access  Private
const deleteSession = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;

  const session = await Session.findByPk(sessionId);

  if (!session) {
    res.status(404);
    throw new Error('Seans bulunamadı');
  }

  // Yetki kontrolü - admin veya seans sahibi terapist ise silebilir
  if (
    req.user.id.toString() !== session.therapistId.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  await session.destroy();

  res.json({ message: 'Seans silindi' });
});

module.exports = {
  createSession,
  getUserSessions,
  getTherapistSessions,
  getSessionById,
  updateSession,
  deleteSession,
}; 