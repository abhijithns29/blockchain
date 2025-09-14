const express = require('express');
const multer = require('multer');
const LandTransaction = require('../models/LandTransaction');
const Land = require('../models/Land');
const User = require('../models/User');
const Chat = require('../models/Chat');
const AuditLog = require('../models/AuditLog');
const { auth, adminAuth, requireTwoFactor } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');
const DocumentWatermark = require('../utils/documentWatermark');
const EscrowService = require('../utils/escrowContract');
const blockchainService = require('../config/blockchain');
const QRCode = require('qrcode');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Initiate land purchase
router.post('/purchase', auth, async (req, res) => {
  try {
    const { landId, offerPrice, chatId } = req.body;

    if (!landId || !offerPrice || offerPrice <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid land ID and offer price are required' 
      });
    }

    const land = await Land.findById(landId).populate('currentOwner');
    if (!land) {
      return res.status(404).json({ 
        success: false,
        message: 'Land not found' 
      });
    }

    if (!land.marketInfo.isForSale) {
      return res.status(400).json({ 
        success: false,
        message: 'Land is not for sale' 
      });
    }

    if (land.currentOwner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false,
        message: 'You cannot buy your own land' 
      });
    }

    const buyer = await User.findById(req.user._id);
    if (!buyer.canClaimLand()) {
      return res.status(403).json({ 
        success: false,
        message: 'You must be verified to purchase land' 
      });
    }

    // Check for existing pending transactions
    const existingTransaction = await LandTransaction.findOne({
      landId: land._id,
      status: { $in: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] }
    });

    if (existingTransaction) {
      return res.status(400).json({ 
        success: false,
        message: 'There is already a pending transaction for this land' 
      });
    }

    // Create transaction
    const transaction = new LandTransaction({
      landId: land._id,
      seller: land.currentOwner._id,
      buyer: req.user._id,
      agreedPrice: parseFloat(offerPrice),
      transactionType: 'SALE',
      status: 'INITIATED',
      chatId: chatId || null
    });

    transaction.addTimelineEvent('INITIATED', req.user._id, 'Transaction initiated by buyer');
    await transaction.save();

    // Update land status
    land.status = 'UNDER_TRANSACTION';
    await land.save();

    // Update chat if exists
    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.status = 'TRANSACTION_INITIATED';
        chat.transactionId = transaction._id;
        await chat.save();
      }
    }

    // Log audit trail
    await AuditLog.logAction(
      'TRANSACTION_INITIATE',
      req.user._id,
      'TRANSACTION',
      transaction._id.toString(),
      {
        landAssetId: land.assetId,
        agreedPrice: parseFloat(offerPrice),
        seller: land.currentOwner.fullName
      },
      req
    );

    console.log(`✅ Transaction initiated: ${transaction.transactionId}`);

    res.json({
      success: true,
      message: 'Purchase request initiated successfully',
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        status: transaction.status,
        agreedPrice: transaction.agreedPrice
      }
    });
  } catch (error) {
    console.error('Purchase initiation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to initiate purchase' 
    });
  }
});

// Submit transaction documents
router.post('/:transactionId/documents', auth, upload.array('documents', 5), async (req, res) => {
  try {
    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId seller buyer');

    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }

    const isParticipant = transaction.seller._id.toString() === req.user._id.toString() || 
                         transaction.buyer._id.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    if (!['INITIATED', 'DOCUMENTS_SUBMITTED'].includes(transaction.status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot submit documents at this stage' 
      });
    }

    // Process and upload documents
    const uploadedDocuments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const watermarkText = transaction.generateWatermark();
          
          let processedBuffer;
          if (file.mimetype === 'application/pdf') {
            processedBuffer = await DocumentWatermark.addWatermarkToPDF(file.buffer, watermarkText);
          } else {
            processedBuffer = await DocumentWatermark.addWatermarkToImage(file.buffer, watermarkText);
          }
          
          const ipfsHash = await ipfsService.uploadFile(processedBuffer, file.originalname);
          
          uploadedDocuments.push({
            documentType: 'OTHER',
            documentName: file.originalname,
            documentUrl: ipfsService.getFileUrl(ipfsHash),
            ipfsHash,
            watermark: watermarkText,
            uploadedBy: req.user._id
          });
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
        }
      }
    }

    transaction.documents.push(...uploadedDocuments);
    transaction.status = 'DOCUMENTS_SUBMITTED';
    transaction.addTimelineEvent(
      'DOCUMENTS_UPLOADED', 
      req.user._id, 
      `${uploadedDocuments.length} documents uploaded`
    );

    await transaction.save();

    // Log audit trail
    await AuditLog.logAction(
      'DOCUMENT_UPLOAD',
      req.user._id,
      'TRANSACTION',
      transaction._id.toString(),
      {
        transactionId: transaction.transactionId,
        documentsCount: uploadedDocuments.length
      },
      req
    );

    res.json({
      success: true,
      message: 'Documents submitted successfully',
      documentsUploaded: uploadedDocuments.length
    });
  } catch (error) {
    console.error('Document submission error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to submit documents' 
    });
  }
});

