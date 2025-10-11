const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // Chat participants
  landId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Land',
    required: true
  },
  
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Chat messages
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    messageType: {
      type: String,
      enum: ['TEXT', 'OFFER', 'COUNTER_OFFER', 'ACCEPTANCE', 'REJECTION', 'SYSTEM'],
      default: 'TEXT'
    },
    offerAmount: {
      type: Number,
      min: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  
  // Current offer status
  currentOffer: {
    amount: {
      type: Number,
      min: 0
    },
    offeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    offeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COUNTER_OFFERED', 'EXPIRED'],
      default: 'PENDING'
    },
    expiresAt: Date,
    counterOffers: [{
      amount: Number,
      offeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      offeredAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Chat status
  status: {
    type: String,
    enum: ['ACTIVE', 'DEAL_AGREED', 'TRANSACTION_INITIATED', 'COMPLETED', 'CANCELLED', 'BLOCKED'],
    default: 'ACTIVE'
  },
  
  // Deal agreement details
  agreedPrice: {
    type: Number,
    min: 0
  },
  
  agreedDate: Date,
  
  // Transaction reference (when deal is agreed and transaction is created)
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LandTransaction'
  },
  
  // Chat metadata
  metadata: {
    lastActivity: {
      type: Date,
      default: Date.now
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    unreadCount: {
      buyer: { type: Number, default: 0 },
      seller: { type: Number, default: 0 }
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH'],
      default: 'NORMAL'
    },
    tags: [String],
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ landId: 1 });
chatSchema.index({ buyer: 1 });
chatSchema.index({ seller: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ 'metadata.lastActivity': -1 });
chatSchema.index({ createdAt: -1 });

// Pre-save middleware
chatSchema.pre('save', function(next) {
  // Update total messages count
  this.metadata.totalMessages = this.messages.length;
  
  // Update last activity
  if (this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1];
    this.metadata.lastActivity = lastMessage.timestamp;
  }
  
  // Update unread counts
  let buyerUnread = 0;
  let sellerUnread = 0;
  
  this.messages.forEach(msg => {
    if (!msg.isRead) {
      if (msg.sender.toString() === this.seller.toString()) {
        buyerUnread++;
      } else if (msg.sender.toString() === this.buyer.toString()) {
        sellerUnread++;
      }
    }
  });
  
  this.metadata.unreadCount.buyer = buyerUnread;
  this.metadata.unreadCount.seller = sellerUnread;
  
  next();
});

// Instance methods
chatSchema.methods.addMessage = function(senderId, message, messageType = 'TEXT', offerAmount = null) {
  const newMessage = {
    sender: senderId,
    message,
    messageType,
    offerAmount,
    timestamp: new Date(),
    isRead: false
  };
  
  this.messages.push(newMessage);
  this.metadata.lastActivity = new Date();
  
  return newMessage;
};

chatSchema.methods.markMessagesAsRead = function(userId) {
  let markedCount = 0;
  
  this.messages.forEach(msg => {
    if (!msg.isRead && msg.sender.toString() !== userId.toString()) {
      msg.isRead = true;
      markedCount++;
    }
  });
  
  return markedCount;
};

chatSchema.methods.makeOffer = function(userId, amount, expirationHours = 24) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expirationHours);
  
  this.currentOffer = {
    amount,
    offeredBy: userId,
    offeredAt: new Date(),
    status: 'PENDING',
    expiresAt,
    counterOffers: this.currentOffer ? this.currentOffer.counterOffers : []
  };
  
  // Add offer message
  const isBuyer = userId.toString() === this.buyer.toString();
  const offerMessage = `${isBuyer ? 'Buyer' : 'Seller'} offered ₹${amount.toLocaleString()}`;
  
  this.addMessage(userId, offerMessage, 'OFFER', amount);
  
  return this.currentOffer;
};

