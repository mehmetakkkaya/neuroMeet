const { Meeting, Participant, Document } = require('../models/meetingModel');
const User = require('../models/userModel');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// @desc    Create a new meeting
// @route   POST /api/meetings
// @access  Private
const createMeeting = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    description,
    startTime,
    endTime,
    meetingType,
    meetingLink,
    participants,
    isRecurring,
    recurrencePattern,
  } = req.body;

  try {
    // Toplantıyı oluştur
    const meeting = await Meeting.create({
      title,
      description,
      startTime,
      endTime,
      meetingType,
      meetingLink,
      hostId: req.user.id,
      isRecurring,
      recurrencePattern,
    });

    // Katılımcıları ekle
    if (participants && participants.length > 0) {
      const participantRecords = participants.map(userId => ({
        userId,
        meetingId: meeting.id,
        status: 'pending'
      }));

      await Participant.bulkCreate(participantRecords);
    }

    // Oluşturulan toplantıyı katılımcıları ile birlikte getir
    const createdMeeting = await Meeting.findByPk(meeting.id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name', 'email'],
          through: {
            attributes: ['status']
          }
        }
      ]
    });

    res.status(201).json(createdMeeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all meetings
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.findAll({
      where: {
        [Op.or]: [
          { hostId: req.user.id },
          { '$participants.id$': req.user.id }
        ]
      },
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name', 'email'],
          through: {
            attributes: ['status']
          }
        }
      ]
    });

    res.json(meetings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get meeting by ID
// @route   GET /api/meetings/:id
// @access  Private
const getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name', 'email'],
          through: {
            attributes: ['status']
          }
        },
        {
          model: Document,
          as: 'documents'
        }
      ]
    });

    if (meeting) {
      // Check if user is the host or a participant
      if (
        meeting.hostId === req.user.id ||
        meeting.participants.some(p => p.id === req.user.id)
      ) {
        res.json(meeting);
      } else {
        res.status(403);
        throw new Error('Bu toplantıya erişim izniniz yok');
      }
    } else {
      res.status(404);
      throw new Error('Toplantı bulunamadı');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update meeting
// @route   PUT /api/meetings/:id
// @access  Private
const updateMeeting = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const meeting = await Meeting.findByPk(req.params.id);

    if (!meeting) {
      res.status(404);
      throw new Error('Toplantı bulunamadı');
    }

    // Only the host can update meeting details
    if (meeting.hostId !== req.user.id) {
      res.status(403);
      throw new Error('Sadece toplantı sahibi detayları güncelleyebilir');
    }

    // Toplantı bilgilerini güncelle
    const updateData = {};
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.startTime) updateData.startTime = req.body.startTime;
    if (req.body.endTime) updateData.endTime = req.body.endTime;
    if (req.body.meetingType) updateData.meetingType = req.body.meetingType;
    if (req.body.meetingLink) updateData.meetingLink = req.body.meetingLink;
    if (req.body.isRecurring !== undefined) updateData.isRecurring = req.body.isRecurring;
    if (req.body.recurrencePattern) updateData.recurrencePattern = req.body.recurrencePattern;
    if (req.body.status) updateData.status = req.body.status;

    await Meeting.update(updateData, {
      where: { id: req.params.id }
    });

    // Katılımcıları güncelle
    if (req.body.participants && req.body.participants.length > 0) {
      // Mevcut katılımcıları kaldır
      await Participant.destroy({
        where: { meetingId: meeting.id }
      });

      // Yeni katılımcıları ekle
      const participantRecords = req.body.participants.map(userId => ({
        userId,
        meetingId: meeting.id,
        status: 'pending'
      }));

      await Participant.bulkCreate(participantRecords);
    }

    // Güncellenmiş toplantıyı getir
    const updatedMeeting = await Meeting.findByPk(meeting.id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name', 'email'],
          through: {
            attributes: ['status']
          }
        }
      ]
    });

    res.json(updatedMeeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);

    if (!meeting) {
      res.status(404);
      throw new Error('Toplantı bulunamadı');
    }

    // Only the host can delete the meeting
    if (meeting.hostId !== req.user.id) {
      res.status(403);
      throw new Error('Sadece toplantı sahibi toplantıyı silebilir');
    }

    // İlişkili katılımcıları ve belgeleri silmek için CASCADE kullanılmalı
    // veya manuel olarak silinmeli

    // Toplantıyı sil
    await meeting.destroy();
    res.json({ message: 'Toplantı silindi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update participant status
// @route   PUT /api/meetings/:id/participant-status
// @access  Private
const updateParticipantStatus = async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'accepted', 'declined'].includes(status)) {
    res.status(400);
    throw new Error('Geçersiz durum değeri');
  }

  try {
    const participant = await Participant.findOne({
      where: {
        meetingId: req.params.id,
        userId: req.user.id
      }
    });

    if (!participant) {
      res.status(400);
      throw new Error('Bu toplantının katılımcısı değilsiniz');
    }

    participant.status = status;
    await participant.save();

    res.json({ message: 'Katılımcı durumu güncellendi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  updateParticipantStatus,
}; 