// Get pending transactions for admin review
router.get('/pending-review', adminAuth, async (req, res) => {
  try {
    const transactions = await LandTransaction.findPendingReview()
      .populate('adminReview.reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      transactions 
    });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch pending transactions' 
    });
  }
});

// Review transaction (Admin only with 2FA)
router.put('/:transactionId/review', adminAuth, requireTwoFactor, async (req, res) => {
  try {
    const { action, comments, rejectionReason } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid action. Must be approve or reject' 
      });
    }

    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId seller buyer');

    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }

    if (!['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'].includes(transaction.status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Transaction cannot be reviewed at this stage' 
      });
    }

    // Update admin review
    transaction.adminReview = {
      reviewedBy: req.user._id,
      reviewDate: new Date(),
      comments,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
      documentsVerified: action === 'approve',
      legalClearance: action === 'approve',
      financialVerification: action === 'approve'
    };

    if (action === 'approve') {
      await approveTransaction(transaction, req.user._id, req);
    } else {
      await rejectTransaction(transaction, req.user._id, rejectionReason, req);
    }

    res.json({
      success: true,
      message: `Transaction ${action}d successfully`,
      transaction
    });
  } catch (error) {
    console.error('Review transaction error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to review transaction' 
    });
  }
});

// Helper function to approve transaction
async function approveTransaction(transaction, adminId, req) {
  const land = transaction.landId;
  const newOwner = transaction.buyer;
  const oldOwner = transaction.seller;

  try {
    // Deploy escrow contract
    const escrowService = new EscrowService(blockchainService.provider, blockchainService.wallet);
    const escrowResult = await escrowService.deployEscrowContract(
      newOwner.walletAddress,
      oldOwner.walletAddress,
      transaction.agreedPrice
    );
    
    transaction.escrowContractAddress = escrowResult.address;
    transaction.blockchainTxHash = escrowResult.txHash;
  } catch (escrowError) {
    console.error('Escrow deployment failed:', escrowError);
  }

  // Generate certificates with QR codes
  const qrData = {
    transactionId: transaction.transactionId,
    landAssetId: land.assetId,
    buyer: newOwner.fullName,
    seller: oldOwner.fullName,
    price: transaction.agreedPrice,
    date: new Date().toISOString()
  };
  
  const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
  
  // Generate transaction certificate
  const transactionCertificatePDF = await PDFGenerator.generateTransactionCertificate(
    transaction, 
    land, 
    qrCodeDataURL
  );
  
  const transactionWatermark = transaction.generateWatermark();
  const watermarkedTransactionPDF = await DocumentWatermark.addWatermarkToPDF(
    transactionCertificatePDF, 
    transactionWatermark
  );
  
  const transactionCertificateHash = await ipfsService.uploadFile(
    watermarkedTransactionPDF,
    `transaction-certificate-${transaction.transactionId}.pdf`
  );

  // Generate new ownership certificate
  const ownershipCertificatePDF = await PDFGenerator.generateOwnershipCertificate(
    transaction, 
    land, 
    newOwner,
    qrCodeDataURL
  );
  
  const ownershipWatermark = land.generateWatermark();
  const watermarkedOwnershipPDF = await DocumentWatermark.addWatermarkToPDF(
    ownershipCertificatePDF, 
    ownershipWatermark
  );
  
  const ownershipCertificateHash = await ipfsService.uploadFile(
    watermarkedOwnershipPDF,
    `ownership-certificate-${land.assetId}-${Date.now()}.pdf`
  );

  // Update transaction completion details
  transaction.completionDetails = {
    completedDate: new Date(),
    registrationNumber: `REG-${Date.now()}`,
    registrationDate: new Date(),
    registrationOffice: `${land.district} Sub-Registrar Office`,
    stampDuty: transaction.agreedPrice * 0.05,
    registrationFee: 1000,
    totalCharges: (transaction.agreedPrice * 0.05) + 1000,
    
    transactionCertificate: {
      certificateUrl: ipfsService.getFileUrl(transactionCertificateHash),
      qrCode: qrCodeDataURL,
      ipfsHash: transactionCertificateHash,
      watermark: transactionWatermark
    },
    
    newOwnershipDocument: {
      certificateUrl: ipfsService.getFileUrl(ownershipCertificateHash),
      qrCode: qrCodeDataURL,
      ipfsHash: ownershipCertificateHash,
      watermark: ownershipWatermark
    }
  };

  transaction.status = 'COMPLETED';
  transaction.addTimelineEvent('COMPLETED', adminId, 'Transaction approved and completed by admin');
  await transaction.save();

  // Update land ownership
  const oldOwnerUser = await User.findById(oldOwner._id);
  const newOwnerUser = await User.findById(newOwner._id);

  // Remove from old owner
  if (oldOwnerUser) {
    oldOwnerUser.ownedLands = oldOwnerUser.ownedLands.filter(
      landId => landId.toString() !== land._id.toString()
    );
    await oldOwnerUser.save();
  }

  // Add to new owner
  newOwnerUser.ownedLands.push(land._id);
  await newOwnerUser.save();

  // Update land ownership
  land.addOwnershipRecord(newOwner._id, 'SALE', transaction.transactionId);
  land.status = 'AVAILABLE';
  land.marketInfo.isForSale = false;
  await land.save();

  // Update chat if exists
  if (transaction.chatId) {
    const chat = await Chat.findById(transaction.chatId);
    if (chat) {
      chat.status = 'COMPLETED';
      await chat.save();
    }
  }

  // Log audit trail
  await AuditLog.logAction(
    'TRANSACTION_APPROVE',
    adminId,
    'TRANSACTION',
    transaction._id.toString(),
    {
      transactionId: transaction.transactionId,
      landAssetId: land.assetId,
      transferredTo: newOwner.fullName
    },
    req
  );

  console.log(`✅ Transaction approved: ${transaction.transactionId}`);
}

