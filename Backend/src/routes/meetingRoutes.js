const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  updateParticipantStatus,
} = require('../controllers/meetingController');
const { protect } = require('../middlewares/authMiddleware');

// Meeting routes
router
  .route('/')
  .post(
    [
      protect,
      check('title', 'Toplantı başlığı zorunludur').not().isEmpty(),
      check('description', 'Toplantı açıklaması zorunludur').not().isEmpty(),
      check('startTime', 'Başlangıç zamanı zorunludur').not().isEmpty(),
      check('endTime', 'Bitiş zamanı zorunludur').not().isEmpty(),
    ],
    createMeeting
  )
  .get(protect, getMeetings);

router
  .route('/:id')
  .get(protect, getMeetingById)
  .put(
    [
      protect,
      check('title', 'Toplantı başlığı zorunludur').optional().not().isEmpty(),
      check('description', 'Toplantı açıklaması zorunludur').optional().not().isEmpty(),
      check('startTime', 'Başlangıç zamanı zorunludur').optional().not().isEmpty(),
      check('endTime', 'Bitiş zamanı zorunludur').optional().not().isEmpty(),
    ],
    updateMeeting
  )
  .delete(protect, deleteMeeting);

router.route('/:id/participant-status').put(
  [
    protect,
    check('status', 'Durum değeri zorunludur').not().isEmpty(),
  ],
  updateParticipantStatus
);

module.exports = router; 