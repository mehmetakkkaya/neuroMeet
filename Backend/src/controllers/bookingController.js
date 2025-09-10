const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const Availability = require('../models/availabilityModel');
// const Session = require('../models/sessionModel'); // Session import'u kaldırıldı
const { Op } = require('sequelize');

// @desc    Randevu oluştur
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { therapistId, availabilityId, bookingDate, startTime, endTime, sessionType, notes } = req.body;
  const userId = req.user.id;

  // Terapist var mı kontrol et
  const therapist = await User.findByPk(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    res.status(404);
    throw new Error('Terapist bulunamadı');
  }

  // Uygunluk var mı kontrol et
  const availability = await Availability.findByPk(availabilityId);
  if (!availability) {
    res.status(404);
    throw new Error('Uygunluk bulunamadı');
  }

  // Log ekleyerek değerleri ve tipleri kontrol et
  console.log('Kontrol Öncesi - availability.userId:', availability.userId, '(Tip:', typeof availability.userId, ')');
  console.log('Kontrol Öncesi - therapistId:', therapistId, '(Tip:', typeof therapistId, ')');
  console.log('Karşılaştırma Sonucu (availability.userId !== therapistId):', availability.userId !== therapistId);

  // Uygunluk terapiste ait mi kontrol et
  if (availability.userId !== therapistId) {
    res.status(400);
    throw new Error('Bu uygunluk terapiste ait değil');
  }

  // Uygunluk aktif mi kontrol et
  if (!availability.isAvailable) {
    res.status(400);
    throw new Error('Bu zaman dilimi artık müsait değil');
  }

  // Aynı zaman dilimine başka randevu var mı kontrol et
  const existingBooking = await Booking.findOne({
    where: {
      availabilityId,
      bookingDate,
      startTime,
      endTime,
      status: ['pending', 'confirmed'],
    },
  });

  if (existingBooking) {
    res.status(400);
    throw new Error('Bu zaman dilimi için zaten bir randevu var');
  }

  // Terapist ücretini al (burada varsayılan bir fiyat kullanıyoruz, gerçek projede dinamik olabilir)
  const price = 500.00; // Varsayılan fiyat veya terapistten alınabilir

  console.log('Booking.create çağrılmadan önceki veriler:', { userId, therapistId, availabilityId, bookingDate, startTime, endTime, sessionType: sessionType || 'video', notes: notes || '', price });

  const booking = await Booking.create({
    userId,
    therapistId,
    availabilityId,
    bookingDate,
    startTime,
    endTime,
    status: 'pending',
    sessionType: sessionType || 'video',
    notes: notes || '',
    price,
  });

  console.log('Booking.create başarılı, oluşturulan randevu:', booking.toJSON());

  res.status(201).json(booking);
});

// @desc    Kullanıcının randevularını getir
// @route   GET /api/bookings/user/:userId
// @access  Private
const getUserBookings = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  const bookings = await Booking.findAll({
    where: { userId },
    include: [
      {
        model: User,
        as: 'therapist',
        attributes: ['id', 'name', 'specialty', 'profilePicture'],
      },
      {
        model: Availability,
        attributes: ['dayOfWeek', 'isWeekday'],
      },
    ],
    order: [['bookingDate', 'DESC'], ['startTime', 'ASC']],
  });

  res.json(bookings);
});

// @desc    Terapistin randevularını getir
// @route   GET /api/bookings/therapist/:therapistId
// @access  Private
const getTherapistBookings = asyncHandler(async (req, res) => {
  const therapistId = req.params.therapistId;

  // Yetki kontrolü
  if (req.user.id.toString() !== therapistId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  const bookings = await Booking.findAll({
    where: { therapistId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'profilePicture'],
      },
      {
        model: Availability,
        attributes: ['dayOfWeek', 'isWeekday'],
      },
    ],
    order: [['bookingDate', 'DESC'], ['startTime', 'ASC']],
  });

  res.json(bookings);
});