// Helper function to reject transaction
async function rejectTransaction(transaction, adminId, rejectionReason, req) {
  transaction.status = 'REJECTED';
  transaction.addTimelineEvent('REJECTED', adminId, `Transaction rejected: ${rejectionReason}`);
  await transaction.save();

  // Update land status
  const land = await Land.findById(transaction.landId._id);
  land.status = 'FOR_SALE';
  await land.save();

  // Update chat if exists
  if (transaction.chatId) {
    const chat = await Chat.findById(transaction.chatId);
    if (chat) {
      chat.status = 'ACTIVE';
      chat.transactionId = null;
      await chat.save();
    }
  }

  // Log audit trail
  await AuditLog.logAction(
    'TRANSACTION_REJECT',
    adminId,
    'TRANSACTION',
    transaction._id.toString(),
    {
      transactionId: transaction.transactionId,
      rejectionReason
    },
    req
  );

  console.log(`❌ Transaction rejected: ${transaction.transactionId}`);
}

// Get user's transactions
router.get('/my-transactions', auth, async (req, res) => {
  try {
    const transactions = await LandTransaction.find({
      $or: [{ seller: req.user._id }, { buyer: req.user._id }]
    })
      .populate('landId', 'assetId village district')
      .populate('seller', 'fullName email')
      .populate('buyer', 'fullName email')
      .populate('adminReview.reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      transactions 
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transactions' 
    });
  }
});

// Get transaction details
router.get('/:transactionId', auth, async (req, res) => {
  try {
    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId seller buyer')
      .populate('adminReview.reviewedBy', 'fullName')
      .populate('documents.uploadedBy', 'fullName')
      .populate('timeline.performedBy', 'fullName');

    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }

    const hasAccess = transaction.buyer._id.toString() === req.user._id.toString() ||
                     transaction.seller._id.toString() === req.user._id.toString() ||
                     ['ADMIN', 'AUDITOR'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    res.json({ 
      success: true,
      transaction 
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transaction details' 
    });
  }
});

// Verify transaction certificate
router.get('/verify/:transactionId', async (req, res) => {
  try {
    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId buyer seller');

    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }

    if (transaction.status !== 'COMPLETED') {
      return res.status(400).json({ 
        success: false,
        message: 'Transaction is not completed' 
      });
    }

    res.json({
      success: true,
      verification: {
        isValid: true,
        transactionId: transaction.transactionId,
        landAssetId: transaction.landId.assetId,
        buyer: transaction.buyer.fullName,
        seller: transaction.seller.fullName,
        agreedPrice: transaction.agreedPrice,
        completedDate: transaction.completionDetails.completedDate,
        registrationNumber: transaction.completionDetails.registrationNumber,
        certificates: {
          transaction: transaction.completionDetails.transactionCertificate.certificateUrl,
          ownership: transaction.completionDetails.newOwnershipDocument.certificateUrl
        }
      }
    });
  } catch (error) {
    console.error('Verify transaction error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Verification failed' 
    });
  }
});

// Get transaction history for a land
router.get('/land/:landId/history', async (req, res) => {
  try {
    const transactions = await LandTransaction.find({ landId: req.params.landId })
      .populate('seller', 'fullName email')
      .populate('buyer', 'fullName email')
      .populate('adminReview.reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      transactions 
    });
  } catch (error) {
    console.error('Get land transaction history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transaction history' 
    });
  }
});

module.exports = router;