const express = require('express');
const Transaction = require('../models/Transaction');
const Property = require('../models/Property');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const blockchainService = require('../config/blockchain');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');

const router = express.Router();

// Initiate transaction
router.post('/', auth, async (req, res) => {
  try {
    const { propertyId, transactionType, amount, terms } = req.body;

    const property = await Property.findById(propertyId).populate('owner');
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Create transaction record
    const transaction = new Transaction({
      propertyId,
      from: transactionType === 'REGISTRATION' ? null : property.owner._id,
      to: req.user._id,
      transactionType,
      amount,
      status: 'PENDING',
      metadata: { terms }
    });

    await transaction.save();

    // Add transaction to property history
    property.transactionHistory.push(transaction._id);
    await property.save();

    res.status(201).json({
      message: 'Transaction initiated successfully',
      transaction
    });
  } catch (error) {
    console.error('Initiate transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all pending transactions (Admin only)
router.get('/pending', adminAuth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'PENDING' })
      .populate('propertyId')
      .populate('from', 'fullName email walletAddress')
      .populate('to', 'fullName email walletAddress')
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve transaction (Admin only)
router.put('/:id/approve', adminAuth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('propertyId')
      .populate('from')
      .populate('to');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    // Generate certificate hash
    const certificateHash = `CERT-${Date.now()}-${transaction._id}`;

    // Generate PDF certificate
    const pdfBuffer = await PDFGenerator.generateCertificate(
      transaction,
      transaction.propertyId,
      certificateHash
    );

    // Upload certificate to IPFS
    const certificateIPFSHash = await ipfsService.uploadFile(
      Buffer.from(pdfBuffer),
      `certificate-${certificateHash}.pdf`
    );

    // Approve transaction on blockchain
    let blockchainTxHash = null;
    
    try {
      const blockchainTx = await blockchainService.approveTransaction(
        transaction.propertyId.blockchainId,
        0, // Transaction index (simplified for demo)
        certificateIPFSHash
      );
      blockchainTxHash = blockchainTx.transactionHash;
    } catch (blockchainError) {
      console.error('Blockchain approval failed:', blockchainError);
      // Continue with database update even if blockchain fails
    }

    // Update transaction
    transaction.status = 'APPROVED';
    transaction.approvedBy = req.user._id;
    transaction.certificateHash = certificateIPFSHash;
    transaction.certificateUrl = ipfsService.getFileUrl(certificateIPFSHash);
    transaction.blockchainTxHash = blockchainTxHash;
    await transaction.save();

    // Update property ownership if it's a sale or transfer
    if (transaction.transactionType === 'SALE' || transaction.transactionType === 'TRANSFER') {
      const property = transaction.propertyId;
      
      // Remove from current owner
      if (transaction.from) {
        const currentOwner = await User.findById(transaction.from._id);
        currentOwner.ownedProperties = currentOwner.ownedProperties.filter(
          propId => propId.toString() !== property._id.toString()
        );
        await currentOwner.save();
      }

      // Add to new owner
      const newOwner = await User.findById(transaction.to._id);
      newOwner.ownedProperties.push(property._id);
      await newOwner.save();

      // Update property
      property.owner = transaction.to._id;
      property.status = 'AVAILABLE';
      await property.save();
    }

    res.json({
      message: 'Transaction approved successfully',
      transaction,
      certificateUrl: transaction.certificateUrl
    });
  } catch (error) {
    console.error('Approve transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject transaction (Admin only)
router.put('/:id/reject', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    transaction.status = 'REJECTED';
    transaction.approvedBy = req.user._id;
    transaction.metadata.rejectionReason = reason;
    await transaction.save();

    res.json({
      message: 'Transaction rejected successfully',
      transaction
    });
  } catch (error) {
    console.error('Reject transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction history for a property
router.get('/property/:id', async (req, res) => {
  try {
    const transactions = await Transaction.find({ propertyId: req.params.id })
      .populate('from', 'fullName email')
      .populate('to', 'fullName email')
      .populate('approvedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    console.error('Get property transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's transactions
router.get('/user/history', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ from: req.user._id }, { to: req.user._id }]
    })
      .populate('propertyId', 'title location')
      .populate('from', 'fullName email')
      .populate('to', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify certificate
router.get('/verify/:certificateHash', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ 
      certificateHash: req.params.certificateHash 
    })
      .populate('propertyId')
      .populate('from', 'fullName')
      .populate('to', 'fullName');

    if (!transaction) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json({
      isValid: true,
      transaction: {
        id: transaction._id,
        type: transaction.transactionType,
        amount: transaction.amount,
        date: transaction.createdAt,
        property: transaction.propertyId,
        from: transaction.from,
        to: transaction.to,
        certificateUrl: transaction.certificateUrl
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;