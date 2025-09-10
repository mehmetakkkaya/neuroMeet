const { validationResult } = require('express-validator');
const Availability = require('../models/availabilityModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// @desc    Terapistin müsaitlik zamanlarını getir
// @route   GET /api/availability/:userId
// @access  Public
const getTherapistAvailability = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // userId'yi her zaman number tipine dönüştür
    const userIdNumber = parseInt(userId, 10);
    
    if (isNaN(userIdNumber)) {
      return res.status(400).json({ message: 'Geçersiz kullanıcı ID formatı' });
    }

    // Kullanıcının bir terapist olup olmadığını kontrol et
    const user = await User.findByPk(userIdNumber);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    if (user.role !== 'therapist') {
      return res.status(400).json({ message: 'Bu kullanıcı bir terapist değil' });
    }

    // Terapistin müsaitlik zamanlarını getir
    const availabilities = await Availability.findAll({
      where: { userId: userIdNumber },
      order: [
        ['dayOfWeek', 'ASC'],
        ['startTime', 'ASC']
      ]
    });

    // Günlere göre gruplayıp daha iyi organize edilmiş veri yapısı döndür
    const weekdayAvailability = availabilities.filter(a => a.isWeekday);
    const weekendAvailability = availabilities.filter(a => !a.isWeekday);

    res.json({
      weekday: weekdayAvailability,
      weekend: weekendAvailability
    });
  } catch (error) {
    console.error('Müsaitlik bilgileri getirilirken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Terapistin müsaitlik zamanlarını ekle/güncelle (GÜNCELLENMİŞ VERSİYON)
// @route   POST /api/availability
// @access  Private/Therapist
const updateAvailability = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const transaction = await sequelize.transaction();

  try {
    const { availabilities: frontendAvailabilities } = req.body;
    const userIdNumber = parseInt(req.user.id, 10);

    if (isNaN(userIdNumber)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Geçersiz kullanıcı ID formatı' });
    }

    const user = await User.findByPk(userIdNumber);
    if (!user || user.role !== 'therapist') {
      await transaction.rollback();
      return res.status(401).json({ message: 'Yetkisiz işlem veya terapist bulunamadı' });
    }

    const dbAvailabilities = await Availability.findAll({
      where: { userId: userIdNumber },
      transaction
    });

    const dbAvailabilityMap = new Map();
    dbAvailabilities.forEach(dbAv => {
      const key = `${dbAv.dayOfWeek}-${dbAv.startTime}`;
      dbAvailabilityMap.set(key, dbAv);
    });

    const toUpdate = [];
    const toInsert = [];
    const frontendKeys = new Set();

    for (const feAv of frontendAvailabilities) {
      if (!/^\d{2}:\d{2}:\d{2}$/.test(feAv.startTime) || !/^\d{2}:\d{2}:\d{2}$/.test(feAv.endTime)) {
           throw new Error(`Geçersiz zaman formatı: ${feAv.startTime} veya ${feAv.endTime}. Format HH:MM:SS olmalı.`);
      }
        
      const key = `${feAv.dayOfWeek}-${feAv.startTime}`;
      frontendKeys.add(key);
      const existingDbAv = dbAvailabilityMap.get(key);

      const availabilityData = {
        userId: userIdNumber,
        dayOfWeek: feAv.dayOfWeek,
        isWeekday: feAv.isWeekday,
        startTime: feAv.startTime,
        endTime: feAv.endTime,
        isAvailable: feAv.isAvailable !== undefined ? feAv.isAvailable : true
      };

      if (existingDbAv) {
        if (
          existingDbAv.endTime !== availabilityData.endTime ||
          existingDbAv.isAvailable !== availabilityData.isAvailable ||
          existingDbAv.isWeekday !== availabilityData.isWeekday
        ) {
          toUpdate.push({ ...availabilityData, id: existingDbAv.id });
        }
      } else {
        toInsert.push(availabilityData);
      }
    }

    const toDeactivateIds = [];
    for (const dbAv of dbAvailabilities) {
       const key = `${dbAv.dayOfWeek}-${dbAv.startTime}`;
       if (!frontendKeys.has(key) && dbAv.isAvailable) {
         const hasBooking = await Booking.findOne({ 
             where: { 
                 availabilityId: dbAv.id,
                 status: { [Op.in]: ['pending', 'confirmed'] } 
             }, 
             transaction 
         });
         
         if (!hasBooking) {
             toDeactivateIds.push(dbAv.id);
         } else {
             console.warn(`Uyarı: ${key} slotu kaldırılmak istendi ancak aktif randevusu var. isAvailable=true olarak bırakılıyor.`);
         }
       }
    }
    
    console.log('Güncellenecekler:', toUpdate.length);
    console.log('Eklenecekler:', toInsert.length);
    console.log('Pasif Hale Getirilecekler (Randevusu olmayanlar):', toDeactivateIds.length);

    if (toUpdate.length > 0) {
       await Promise.all(toUpdate.map(item => 
           Availability.update(item, { where: { id: item.id }, transaction })
       ));
    }

    if (toInsert.length > 0) {
      await Availability.bulkCreate(toInsert, { transaction });
    }
    
    if (toDeactivateIds.length > 0) {
      await Availability.update(
        { isAvailable: false }, 
        { where: { id: { [Op.in]: toDeactivateIds } }, transaction }
      );
    }

    await transaction.commit();

    const updatedAvailabilities = await Availability.findAll({ 
        where: { userId: userIdNumber }, 
        order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']] 
    });
    res.status(200).json({
      message: 'Müsaitlik zamanları başarıyla güncellendi',
      availabilities: updatedAvailabilities
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Müsaitlik zamanları güncellenirken hata:', error);
    res.status(500).json({ message: error.message || 'Müsaitlik güncellenirken bir sunucu hatası oluştu.' });
  }
};

// @desc    Belirli bir müsaitlik zamanını sil
// @route   DELETE /api/availability/:id
// @access  Private/Therapist
const deleteAvailability = async (req, res) => {
  try {
    const availabilityId = parseInt(req.params.id, 10);
    
    if (isNaN(availabilityId)) {
      return res.status(400).json({ message: 'Geçersiz müsaitlik ID formatı' });
    }
    
    // Müsaitlik zamanının var olup olmadığını kontrol et
    const availability = await Availability.findByPk(availabilityId);
    
    if (!availability) {
      return res.status(404).json({ message: 'Müsaitlik zamanı bulunamadı' });
    }
    
    // Kullanıcı yalnızca kendi müsaitlik zamanlarını silebilir
    const userId = parseInt(req.user.id, 10);
    if (userId !== availability.userId && req.user.role !== 'admin') {
      return res.status(401).json({ 
        message: 'Yalnızca kendi müsaitlik zamanlarınızı silebilirsiniz' 
      });
    }
    
    await availability.destroy();
    
    res.json({ message: 'Müsaitlik zamanı başarıyla silindi' });
  } catch (error) {
    console.error('Müsaitlik zamanı silinirken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tüm terapistlerin müsait olduğu zamanları listele
// @route   GET /api/availability/available-therapists
// @access  Public
const getAvailableTherapists = async (req, res) => {
  try {
    // Aktif terapistleri müsaitlik zamanlarıyla birlikte getir
    const availableTherapists = await User.findAll({
      where: { 
        role: 'therapist',
        status: 'active'
      },
      include: [{
        model: Availability,
        where: { isAvailable: true }
      }]
    });
    
    res.json(availableTherapists);
  } catch (error) {
    console.error('Müsait terapistler listelenirken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTherapistAvailability,
  updateAvailability,
  deleteAvailability,
  getAvailableTherapists
};
