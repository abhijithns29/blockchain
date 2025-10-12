const express = require('express');
const BuyRequest = require('../models/BuyRequest');
const Land = require('../models/Land');
const LandTransaction = require('../models/LandTransaction');
const User = require('../models/User');
const Chat = require('../models/Chat');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get all pending transactions for admin
router.get('/pending', auth, requireAdmin, async (req, res) => {
  try {
    const pendingRequests = await BuyRequest.findPendingAdminApproval()
      .populate('landId', 'assetId surveyNumber village district state area landType marketInfo originalDocument digitalDocument')
      .populate('seller', 'fullName email verificationStatus verificationDocuments')
      .populate('buyer', 'fullName email verificationStatus verificationDocuments')
      .populate('chatId')
      .sort({ createdAt: -1 });

    res.json({ 
      message: 'Pending transactions retrieved successfully',
      transactions: pendingRequests 
    });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction details for admin review
router.get('/:transactionId', auth, requireAdmin, async (req, res) => {
  try {
    const buyRequest = await BuyRequest.findById(req.params.transactionId)
      .populate('landId')
      .populate('seller', 'fullName email verificationStatus verificationDocuments profile')
      .populate('buyer', 'fullName email verificationStatus verificationDocuments profile')
      .populate('chatId')
      .populate('timeline.performedBy', 'fullName email');

    if (!buyRequest) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (buyRequest.status !== 'PENDING_ADMIN_APPROVAL') {
      return res.status(400).json({ message: 'Transaction is not pending admin approval' });
    }

    // Get detailed land information
    const land = await Land.findById(buyRequest.landId._id)
      .populate('currentOwner', 'fullName email')
      .populate('ownershipHistory.owner', 'fullName email');

    res.json({
      message: 'Transaction details retrieved successfully',
      transaction: buyRequest,
      land: land,
      sellerDetails: buyRequest.seller,
      buyerDetails: buyRequest.buyer
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve transaction
router.post('/:transactionId/approve', auth, requireAdmin, async (req, res) => {
  try {
    const { comments = '', blockchainTxHash = '' } = req.body;

    const buyRequest = await BuyRequest.findById(req.params.transactionId)
      .populate('landId')
      .populate('seller')
      .populate('buyer');

    if (!buyRequest) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (buyRequest.status !== 'PENDING_ADMIN_APPROVAL') {
      return res.status(400).json({ message: 'Transaction is not pending admin approval' });
    }

    // Simulate blockchain transaction
    const mockTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Approve the buy request
    buyRequest.approveByAdmin(req.user._id, comments);
    buyRequest.blockchainTxHash = blockchainTxHash || mockTransactionHash;

    // Create land transaction record
    const landTransaction = new LandTransaction({
      transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      landId: buyRequest.landId._id,
      seller: buyRequest.seller._id,
      buyer: buyRequest.buyer._id,
      agreedPrice: buyRequest.agreedPrice,
      escrowAmount: buyRequest.agreedPrice,
      transactionType: 'SALE',
      status: 'APPROVED',
      adminReview: {
        reviewedBy: req.user._id,
        reviewDate: new Date(),
        comments: comments,
        documentsVerified: true,
        legalClearance: true,
        financialVerification: true
      },
      blockchainTxHash: blockchainTxHash,
      timeline: [{
        event: 'ADMIN_APPROVED',
        timestamp: new Date(),
        performedBy: req.user._id,
        description: 'Transaction approved by admin',
        metadata: { comments }
      }]
    });

    await landTransaction.save();

    // Update buy request with transaction reference
    buyRequest.landTransactionId = landTransaction._id;
    buyRequest.status = 'APPROVED';

    // Update land ownership
    const land = await Land.findById(buyRequest.landId._id);
    if (land) {
      // Add current owner to ownership history
      land.ownershipHistory.push({
        owner: land.currentOwner,
        ownerName: buyRequest.seller.fullName,
        fromDate: land.createdAt,
        toDate: new Date(),
        documentReference: `Transaction-${landTransaction._id}`,
        transactionType: 'SALE'
      });

      // Update current owner
      land.currentOwner = buyRequest.buyer._id;
      land.status = 'AVAILABLE'; // Set to AVAILABLE so new owner can list it for sale
      land.verificationStatus = 'VERIFIED'; // Mark as verified for new owner
      land.marketInfo.isForSale = false;

      // Ensure digital document is marked as digitalized
      if (!land.digitalDocument) {
        land.digitalDocument = {};
      }
      land.digitalDocument.isDigitalized = true;

      await land.save();
    }

    // Update user profiles
    await User.findByIdAndUpdate(buyRequest.seller._id, {
      $pull: { ownedLands: land._id }
    });

    await User.findByIdAndUpdate(buyRequest.buyer._id, {
      $addToSet: { ownedLands: land._id }
    });

    await buyRequest.save();

    // Generate new ownership document for buyer
    const documentHash = `doc_${Math.random().toString(16).substr(2, 16)}`;
    const qrCode = `QR_${Math.random().toString(16).substr(2, 16)}`;
    
    // Update land with new document
    land.digitalDocument = {
      hash: documentHash,
      url: `http://localhost:5000/api/documents/${documentHash}.pdf`,
      digitalizedBy: buyRequest.buyer._id,
      verifiedBy: req.user._id,
      generatedAt: new Date(),
      isDigitalized: true
    };

    await land.save();

    // Update chat status
    const chat = await Chat.findById(buyRequest.chatId);
    if (chat) {
      chat.status = 'COMPLETED';
      await chat.save();
    }

    await buyRequest.populate(['landId', 'seller', 'buyer', 'landTransactionId']);

    res.json({
      message: 'Transaction approved successfully',
      transaction: buyRequest,
      landTransaction: landTransaction,
      newDocument: {
        documentUrl: `http://localhost:5000/api/documents/${documentHash}.pdf`,
        documentHash,
        qrCode
      }
    });
  } catch (error) {
    console.error('Approve transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject transaction
router.post('/:transactionId/reject', auth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const buyRequest = await BuyRequest.findById(req.params.transactionId);

    if (!buyRequest) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (buyRequest.status !== 'PENDING_ADMIN_APPROVAL') {
      return res.status(400).json({ message: 'Transaction is not pending admin approval' });
    }

    // Reject the buy request
    buyRequest.rejectByAdmin(req.user._id, reason);
    await buyRequest.save();

    // Update chat status
    const chat = await Chat.findById(buyRequest.chatId);
    if (chat) {
      chat.status = 'REJECTED';
      await chat.save();
    }

    await buyRequest.populate(['landId', 'seller', 'buyer']);

    res.json({
      message: 'Transaction rejected successfully',
      transaction: buyRequest
    });
  } catch (error) {
    console.error('Reject transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all transactions (for admin dashboard)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const transactions = await BuyRequest.find(filter)
      .populate('landId', 'assetId surveyNumber village district')
      .populate('seller', 'fullName email')
      .populate('buyer', 'fullName email')
      .populate('adminReview.reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await BuyRequest.countDocuments(filter);

    res.json({
      message: 'Transactions retrieved successfully',
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTransactions: total
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction statistics for admin dashboard
router.get('/stats/overview', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await BuyRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$agreedPrice' }
        }
      }
    ]);

    const totalTransactions = await BuyRequest.countDocuments();
    const totalValue = await BuyRequest.aggregate([
      { $group: { _id: null, total: { $sum: '$agreedPrice' } } }
    ]);

    res.json({
      message: 'Statistics retrieved successfully',
      stats: {
        byStatus: stats,
        totalTransactions,
        totalValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
