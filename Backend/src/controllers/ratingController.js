const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Rating = require('../models/ratingModel');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const { Sequelize } = require('sequelize');

// @desc    Booking değerlendirmesi oluştur
// @route   POST /api/ratings
// @access  Private
const createRating = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { bookingId, rating, comment, isAnonymous } = req.body;
  const userId = req.user.id;

  // Booking var mı ve tamamlanmış mı kontrol et
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Randevu (booking) bulunamadı');
  }

  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('Tamamlanmamış randevular değerlendirilemez');
  }

  // Kullanıcının booking sahibi olduğunu kontrol et
  if (booking.userId.toString() !== userId.toString()) {
    res.status(401);
    throw new Error('Bu randevuyu değerlendirme yetkiniz yok');
  }

  // Bu booking için zaten değerlendirme var mı kontrol et
  const existingRating = await Rating.findOne({
    where: { bookingId },
  });

  if (existingRating) {
    res.status(400);
    throw new Error('Bu randevu için zaten bir değerlendirme yapmışsınız');
  }

  const newRating = await Rating.create({
    userId,
    therapistId: booking.therapistId,
    bookingId,
    rating,
    comment: comment || '',
    isAnonymous: isAnonymous || false,
  });

  res.status(201).json(newRating);
});

// @desc    Değerlendirmeyi güncelle
// @route   PUT /api/ratings/:id
// @access  Private
const updateRating = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const ratingId = req.params.id;
  const { rating, comment, isAnonymous } = req.body;

  const existingRating = await Rating.findByPk(ratingId);

  if (!existingRating) {
    res.status(404);
    throw new Error('Değerlendirme bulunamadı');
  }

  // Değerlendirme sahibi olduğunu kontrol et
  if (existingRating.userId.toString() !== req.user.id.toString()) {
    res.status(401);
    throw new Error('Bu değerlendirmeyi güncelleme yetkiniz yok');
  }

  // Güncellenecek alanlar
  if (rating) existingRating.rating = rating;
  if (comment !== undefined) existingRating.comment = comment;
  if (isAnonymous !== undefined) existingRating.isAnonymous = isAnonymous;

  await existingRating.save();

  res.json(existingRating);
});

// @desc    Terapistin tüm değerlendirmelerini getir
// @route   GET /api/therapists/:id/ratings
// @access  Public
const getTherapistRatings = asyncHandler(async (req, res) => {
  const therapistId = req.params.id;

  // Terapist var mı kontrol et
  const therapist = await User.findByPk(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    res.status(404);
    throw new Error('Terapist bulunamadı');
  }

  const ratings = await Rating.findAll({
    where: { therapistId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'profilePicture'],
      },
      {
        model: Booking,
        attributes: ['id', 'bookingDate', 'startTime', 'endTime'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  // Anonim değerlendirmelerin kullanıcı bilgilerini gizle
  const formattedRatings = ratings.map(rating => {
    const ratingObj = rating.toJSON();
    if (ratingObj.isAnonymous) {
      ratingObj.user = {
        id: null,
        name: 'Anonim',
        profilePicture: null,
      };
    }
    return ratingObj;
  });

  res.json(formattedRatings);
});

// @desc    Kullanıcının değerlendirmediği booking'leri getir
// @route   GET /api/ratings/not-rated-bookings/:userId
// @access  Private
const getNotRatedBookings = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // Tamamlanmış booking'leri bul
  const completedBookings = await Booking.findAll({
    where: {
      userId,
      status: 'completed',
    },
    include: [
      {
        model: User,
        as: 'therapist',
        attributes: ['id', 'name', 'specialty', 'profilePicture'],
      },
    ],
  });

  // Değerlendirilmiş booking ID'lerini bul
  const ratedBookingIds = await Rating.findAll({
    where: { userId },
    attributes: ['bookingId'],
  }).then(ratings => ratings.map(r => r.bookingId));

  // Değerlendirilmemiş booking'leri filtrele
  const notRatedBookings = completedBookings.filter(
    booking => !ratedBookingIds.includes(booking.id)
  );

  res.json(notRatedBookings);
});

// @desc    Genel değerlendirme istatistiklerini getir
// @route   GET /api/ratings
// @access  Public
const getRatingStats = asyncHandler(async (req, res) => {
  const stats = await Rating.findAll({
    attributes: [
      'therapistId',
      [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRatings'],
    ],
    include: [
      {
        model: User,
        as: 'therapist',
        attributes: ['id', 'name', 'specialty', 'profilePicture'],
      },
    ],
    group: ['therapistId', 'therapist.id'],
    order: [[Sequelize.literal('averageRating'), 'DESC']],
  });

  res.json(stats);
});

module.exports = {
  createRating,
  updateRating,
  getTherapistRatings,
  getNotRatedBookings,
  getRatingStats,
}; 