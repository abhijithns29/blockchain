const express = require('express');
const Chat = require('../models/Chat');
const Land = require('../models/Land');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Start chat with seller
router.post('/start', auth, async (req, res) => {
  try {
    const { landId } = req.body;
    
    const land = await Land.findById(landId).populate('currentOwner');
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (!land.marketInfo.isForSale) {
      return res.status(400).json({ message: 'Land is not for sale' });
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
        messages: [{
          sender: req.user._id,
          message: `Hi! I'm interested in your land (Asset ID: ${land.assetId}). Can we discuss?`,
          messageType: 'TEXT'
        }]
      });
      await chat.save();
    }

    await chat.populate(['buyer', 'seller', 'landId']);

    console.log('Chat object before sending:', {
      _id: chat._id,
      id: chat.id,
      landId: chat.landId,
      buyer: chat.buyer,
      seller: chat.seller
    });

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
    const chats = await Chat.find({
      $or: [
        { buyer: req.user._id },
        { seller: req.user._id }
      ]
    })
    .populate('buyer', 'fullName email')
    .populate('seller', 'fullName email')
    .populate('landId', 'assetId village district marketInfo')
    .sort({ updatedAt: -1 });

    console.log('My chats response:', chats.map(chat => ({
      _id: chat._id,
      buyer: chat.buyer,
      seller: chat.seller,
      landId: chat.landId
    })));

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
      .populate('messages.sender', 'fullName');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of this chat
    if (chat.buyer._id.toString() !== req.user._id.toString() && 
        chat.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mark messages as read
    chat.messages.forEach(msg => {
      if (msg.sender._id.toString() !== req.user._id.toString()) {
        msg.isRead = true;
      }
    });
    await chat.save();

    res.json({ chat });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/:chatId/message', auth, async (req, res) => {
  try {
    const { message, messageType = 'TEXT', offerAmount } = req.body;
    
    console.log('Message endpoint called:', { 
      chatId: req.params.chatId, 
      message, 
      messageType, 
      offerAmount,
      userId: req.user._id 
    });
    
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of this chat
    if (chat.buyer.toString() !== req.user._id.toString() && 
        chat.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newMessage = {
      sender: req.user._id,
      message,
      messageType,
      offerAmount: messageType === 'OFFER' || messageType === 'COUNTER_OFFER' ? offerAmount : undefined
    };

    chat.messages.push(newMessage);

    // Update current offer if it's an offer message
    if (messageType === 'OFFER' || messageType === 'COUNTER_OFFER') {
      chat.currentOffer = {
        amount: offerAmount,
        offeredBy: req.user._id,
        status: 'PENDING'
      };
    } else if (messageType === 'ACCEPTANCE') {
      chat.currentOffer.status = 'ACCEPTED';
      chat.status = 'DEAL_AGREED';
      chat.agreedPrice = chat.currentOffer.amount;
      chat.agreedDate = new Date();
    } else if (messageType === 'REJECTION') {
      chat.currentOffer.status = 'REJECTED';
    }

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
    
    const chat = await Chat.findById(req.params.chatId)
      .populate('landId', 'marketInfo');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Only buyer can make initial offers
    if (chat.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only buyer can make offers' });
    }

    const offerMessage = {
      sender: req.user._id,
      message: `I offer ₹${offerAmount.toLocaleString()} for this land.`,
      messageType: 'OFFER',
      offerAmount
    };

    chat.messages.push(offerMessage);
    chat.currentOffer = {
      amount: offerAmount,
      offeredBy: req.user._id,
      status: 'PENDING'
    };

    await chat.save();

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
    
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Only seller can make counter offers
    if (chat.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only seller can make counter offers' });
    }

    const counterMessage = {
      sender: req.user._id,
      message: `I counter with ₹${counterAmount.toLocaleString()}.`,
      messageType: 'COUNTER_OFFER',
      offerAmount: counterAmount
    };

    chat.messages.push(counterMessage);
    chat.currentOffer = {
      amount: counterAmount,
      offeredBy: req.user._id,
      status: 'PENDING'
    };

    await chat.save();

    res.json({
      message: 'Counter offer made successfully',
      currentOffer: chat.currentOffer
    });
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

    if (!chat.currentOffer || chat.currentOffer.status !== 'PENDING') {
      return res.status(400).json({ message: 'No pending offer to accept' });
    }

    // Check if user can accept (opposite of who made the offer)
    const canAccept = (chat.currentOffer.offeredBy.toString() !== req.user._id.toString()) &&
                     (chat.buyer.toString() === req.user._id.toString() || 
                      chat.seller.toString() === req.user._id.toString());

    if (!canAccept) {
      return res.status(403).json({ message: 'You cannot accept this offer' });
    }

    const acceptMessage = {
      sender: req.user._id,
      message: `I accept the offer of ₹${chat.currentOffer.amount.toLocaleString()}.`,
      messageType: 'ACCEPTANCE'
    };

    chat.messages.push(acceptMessage);
    chat.currentOffer.status = 'ACCEPTED';
    chat.status = 'DEAL_AGREED';
    chat.agreedPrice = chat.currentOffer.amount;
    chat.agreedDate = new Date();

    await chat.save();

    res.json({
      message: 'Offer accepted successfully',
      chat
    });
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;