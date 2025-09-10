const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Favorite = require('../models/favoriteModel');
const User = require('../models/userModel');

// @desc    Terapisti favorilere ekle
// @route   POST /api/users/:id/favorite
// @access  Private
const addFavoriteTherapist = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.params.id;
  const { therapistId } = req.body;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // Kullanıcı var mı kontrol et
  const user = await User.findByPk(userId);
  if (!user) {
    res.status(404);
    throw new Error('Kullanıcı bulunamadı');
  }

  // Terapist var mı kontrol et
  const therapist = await User.findByPk(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    res.status(404);
    throw new Error('Terapist bulunamadı');
  }

  // Zaten favorilerde mi kontrol et
  const existingFavorite = await Favorite.findOne({
    where: {
      userId,
      therapistId,
    },
  });

  if (existingFavorite) {
    res.status(400);
    throw new Error('Bu terapist zaten favorilerinizde');
  }

  const favorite = await Favorite.create({
    userId,
    therapistId,
  });

  res.status(201).json(favorite);
});

// @desc    Terapisti favorilerden çıkar
// @route   DELETE /api/users/:id/favorite/:therapistId
// @access  Private
const removeFavoriteTherapist = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const therapistId = req.params.therapistId;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  const favorite = await Favorite.findOne({
    where: {
      userId,
      therapistId,
    },
  });

  if (!favorite) {
    res.status(404);
    throw new Error('Favori bulunamadı');
  }

  await favorite.destroy();

  res.json({ message: 'Terapist favorilerden çıkarıldı' });
});

// @desc    Kullanıcının favori terapistlerini getir
// @route   GET /api/users/:id/favorites
// @access  Private
const getUserFavorites = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  const favorites = await Favorite.findAll({
    where: { userId },
    include: [
      {
        model: User,
        as: 'therapist',
        attributes: [
          'id', 
          'name', 
          'email', 
          'specialty', 
          'profilePicture', 
          'yearsOfExperience', 
          'bio'
        ],
      },
    ],
  });

  res.json(favorites);
});

// @desc    Terapistin favori edilme sayısını getir
// @route   GET /api/therapists/:id/favorites/count
// @access  Public
const getTherapistFavoriteCount = asyncHandler(async (req, res) => {
  const therapistId = req.params.id;

  // Terapist var mı kontrol et
  const therapist = await User.findByPk(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    res.status(404);
    throw new Error('Terapist bulunamadı');
  }

  const count = await Favorite.count({
    where: { therapistId },
  });

  res.json({ count });
});

module.exports = {
  addFavoriteTherapist,
  removeFavoriteTherapist,
  getUserFavorites,
  getTherapistFavoriteCount,
}; 