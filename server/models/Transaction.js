const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  blockchainTransactionId: {
    type: Number,
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionType: {
    type: String,
    enum: ['REGISTRATION', 'SALE', 'RENT', 'TRANSFER'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  certificateHash: String,
  certificateUrl: String,
  blockchainTxHash: String,
  metadata: {
    description: String,
    terms: String,
    duration: Number // for rent transactions
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);