// @desc    Randevuyu görüntüle
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
  const bookingId = req.params.id;

  const booking = await Booking.findByPk(bookingId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'profilePicture'],
      },
      {
        model: User,
        as: 'therapist',
        attributes: ['id', 'name', 'specialty', 'profilePicture'],
      },
      {
        model: Availability,
        attributes: ['dayOfWeek', 'isWeekday', 'startTime', 'endTime'],
      },
    ],
  });

  if (!booking) {
    res.status(404);
    throw new Error('Randevu bulunamadı');
  }

  // Yetki kontrolü
  if (
    req.user.id.toString() !== booking.userId.toString() &&
    req.user.id.toString() !== booking.therapistId.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  res.json(booking);
});

// @desc    Randevu durumunu güncelle
// @route   PUT /api/bookings/:id
// @access  Private
const updateBooking = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const bookingId = req.params.id;
  const { status, notes } = req.body;

  const booking = await Booking.findByPk(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error('Randevu bulunamadı');
  }

  // Terapi kullanıcısı veya admin ise durumu güncelleyebilir
  if (
    req.user.id.toString() !== booking.therapistId.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // Durumu ve notları güncelle
  if (status) booking.status = status;
  if (notes) booking.notes = notes;

  await booking.save();

  res.json(booking); // Güncellenmiş booking objesini döndür
});

// @desc    Randevu iptal et
// @route   DELETE /api/bookings/:id
// @access  Private
const cancelBooking = asyncHandler(async (req, res) => {
  const bookingId = req.params.id;

  const booking = await Booking.findByPk(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error('Randevu bulunamadı');
  }

  // Randevu sahibi veya admin ise iptal edebilir
  if (
    req.user.id.toString() !== booking.userId.toString() &&
    req.user.id.toString() !== booking.therapistId.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // Randevuyu doğrudan silmek yerine durumunu "cancelled" yap
  booking.status = 'cancelled';
  await booking.save();

  res.json({ message: 'Randevu iptal edildi' });
});

// @desc    Belirli bir terapistin belirli bir tarihteki dolu saatlerini getir
// @route   GET /api/bookings/therapist/:therapistId/booked-slots?date=YYYY-MM-DD
// @access  Public (veya Private)
const getTherapistBookedSlots = asyncHandler(async (req, res) => {
  const { therapistId } = req.params;
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400);
    throw new Error('Lütfen geçerli bir tarih giriniz (YYYY-MM-DD formatında).');
  }

  const therapistIdNumber = parseInt(therapistId, 10);
  if (isNaN(therapistIdNumber)) {
    res.status(400);
    throw new Error('Geçersiz Terapist ID formatı.');
  }

  const therapistExists = await User.findByPk(therapistIdNumber);
  if (!therapistExists || therapistExists.role !== 'therapist') {
    res.status(404);
    throw new Error('Terapist bulunamadı.');
  }

  try {
    // === Sorgu Güncellemesi: Tarih Aralığı Kullanımı ===
    const startDate = new Date(`${date}T00:00:00.000Z`); // Günün başlangıcı (UTC)
    const endDate = new Date(`${date}T23:59:59.999Z`);   // Günün sonu (UTC)
    // Not: Sequelize ve MySQL'in timezone ayarları önemli olabilir.
    // Gerekirse farklı timezone'ları ele almak için moment-timezone gibi kütüphaneler kullanılabilir.
    
    console.log(`Sorgulanan Tarih Aralığı (UTC): ${startDate.toISOString()} - ${endDate.toISOString()}`);

    const bookings = await Booking.findAll({
      where: {
        therapistId: therapistIdNumber,
        bookingDate: {
          [Op.gte]: startDate, // Başlangıç tarihinden büyük veya eşit
          [Op.lte]: endDate    // Bitiş tarihinden küçük veya eşit
        },
        status: { [Op.in]: ['pending', 'confirmed'] } 
      },
      attributes: ['startTime'] 
    });
    // === Sorgu Sonu ===

    const bookedSlots = bookings.map(booking => booking.startTime);
    
    console.log(`Bulunan dolu saatler (${date}):`, bookedSlots); // Loglama eklendi

    res.json(bookedSlots);

  } catch (error) {
    console.error('Dolu saatler getirilirken hata:', error);
    res.status(500).json({ message: 'Dolu saatler getirilirken bir sunucu hatası oluştu.' });
  }
});

module.exports = {
  createBooking,
  getUserBookings,
  getTherapistBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  getTherapistBookedSlots
}; 