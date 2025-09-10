const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const { Op } = require('sequelize');

// @desc    Mesaj gönder
// @route   POST /api/messages/send
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { receiverId, content, attachmentUrl, attachmentType } = req.body;
  const senderId = req.user.id;

  // Alıcı var mı kontrol et
  const receiver = await User.findByPk(receiverId);
  if (!receiver) {
    res.status(404);
    throw new Error('Alıcı bulunamadı');
  }

  const message = await Message.create({
    senderId,
    receiverId,
    content,
    attachmentUrl: attachmentUrl || null,
    attachmentType: attachmentType || null,
  });

  // Gönderilen mesajı ilişkileriyle birlikte döndür
  const newMessage = await Message.findByPk(message.id, {
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email', 'profilePicture', 'role'],
      },
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'name', 'email', 'profilePicture', 'role'],
      },
    ],
  });

  res.status(201).json(newMessage);
});

// @desc    Kullanıcının mesaj geçmişini getir
// @route   GET /api/messages/:userId
// @access  Private
const getUserMessages = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // Kullanıcının gönderdiği ve aldığı tüm mesajları al
  const messages = await Message.findAll({
    where: {
      [Op.or]: [{ senderId: userId }, { receiverId: userId }],
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'profilePicture', 'role'],
      },
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'name', 'profilePicture', 'role'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json(messages);
});

// @desc    İki kullanıcı arasındaki sohbet geçmişini getir
// @route   GET /api/chat/:userId/:otherUserId
// @access  Private
const getChatHistory = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const otherUserId = req.params.otherUserId;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // İki kullanıcı arasındaki mesajları al
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'profilePicture', 'role'],
      },
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'name', 'profilePicture', 'role'],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  // Okunmamış mesajları okundu olarak işaretle
  await Message.update(
    { isRead: true, readAt: new Date() },
    {
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
    }
  );

  res.json(messages);
});

// @desc    Kullanıcının sohbet listesini getir
// @route   GET /api/chat/list/:userId
// @access  Private
const getChatList = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  // Yetki kontrolü
  if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Bu işlem için yetkiniz yok');
  }

  // Kullanıcının sohbet ettiği diğer kullanıcıları bul
  const sentMessages = await Message.findAll({
    where: { senderId: userId },
    attributes: ['receiverId'],
    group: ['receiverId'],
  });

  const receivedMessages = await Message.findAll({
    where: { receiverId: userId },
    attributes: ['senderId'],
    group: ['senderId'],
  });

  // Benzersiz kullanıcı ID'lerini birleştir
  const sentUserIds = sentMessages.map(msg => msg.receiverId);
  const receivedUserIds = receivedMessages.map(msg => msg.senderId);
  const uniqueUserIds = [...new Set([...sentUserIds, ...receivedUserIds])];

  // Bu kullanıcıların bilgilerini al
  const chatUsers = await User.findAll({
    where: {
      id: {
        [Op.in]: uniqueUserIds,
      },
    },
    attributes: ['id', 'name', 'email', 'profilePicture', 'role'],
  });

  // Her kullanıcı için son mesajı ve okunmamış mesaj sayısını bul
  const chatList = await Promise.all(
    chatUsers.map(async user => {
      // Son mesaj
      const lastMessage = await Message.findOne({
        where: {
          [Op.or]: [
            { senderId: userId, receiverId: user.id },
            { senderId: user.id, receiverId: userId },
          ],
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
      });

      // Okunmamış mesaj sayısı
      const unreadCount = await Message.count({
        where: {
          senderId: user.id,
          receiverId: userId,
          isRead: false,
        },
      });

      return {
        user: user,
        lastMessage: lastMessage,
        unreadCount: unreadCount,
      };
    })
  );

  // Son mesaj tarihine göre sırala
  chatList.sort((a, b) => {
    if (!a.lastMessage || !b.lastMessage) return 0;
    return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
  });

  res.json(chatList);
});

// @desc    Mesajları okundu olarak işaretle
// @route   PUT /api/messages/read
// @access  Private
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.id;

  if (!messageIds || !messageIds.length) {
    res.status(400);
    throw new Error('Mesaj ID\'leri gereklidir');
  }

  // Bu mesajların alıcısı olduğunu kontrol et
  const messages = await Message.findAll({
    where: {
      id: {
        [Op.in]: messageIds,
      },
    },
  });

  const invalidMessages = messages.filter(msg => msg.receiverId.toString() !== userId.toString());
  if (invalidMessages.length > 0) {
    res.status(401);
    throw new Error('Bu mesajları okundu olarak işaretleme yetkiniz yok');
  }

  // Mesajları okundu olarak güncelle
  await Message.update(
    { isRead: true, readAt: new Date() },
    {
      where: {
        id: {
          [Op.in]: messageIds,
        },
      },
    }
  );

  res.json({ message: 'Mesajlar okundu olarak işaretlendi' });
});

module.exports = {
  sendMessage,
  getUserMessages,
  getChatHistory,
  getChatList,
  markMessagesAsRead,
}; 