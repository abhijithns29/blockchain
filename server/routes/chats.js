const express = require('express');
const Chat = require('../models/Chat');
const DigitizedLand = require('../models/DigitizedLand');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Start chat with seller
router.post('/start', auth, async (req, res) => {
  try {
    const { landId } = req.body;
    
    if (!landId) {
      return res.status(400).json({ message: 'Land ID is required' });
    }

    const land = await DigitizedLand.findById(landId).populate('currentOwner');
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (!land.marketInfo.isForSale) {
      return res.status(400).json({ message: 'Land is not for sale' });
    }

    if (!land.currentOwner) {
      return res.status(400).json({ message: 'Land has no owner' });
    }

    if (land.currentOwner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot chat with yourself' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      landId,
      buyer: req.user._id,
      seller: land.currentOwner._id
    });

    if (!chat) {
      chat = new Chat({
        landId,
        buyer: req.user._id,
        seller: land.currentOwner._id,
        status: 'ACTIVE'
      });

      // Add initial message
      chat.addMessage(
        req.user._id,
        `Hi! I'm interested in your land (Land ID: ${land.landId}). Can we discuss?`,
        'TEXT'
      );

      await chat.save();
    }

    await chat.populate(['buyer', 'seller', 'landId']);

    console.log(`Chat started between ${req.user.email} and ${land.currentOwner.email} for land ${land.landId}`);

    res.json({
      message: 'Chat started successfully',
      chat
    });
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's chats
router.get('/my-chats', auth, async (req, res) => {
  try {
    const chats = await Chat.findByUser(req.user._id)
      .sort({ 'metadata.lastActivity': -1 });

    res.json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific chat
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('buyer', 'fullName email')
      .populate('seller', 'fullName email')
      .populate('landId')
      .populate('messages.sender', 'fullName')
      .populate('transactionId');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of this chat
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mark messages as read
    const markedCount = chat.markMessagesAsRead(req.user._id);
    if (markedCount > 0) {
      await chat.save();
    }

    res.json({ chat });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/:chatId/message', auth, async (req, res) => {
  try {
    const { message, messageType = 'TEXT' } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of this chat
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (chat.status === 'BLOCKED') {
      return res.status(403).json({ message: 'Chat is blocked' });
    }

    const newMessage = chat.addMessage(req.user._id, message.trim(), messageType);
    await chat.save();

    await chat.populate('messages.sender', 'fullName');

    res.json({
      message: 'Message sent successfully',
      newMessage: chat.messages[chat.messages.length - 1]
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Make offer
router.post('/:chatId/offer', auth, async (req, res) => {
  try {
    const { offerAmount } = req.body;
    
    if (!offerAmount || offerAmount <= 0) {
      return res.status(400).json({ message: 'Valid offer amount is required' });
    }

    const chat = await Chat.findById(req.params.chatId)
      .populate('landId', 'marketInfo');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!chat.canMakeOffer(req.user._id)) {
      return res.status(400).json({ message: 'Cannot make offer at this time' });
    }

    chat.makeOffer(req.user._id, parseFloat(offerAmount));
    await chat.save();

    console.log(`Offer made in chat ${chat._id}: ₹${offerAmount} by ${req.user.email}`);

    res.json({
      message: 'Offer made successfully',
      currentOffer: chat.currentOffer
    });
  } catch (error) {
    console.error('Make offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Counter offer
router.post('/:chatId/counter-offer', auth, async (req, res) => {
  try {
    const { counterAmount } = req.body;
    
    if (!counterAmount || counterAmount <= 0) {
      return res.status(400).json({ message: 'Valid counter amount is required' });
    }

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    try {
      chat.makeCounterOffer(req.user._id, parseFloat(counterAmount));
      await chat.save();

      console.log(`Counter offer made in chat ${chat._id}: ₹${counterAmount} by ${req.user.email}`);

      res.json({
        message: 'Counter offer made successfully',
        currentOffer: chat.currentOffer
      });
    } catch (offerError) {
      return res.status(400).json({ message: offerError.message });
    }
  } catch (error) {
    console.error('Counter offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept offer
router.post('/:chatId/accept', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!chat.canAcceptOffer(req.user._id)) {
      return res.status(400).json({ message: 'Cannot accept offer at this time' });
    }

    try {
      chat.acceptOffer(req.user._id);
      await chat.save();

      console.log(`Offer accepted in chat ${chat._id}: ₹${chat.currentOffer.amount} by ${req.user.email}`);

      res.json({
        message: 'Offer accepted successfully',
        chat
      });
    } catch (acceptError) {
      return res.status(400).json({ message: acceptError.message });
    }
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject offer
router.post('/:chatId/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    try {
      chat.rejectOffer(req.user._id, reason);
      await chat.save();

      console.log(`Offer rejected in chat ${chat._id} by ${req.user.email}`);

      res.json({
        message: 'Offer rejected successfully',
        chat
      });
    } catch (rejectError) {
      return res.status(400).json({ message: rejectError.message });
    }
  } catch (error) {
    console.error('Reject offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat statistics (for admin)
router.get('/admin/statistics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = await Chat.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalChats = await Chat.countDocuments();
    const activeChats = await Chat.countDocuments({ status: 'ACTIVE' });
    const dealsAgreed = await Chat.countDocuments({ status: 'DEAL_AGREED' });

    res.json({
      totalChats,
      activeChats,
      dealsAgreed,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Get chat statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;