chatSchema.methods.makeCounterOffer = function(userId, amount) {
  if (!this.currentOffer || this.currentOffer.status !== 'PENDING') {
    throw new Error('No pending offer to counter');
  }
  
  // Add to counter offers history
  this.currentOffer.counterOffers.push({
    amount: this.currentOffer.amount,
    offeredBy: this.currentOffer.offeredBy,
    offeredAt: this.currentOffer.offeredAt
  });
  
  // Update current offer
  this.currentOffer.amount = amount;
  this.currentOffer.offeredBy = userId;
  this.currentOffer.offeredAt = new Date();
  this.currentOffer.status = 'PENDING';
  
  // Add counter offer message
  const isBuyer = userId.toString() === this.buyer.toString();
  const counterMessage = `${isBuyer ? 'Buyer' : 'Seller'} counter-offered ₹${amount.toLocaleString()}`;
  
  this.addMessage(userId, counterMessage, 'COUNTER_OFFER', amount);
  
  return this.currentOffer;
};

chatSchema.methods.acceptOffer = function(userId) {
  if (!this.currentOffer || this.currentOffer.status !== 'PENDING') {
    throw new Error('No pending offer to accept');
  }
  
  if (this.currentOffer.offeredBy.toString() === userId.toString()) {
    throw new Error('Cannot accept your own offer');
  }
  
  this.currentOffer.status = 'ACCEPTED';
  this.status = 'DEAL_AGREED';
  this.agreedPrice = this.currentOffer.amount;
  this.agreedDate = new Date();
  
  // Add acceptance message
  const isBuyer = userId.toString() === this.buyer.toString();
  const acceptMessage = `${isBuyer ? 'Buyer' : 'Seller'} accepted the offer of ₹${this.currentOffer.amount.toLocaleString()}`;
  
  this.addMessage(userId, acceptMessage, 'ACCEPTANCE');
  
  return this.currentOffer;
};

chatSchema.methods.rejectOffer = function(userId, reason = '') {
  if (!this.currentOffer || this.currentOffer.status !== 'PENDING') {
    throw new Error('No pending offer to reject');
  }
  
  if (this.currentOffer.offeredBy.toString() === userId.toString()) {
    throw new Error('Cannot reject your own offer');
  }
  
  this.currentOffer.status = 'REJECTED';
  
  // Add rejection message
  const isBuyer = userId.toString() === this.buyer.toString();
  const rejectMessage = `${isBuyer ? 'Buyer' : 'Seller'} rejected the offer${reason ? ': ' + reason : ''}`;
  
  this.addMessage(userId, rejectMessage, 'REJECTION');
  
  return this.currentOffer;
};

chatSchema.methods.canMakeOffer = function(userId) {
  return this.status === 'ACTIVE' && 
         (!this.currentOffer || this.currentOffer.status !== 'PENDING');
};

chatSchema.methods.canAcceptOffer = function(userId) {
  return this.currentOffer && 
         this.currentOffer.status === 'PENDING' && 
         this.currentOffer.offeredBy.toString() !== userId.toString();
};

chatSchema.methods.getUnreadCount = function(userId) {
  if (userId.toString() === this.buyer.toString()) {
    return this.metadata.unreadCount.buyer;
  } else if (userId.toString() === this.seller.toString()) {
    return this.metadata.unreadCount.seller;
  }
  return 0;
};

chatSchema.methods.isParticipant = function(userId) {
  return userId.toString() === this.buyer.toString() || 
         userId.toString() === this.seller.toString();
};

// Static methods
chatSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [{ buyer: userId }, { seller: userId }]
  }).populate('landId buyer seller');
};

chatSchema.statics.findByLand = function(landId) {
  return this.find({ landId }).populate('buyer seller');
};

chatSchema.statics.findActiveChats = function() {
  return this.find({ status: 'ACTIVE' }).populate('landId buyer seller');
};

chatSchema.statics.findDealsAgreed = function() {
  return this.find({ status: 'DEAL_AGREED' }).populate('landId buyer seller');
};

// Transform output
chatSchema.methods.toJSON = function() {
  const chat = this.toObject();
  
  // Add computed fields
  chat.hasUnreadMessages = this.metadata.unreadCount.buyer > 0 || this.metadata.unreadCount.seller > 0;
  chat.lastMessageTime = this.metadata.lastActivity;
  chat.messageCount = this.metadata.totalMessages;
  
  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);