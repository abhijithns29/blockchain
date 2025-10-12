const mongoose = require('mongoose');

const buyRequestSchema = new mongoose.Schema({
  // Chat and participants
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
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
  
  // Transaction details
  agreedPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Request status
  status: {
    type: String,
    enum: ['PENDING_SELLER_CONFIRMATION', 'PENDING_ADMIN_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING_SELLER_CONFIRMATION'
  },
  
  // Two-factor authentication
  twoFactorRequired: {
    type: Boolean,
    default: true
  },
  
  twoFactorCode: {
    type: String,
    length: 6
  },
  
  twoFactorVerified: {
    type: Boolean,
    default: false
  },
  
  twoFactorExpiresAt: {
    type: Date
  },
  
  // Admin approval
  adminReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    comments: String,
    rejectionReason: String
  },
  
  // Transaction reference
  landTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LandTransaction'
  },
  
  // Blockchain transaction
  blockchainTxHash: String,
  
  // Timeline
  timeline: [{
    event: {
      type: String,
      enum: ['CREATED', 'SELLER_CONFIRMED', 'ADMIN_REVIEWED', 'APPROVED', 'REJECTED', 'BLOCKCHAIN_PROCESSED', 'COMPLETED']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Metadata
  metadata: {
    notes: String,
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL'
    },
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes for better performance
buyRequestSchema.index({ chatId: 1 });
buyRequestSchema.index({ landId: 1 });
buyRequestSchema.index({ seller: 1 });
buyRequestSchema.index({ buyer: 1 });
buyRequestSchema.index({ status: 1 });
buyRequestSchema.index({ createdAt: -1 });
buyRequestSchema.index({ 'adminReview.status': 1 });

// Pre-save middleware
buyRequestSchema.pre('save', function(next) {
  // Add timeline event
  if (this.isNew) {
    this.timeline.push({
      event: 'CREATED',
      timestamp: new Date(),
      performedBy: this.buyer,
      description: `Buy request created for ₹${this.agreedPrice.toLocaleString()}`
    });
  }
  
  // Update timeline based on status changes
  if (this.isModified('status')) {
    let event, description;
    switch (this.status) {
      case 'PENDING_SELLER_CONFIRMATION':
        event = 'CREATED';
        description = 'Buy request created';
        break;
      case 'PENDING_ADMIN_APPROVAL':
        event = 'SELLER_CONFIRMED';
        description = 'Seller confirmed buy request';
        break;
      case 'APPROVED':
        event = 'ADMIN_REVIEWED';
        description = 'Admin approved transaction';
        break;
      case 'REJECTED':
        event = 'ADMIN_REVIEWED';
        description = 'Admin rejected transaction';
        break;
      case 'COMPLETED':
        event = 'COMPLETED';
        description = 'Transaction completed successfully';
        break;
    }
    
    if (event) {
      this.timeline.push({
        event,
        timestamp: new Date(),
        performedBy: this.seller, // This will be updated based on who performed the action
        description
      });
    }
  }
  
  next();
});

// Instance methods
buyRequestSchema.methods.generateTwoFactorCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.twoFactorCode = code;
  this.twoFactorVerified = false;
  this.twoFactorExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return code;
};

buyRequestSchema.methods.verifyTwoFactorCode = function(code) {
  if (!this.twoFactorCode || !this.twoFactorExpiresAt) {
    return false;
  }
  
  if (new Date() > this.twoFactorExpiresAt) {
    return false;
  }
  
  if (this.twoFactorCode !== code) {
    return false;
  }
  
  this.twoFactorVerified = true;
  this.twoFactorCode = undefined;
  this.twoFactorExpiresAt = undefined;
  return true;
};

buyRequestSchema.methods.confirmBySeller = function(sellerId) {
  // Extract the actual seller ID (handle both populated and non-populated cases)
  const actualSellerId = this.seller._id ? this.seller._id.toString() : this.seller.toString();
  const passedSellerIdStr = sellerId.toString();
  
  console.log('confirmBySeller called:', {
    buyRequestId: this._id,
    currentStatus: this.status,
    buyRequestSeller: this.seller,
    passedSellerId: sellerId,
    actualSellerId,
    passedSellerIdStr,
    areEqual: actualSellerId === passedSellerIdStr,
    sellerIsPopulated: !!this.seller._id
  });
  
  if (this.status !== 'PENDING_SELLER_CONFIRMATION') {
    throw new Error('Buy request is not in pending seller confirmation status');
  }
  
  if (actualSellerId !== passedSellerIdStr) {
    throw new Error('Only the seller can confirm this buy request');
  }
  
  this.status = 'PENDING_ADMIN_APPROVAL';
  this.timeline.push({
    event: 'SELLER_CONFIRMED',
    timestamp: new Date(),
    performedBy: sellerId,
    description: 'Seller confirmed buy request'
  });
  
  return this;
};

buyRequestSchema.methods.approveByAdmin = function(adminId, comments = '') {
  if (this.status !== 'PENDING_ADMIN_APPROVAL') {
    throw new Error('Buy request is not in pending admin approval status');
  }
  
  this.status = 'APPROVED';
  this.adminReview = {
    reviewedBy: adminId,
    reviewedAt: new Date(),
    status: 'APPROVED',
    comments
  };
  
  this.timeline.push({
    event: 'ADMIN_REVIEWED',
    timestamp: new Date(),
    performedBy: adminId,
    description: 'Admin approved transaction',
    metadata: { comments }
  });
  
  return this;
};

buyRequestSchema.methods.rejectByAdmin = function(adminId, reason) {
  if (this.status !== 'PENDING_ADMIN_APPROVAL') {
    throw new Error('Buy request is not in pending admin approval status');
  }
  
  this.status = 'REJECTED';
  this.adminReview = {
    reviewedBy: adminId,
    reviewedAt: new Date(),
    status: 'REJECTED',
    rejectionReason: reason
  };
  
  this.timeline.push({
    event: 'ADMIN_REVIEWED',
    timestamp: new Date(),
    performedBy: adminId,
    description: 'Admin rejected transaction',
    metadata: { reason }
  });
  
  return this;
};

buyRequestSchema.methods.complete = function() {
  if (this.status !== 'APPROVED') {
    throw new Error('Only approved buy requests can be completed');
  }
  
  this.status = 'COMPLETED';
  this.timeline.push({
    event: 'COMPLETED',
    timestamp: new Date(),
    description: 'Transaction completed successfully'
  });
  
  return this;
};

// Static methods
buyRequestSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [{ seller: userId }, { buyer: userId }]
  }).populate('landId seller buyer chatId');
};

buyRequestSchema.statics.findByLand = function(landId) {
  return this.find({ landId }).populate('seller buyer chatId');
};

buyRequestSchema.statics.findPendingAdminApproval = function() {
  return this.find({ 
    status: 'PENDING_ADMIN_APPROVAL' 
  }).populate('landId seller buyer chatId');
};

// Transform output
buyRequestSchema.methods.toJSON = function() {
  const buyRequest = this.toObject();
  
  // Add computed fields
  buyRequest.isExpired = this.twoFactorExpiresAt && new Date() > this.twoFactorExpiresAt;
  buyRequest.requiresTwoFactor = this.twoFactorRequired && !this.twoFactorVerified;
  buyRequest.canBeConfirmedBySeller = this.status === 'PENDING_SELLER_CONFIRMATION' && this.twoFactorVerified;
  buyRequest.canBeApprovedByAdmin = this.status === 'PENDING_ADMIN_APPROVAL';
  
  return buyRequest;
};

module.exports = mongoose.model('BuyRequest', buyRequestSchema);
