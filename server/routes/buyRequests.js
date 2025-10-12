const express = require('express');
const BuyRequest = require('../models/BuyRequest');
const Chat = require('../models/Chat');
const Land = require('../models/Land');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create buy request
router.post('/', auth, async (req, res) => {
  try {
    const { chatId, landId, sellerId, buyerId, agreedPrice } = req.body;
    
    console.log('Buy request received:', { chatId, landId, sellerId, buyerId, agreedPrice });
    console.log('User making request:', req.user._id);

    // Validate required fields
    if (!chatId || !landId || !sellerId || !buyerId || !agreedPrice) {
      console.log('Missing required fields:', { chatId, landId, sellerId, buyerId, agreedPrice });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if seller has 2FA enabled
    const seller = await User.findById(sellerId);
    console.log('Seller 2FA check:', {
      sellerId: sellerId,
      sellerFound: !!seller,
      sellerIdMatch: seller ? seller._id.toString() : 'N/A',
      twoFactorEnabled: seller ? seller.twoFactorEnabled : 'N/A',
      twoFactorType: seller ? typeof seller.twoFactorEnabled : 'N/A'
    });
    
    if (!seller) {
      return res.status(400).json({ 
        message: 'Seller not found' 
      });
    }
    
    if (!seller.twoFactorEnabled) {
      return res.status(400).json({ 
        message: 'Seller must have 2FA enabled to receive buy requests' 
      });
    }

    // Verify user is the buyer
    if (req.user._id.toString() !== buyerId.toString()) {
      return res.status(403).json({ message: 'Only the buyer can initiate buy request' });
    }

    // Check if chat exists and user is part of it
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.buyer.toString() !== buyerId.toString() || chat.seller.toString() !== sellerId.toString()) {
      return res.status(403).json({ message: 'Invalid chat participants' });
    }

    // Check if land exists and is for sale
    const land = await Land.findById(landId);
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (!land.marketInfo.isForSale) {
      return res.status(400).json({ message: 'Land is not for sale' });
    }

    // Check if buy request already exists for this chat
    const existingRequest = await BuyRequest.findOne({ chatId });
    if (existingRequest) {
      return res.status(400).json({ message: 'Buy request already exists for this chat' });
    }

    // Create buy request
    const buyRequest = new BuyRequest({
      chatId,
      landId,
      seller: sellerId,
      buyer: buyerId,
      agreedPrice
    });

    await buyRequest.save();

    // Update chat status
    chat.status = 'DEAL_AGREED';
    await chat.save();

    await buyRequest.populate(['landId', 'seller', 'buyer', 'chatId']);

    console.log('Buy request created successfully for seller:', sellerId);

    res.json({
      message: 'Buy request created successfully',
      buyRequest
    });
  } catch (error) {
    console.error('Create buy request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get buy request by chat ID
router.get('/:chatId', auth, async (req, res) => {
  try {
    const buyRequest = await BuyRequest.findOne({ chatId: req.params.chatId })
      .populate('landId', 'assetId village district marketInfo')
      .populate('seller', 'fullName email')
      .populate('buyer', 'fullName email')
      .populate('chatId');

    if (!buyRequest) {
      return res.status(404).json({ message: 'Buy request not found' });
    }

    // Check if user is part of this transaction
    if (buyRequest.seller._id.toString() !== req.user._id.toString() && 
        buyRequest.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ buyRequest });
  } catch (error) {
    console.error('Get buy request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm buy request by seller (with 2FA)
router.post('/:chatId/confirm', auth, async (req, res) => {
  try {
    const { twoFactorCode } = req.body;
    
    console.log('Confirm buy request received:', {
      chatId: req.params.chatId,
      twoFactorCode,
      userId: req.user._id
    });

    const buyRequest = await BuyRequest.findOne({ chatId: req.params.chatId })
      .populate('landId seller buyer');

    if (!buyRequest) {
      return res.status(404).json({ message: 'Buy request not found' });
    }
    
    console.log('Buy request found:', {
      id: buyRequest._id,
      status: buyRequest.status,
      storedCode: buyRequest.twoFactorCode,
      expiresAt: buyRequest.twoFactorExpiresAt,
      sellerId: buyRequest.seller._id,
      requestUserId: req.user._id,
      sellerIsPopulated: !!buyRequest.seller._id,
      sellerType: typeof buyRequest.seller,
      expectedSellerId: buyRequest.seller._id ? buyRequest.seller._id.toString() : buyRequest.seller.toString(),
      actualUserId: req.user._id.toString()
    });

    // Verify user is the seller
    if (buyRequest.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the seller can confirm this request' });
    }

    // Verify 2FA code using user's 2FA system
    const seller = await User.findById(buyRequest.seller._id).select('+twoFactorSecret');
    
    console.log('Seller 2FA status:', {
      sellerId: seller._id,
      twoFactorEnabled: seller.twoFactorEnabled,
      hasSecret: !!seller.twoFactorSecret
    });
    
    if (!seller.twoFactorEnabled) {
      return res.status(400).json({ message: 'Seller must have 2FA enabled to confirm buy requests' });
    }
    
    console.log('Verifying 2FA token:', {
      providedCode: twoFactorCode,
      sellerId: seller._id
    });
    
    const isValidToken = seller.verifyTwoFactorToken(twoFactorCode);
    console.log('2FA verification result:', isValidToken);
    
    if (!isValidToken) {
      return res.status(400).json({ message: 'Invalid or expired 2FA code' });
    }

    // Confirm the buy request
    buyRequest.confirmBySeller(buyRequest.seller._id);
    await buyRequest.save();

    // Update chat status
    const chat = await Chat.findById(buyRequest.chatId);
    if (chat) {
      chat.status = 'TRANSACTION_INITIATED';
      await chat.save();
    }

    await buyRequest.populate(['landId', 'seller', 'buyer', 'chatId']);

    res.json({
      message: 'Buy request confirmed successfully',
      buyRequest
    });
  } catch (error) {
    console.error('Confirm buy request error:', error);
    if (error.message.includes('Buy request is not in')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend 2FA code
router.post('/:chatId/resend-2fa', auth, async (req, res) => {
  try {
    const buyRequest = await BuyRequest.findOne({ chatId: req.params.chatId });

    if (!buyRequest) {
      return res.status(404).json({ message: 'Buy request not found' });
    }

    // Verify user is the seller
    if (buyRequest.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the seller can request 2FA resend' });
    }

    if (buyRequest.status !== 'PENDING_SELLER_CONFIRMATION') {
      return res.status(400).json({ message: 'Buy request is not in pending seller confirmation status' });
    }

    // Generate new 2FA code
    const twoFactorCode = buyRequest.generateTwoFactorCode();
    await buyRequest.save();

    // TODO: Send 2FA code via SMS/Email to seller
    console.log(`New 2FA Code for seller ${req.user._id}: ${twoFactorCode}`);

    res.json({
      message: '2FA code resent successfully',
      twoFactorCode // Remove this in production
    });
  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's buy requests
router.get('/user/my-requests', auth, async (req, res) => {
  try {
    const buyRequests = await BuyRequest.findByUser(req.user._id)
      .sort({ createdAt: -1 });

    res.json({ buyRequests });
  } catch (error) {
    console.error('Get user buy requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel buy request
router.post('/:chatId/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const buyRequest = await BuyRequest.findOne({ chatId: req.params.chatId });

    if (!buyRequest) {
      return res.status(404).json({ message: 'Buy request not found' });
    }

    // Check if user can cancel (buyer or seller)
    if (buyRequest.seller.toString() !== req.user._id.toString() && 
        buyRequest.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if cancellation is allowed
    if (['COMPLETED', 'CANCELLED'].includes(buyRequest.status)) {
      return res.status(400).json({ message: 'Cannot cancel completed or already cancelled request' });
    }

    buyRequest.status = 'CANCELLED';
    buyRequest.timeline.push({
      event: 'CANCELLED',
      timestamp: new Date(),
      performedBy: req.user._id,
      description: `Buy request cancelled${reason ? ': ' + reason : ''}`,
      metadata: { reason }
    });

    await buyRequest.save();

    // Update chat status
    const chat = await Chat.findById(buyRequest.chatId);
    if (chat) {
      chat.status = 'CANCELLED';
      await chat.save();
    }

    res.json({
      message: 'Buy request cancelled successfully',
      buyRequest
    });
  } catch (error) {
    console.error('Cancel buy request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
