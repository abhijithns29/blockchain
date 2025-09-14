const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  blockchainId: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  size: {
    type: Number,
    required: true
  },
  valuation: {
    type: Number,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'FOR_SALE', 'FOR_RENT', 'SOLD', 'RENTED'],
    default: 'AVAILABLE'
  },
  documents: [{
    name: String,
    ipfsHash: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  images: [{
    name: String,
    ipfsHash: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  metadata: {
    propertyType: String,
    yearBuilt: Number,
    amenities: [String],
    zoning: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  transactionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Property', propertySchema);