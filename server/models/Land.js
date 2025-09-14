const mongoose = require('mongoose');

const landSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  surveyNumber: {
    type: String,
    required: true,
    trim: true
  },
  subDivision: {
    type: String,
    trim: true
  },
  village: {
    type: String,
    required: true,
    trim: true
  },
  taluka: {
    type: String,
    required: true,
    trim: true
  },
  district: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{6}$/, 'Please enter a valid 6-digit PIN code']
  },
  
  // Geographic information
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  
  area: {
    acres: { type: Number, default: 0, min: 0 },
    guntas: { type: Number, default: 0, min: 0 },
    sqft: { type: Number, default: 0, min: 0 }
  },
  
  boundaries: {
    north: String,
    south: String,
    east: String,
    west: String
  },
  
  landType: {
    type: String,
    enum: ['AGRICULTURAL', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'GOVERNMENT'],
    required: true
  },
  
  classification: {
    type: String,
    enum: ['DRY', 'WET', 'GARDEN', 'INAM', 'SARKAR']
  },
  
  // Ownership information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  ownershipHistory: [{
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ownerName: String,
    fromDate: { type: Date, default: Date.now },
    toDate: Date,
    documentReference: String,
    transactionType: {
      type: String,
      enum: ['INITIAL', 'SALE', 'INHERITANCE', 'GIFT', 'TRANSFER'],
      default: 'INITIAL'
    },
    transactionId: String
  }],
  
  // Original document (uploaded during land registration)
  originalDocument: {
    filename: String,
    hash: String,          // IPFS hash of the original uploaded doc
    url: String,           // Gateway URL for original doc
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  
  // Digital document (generated certificate)
  digitalDocument: {
    hash: String,          // IPFS hash of the digitalized certificate
    url: String,           // Gateway URL for the certificate
    digitalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    generatedAt: { type: Date, default: Date.now },
    isDigitalized: { type: Boolean, default: false }
  },
  
  // Market information
  marketInfo: {
    isForSale: { type: Boolean, default: false },
    askingPrice: { type: Number, min: 0 },
    pricePerSqft: { type: Number, min: 0 },
    listedDate: Date,
    description: { type: String, maxlength: 2000 },
    images: [String],
    features: [String],
    nearbyAmenities: [String],
    virtualTourUrl: String
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['AVAILABLE', 'FOR_SALE', 'UNDER_TRANSACTION', 'SOLD', 'DISPUTED'],
    default: 'AVAILABLE'
  },
  
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING'
  },
  
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Blockchain information
  blockchainTxHash: String,
  blockchainId: Number,
  
  // Escrow contract for transactions
  escrowContract: String,
  
  // Additional metadata
  metadata: {
    soilType: String,
    waterSource: String,
    roadAccess: { type: Boolean, default: false },
    electricityConnection: { type: Boolean, default: false },
    nearestLandmark: String,
    governmentSchemes: [String],
    legalStatus: {
      type: String,
      enum: ['CLEAR', 'DISPUTED', 'MORTGAGED', 'LEASED'],
      default: 'CLEAR'
    }
  },
  
  // Valuation history
  valuationHistory: [{
    value: Number,
    valuedBy: String,
    valuationDate: { type: Date, default: Date.now },
    method: String,
    notes: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
landSchema.index({ assetId: 1 });
landSchema.index({ village: 1, district: 1, state: 1 });
landSchema.index({ 'marketInfo.isForSale': 1 });
landSchema.index({ currentOwner: 1 });
landSchema.index({ verificationStatus: 1 });
landSchema.index({ status: 1 });
landSchema.index({ landType: 1 });
landSchema.index({ surveyNumber: 1 });
landSchema.index({ coordinates: '2dsphere' });

// Text search index
landSchema.index({
  assetId: 'text',
  village: 'text',
  district: 'text',
  surveyNumber: 'text',
  'marketInfo.description': 'text'
});

// Pre-save middleware
landSchema.pre('save', function(next) {
  // Generate asset ID if not provided
  if (!this.assetId && this.isNew) {
    const stateCode = this.state.substring(0, 2).toUpperCase();
    const districtCode = this.district.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.assetId = `${stateCode}${districtCode}${timestamp}${randomNum}`;
  }
  
  // Calculate price per sqft
  if (this.marketInfo.askingPrice && this.getTotalAreaSqft() > 0) {
    this.marketInfo.pricePerSqft = this.marketInfo.askingPrice / this.getTotalAreaSqft();
  }
  
  // Set listed date when marking for sale
  if (this.isModified('marketInfo.isForSale') && this.marketInfo.isForSale) {
    this.marketInfo.listedDate = new Date();
    this.status = 'FOR_SALE';
  }
  
  next();
});

// Instance methods
landSchema.methods.getTotalAreaSqft = function() {
  const acresInSqft = (this.area.acres || 0) * 43560;
  const guntasInSqft = (this.area.guntas || 0) * 1089;
  const sqft = this.area.sqft || 0;
  return acresInSqft + guntasInSqft + sqft;
};

landSchema.methods.canBeListedForSale = function() {
  return this.digitalDocument.isDigitalized && 
         this.verificationStatus === 'VERIFIED' && 
         this.currentOwner && 
         this.status === 'AVAILABLE';
};

landSchema.methods.addOwnershipRecord = function(newOwner, transactionType = 'SALE', transactionId = '') {
  // Close current ownership
  if (this.ownershipHistory.length > 0) {
    const currentRecord = this.ownershipHistory[this.ownershipHistory.length - 1];
    if (!currentRecord.toDate) {
      currentRecord.toDate = new Date();
    }
  }
  
  // Add new ownership record
  this.ownershipHistory.push({
    owner: newOwner,
    fromDate: new Date(),
    transactionType,
    transactionId
  });
  
  this.currentOwner = newOwner;
};

landSchema.methods.generateWatermark = function() {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(`${this.assetId}-${Date.now()}`).digest('hex');
};

// Static methods
landSchema.statics.findByAssetId = function(assetId) {
  return this.findOne({ assetId: assetId.toUpperCase() });
};

landSchema.statics.findByOwner = function(ownerId) {
  return this.find({ currentOwner: ownerId });
};

landSchema.statics.findForSale = function(filters = {}) {
  const query = { 
    'marketInfo.isForSale': true, 
    status: 'FOR_SALE',
    'digitalDocument.isDigitalized': true 
  };
  
  if (filters.minPrice) query['marketInfo.askingPrice'] = { $gte: filters.minPrice };
  if (filters.maxPrice) {
    query['marketInfo.askingPrice'] = { 
      ...query['marketInfo.askingPrice'], 
      $lte: filters.maxPrice 
    };
  }
  if (filters.landType) query.landType = filters.landType;
  if (filters.district) query.district = new RegExp(filters.district, 'i');
  if (filters.state) query.state = new RegExp(filters.state, 'i');
  
  return this.find(query);
};

landSchema.statics.findNearby = function(latitude, longitude, maxDistance = 10000) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistance
      }
    }
  });
};

module.exports = mongoose.model('Land', landSchema);