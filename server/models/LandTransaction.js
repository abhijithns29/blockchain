const mongoose = require('mongoose');

const landTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  
  landId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Land',
    required: true
  },
  
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  agreedPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  escrowAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  transactionType: {
    type: String,
    enum: ['SALE', 'TRANSFER', 'INHERITANCE', 'GIFT'],
    default: 'SALE'
  },
  
  status: {
    type: String,
    enum: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
    default: 'INITIATED'
  },
  
  // Documents submitted
  documents: [{
    documentType: {
      type: String,
      enum: ['SALE_AGREEMENT', 'IDENTITY_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF', 'NOC', 'OTHER'],
      required: true
    },
    documentName: String,
    documentUrl: String,
    ipfsHash: String,
    watermark: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDate: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false }
  }],
  
  // Admin review
  adminReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: Date,
    comments: String,
    rejectionReason: String,
    documentsVerified: { type: Boolean, default: false },
    legalClearance: { type: Boolean, default: false },
    financialVerification: { type: Boolean, default: false }
  },
  
  // Completion details
  completionDetails: {
    completedDate: Date,
    registrationNumber: String,
    registrationDate: Date,
    registrationOffice: String,
    stampDuty: { type: Number, default: 0 },
    registrationFee: { type: Number, default: 0 },
    totalCharges: { type: Number, default: 0 },
    
    transactionCertificate: {
      certificateUrl: String,
      qrCode: String,
      ipfsHash: String,
      watermark: String
    },
    
    newOwnershipDocument: {
      certificateUrl: String,
      qrCode: String,
      ipfsHash: String,
      watermark: String
    }
  },
  
  // Blockchain information
  blockchainTxHash: String,
  escrowContractAddress: String,
  
  // Timeline tracking
  timeline: [{
    event: {
      type: String,
      enum: ['INITIATED', 'DOCUMENTS_UPLOADED', 'REVIEW_STARTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Chat reference
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  
  // Two-factor authentication for sensitive actions
  requiresTwoFactor: { type: Boolean, default: true },
  twoFactorVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
landTransactionSchema.index({ transactionId: 1 });
landTransactionSchema.index({ landId: 1 });
landTransactionSchema.index({ seller: 1 });
landTransactionSchema.index({ buyer: 1 });
landTransactionSchema.index({ status: 1 });
landTransactionSchema.index({ createdAt: -1 });

// Pre-save middleware
landTransactionSchema.pre('save', function(next) {
  // Generate transaction ID
  if (!this.transactionId && this.isNew) {
    const timestamp = Date.now().toString().slice(-8);
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.transactionId = `TXN${timestamp}${randomNum}`;
  }
  
  // Calculate escrow amount (10% of agreed price)
  if (this.isModified('agreedPrice')) {
    this.escrowAmount = this.agreedPrice * 0.1;
  }
  
  // Add timeline entry for status changes
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      event: this.status,
      timestamp: new Date(),
      description: `Transaction status changed to ${this.status}`
    });
  }
  
  next();
});

// Instance methods
landTransactionSchema.methods.addTimelineEvent = function(event, performedBy, description, metadata = {}) {
  this.timeline.push({
    event,
    timestamp: new Date(),
    performedBy,
    description,
    metadata
  });
};

landTransactionSchema.methods.canBeApproved = function() {
  return this.status === 'UNDER_REVIEW' && 
         this.adminReview.documentsVerified && 
         this.adminReview.legalClearance;
};

landTransactionSchema.methods.generateWatermark = function() {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(`${this.transactionId}-${Date.now()}`).digest('hex');
};

// Static methods
landTransactionSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ transactionId: transactionId.toUpperCase() });
};

landTransactionSchema.statics.findPendingReview = function() {
  return this.find({
    status: { $in: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] }
  }).populate('landId seller buyer');
};

module.exports = mongoose.model('LandTransaction', landTransactionSchema);