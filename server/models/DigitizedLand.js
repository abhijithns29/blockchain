const mongoose = require('mongoose');

const digitizedLandSchema = new mongoose.Schema({
  // Unique identifier for the land
  landId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Original paper documents information
  originalDocuments: [{
    type: {
      type: String,
      enum: ['SALE_DEED', 'PATTA', 'KHATA', 'SURVEY_SETTLEMENT', 'MUTATION', 'TITLE_DEED', 'OTHER'],
      required: true
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true
    },
    issueDate: {
      type: Date,
      required: true
    },
    issuingAuthority: {
      type: String,
      required: true,
      trim: true
    },
    documentUrl: {
      type: String,
      required: true
    },
    ipfsHash: {
      type: String,
      required: true
    },
    uploadedDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Digital document information
  digitalDocument: {
    certificateUrl: String,
    qrCode: String, // Base64 encoded QR code
    ipfsHash: String,
    generatedDate: Date,
    isDigitalized: {
      type: Boolean,
      default: false
    },
    digitalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Current ownership
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for unassigned lands
  },
  
  // Ownership history
  ownershipHistory: [{
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ownerName: {
      type: String,
      trim: true
    },
    fromDate: {
      type: Date,
      default: Date.now
    },
    toDate: Date,
    documentReference: {
      type: String,
      trim: true
    },
    transferType: {
      type: String,
      enum: ['INITIAL', 'SALE', 'INHERITANCE', 'GIFT', 'COURT_ORDER', 'OTHER'],
      default: 'INITIAL'
    }
  }],
  
  // Land details
  landDetails: {
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
      match: /^[0-9]{6}$/
    },
    area: {
      acres: {
        type: Number,
        min: 0,
        default: 0
      },
      guntas: {
        type: Number,
        min: 0,
        default: 0
      },
      sqft: {
        type: Number,
        min: 0,
        default: 0
      }
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
    soilType: String,
    waterSource: String,
    roadAccess: {
      type: Boolean,
      default: false
    }
  },
  
  // Market information
  marketInfo: {
    isForSale: {
      type: Boolean,
      default: false
    },
    askingPrice: {
      type: Number,
      min: 0
    },
    pricePerSqft: {
      type: Number,
      min: 0
    },
    listedDate: Date,
    description: {
      type: String,
      maxlength: 1000
    },
    images: [String], // URLs to images
    features: [String], // Special features
    nearbyAmenities: [String]
  },
  
  // Status and verification
  status: {
    type: String,
    enum: ['AVAILABLE', 'FOR_SALE', 'UNDER_TRANSACTION', 'SOLD', 'DISPUTED', 'BLOCKED'],
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
  
  verificationDate: Date,
  
  rejectionReason: String,
  
  // Administrative information
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Blockchain information
  blockchainTxHash: String,
  blockchainId: Number,
  
  // Additional metadata
  notes: {
    type: String,
    maxlength: 2000
  },
  
  tags: [String], // For categorization and search
  
  // Legal status
  legalStatus: {
    type: String,
    enum: ['CLEAR', 'DISPUTED', 'MORTGAGED', 'LEASED', 'UNDER_LITIGATION'],
    default: 'CLEAR'
  },
  
  // Valuation information
  valuation: {
    marketValue: Number,
    governmentValue: Number,
    lastValuationDate: Date,
    valuedBy: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
digitizedLandSchema.index({ landId: 1 });
digitizedLandSchema.index({ currentOwner: 1 });
digitizedLandSchema.index({ 'landDetails.village': 1, 'landDetails.district': 1, 'landDetails.state': 1 });
digitizedLandSchema.index({ 'marketInfo.isForSale': 1 });
digitizedLandSchema.index({ verificationStatus: 1 });
digitizedLandSchema.index({ status: 1 });
digitizedLandSchema.index({ 'landDetails.landType': 1 });
digitizedLandSchema.index({ 'landDetails.surveyNumber': 1 });

// Text index for search functionality
digitizedLandSchema.index({
  landId: 'text',
  'landDetails.village': 'text',
  'landDetails.district': 'text',
  'landDetails.surveyNumber': 'text',
  'marketInfo.description': 'text'
});

// Pre-save middleware
digitizedLandSchema.pre('save', function(next) {
  // Generate landId if not provided
  if (!this.landId && this.isNew) {
    const stateCode = this.landDetails.state.substring(0, 2).toUpperCase();
    const districtCode = this.landDetails.district.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.landId = `${stateCode}${districtCode}${timestamp}${randomNum}`;
  }
  
  // Calculate price per sqft if asking price and area are available
  if (this.marketInfo.askingPrice && this.landDetails.area.sqft > 0) {
    this.marketInfo.pricePerSqft = this.marketInfo.askingPrice / this.landDetails.area.sqft;
  }
  
  // Set listed date when marking for sale
  if (this.isModified('marketInfo.isForSale') && this.marketInfo.isForSale) {
    this.marketInfo.listedDate = new Date();
    this.status = 'FOR_SALE';
  }
  
  // Update status when not for sale
  if (this.isModified('marketInfo.isForSale') && !this.marketInfo.isForSale && this.status === 'FOR_SALE') {
    this.status = 'AVAILABLE';
  }
  
  next();
});

// Instance methods
digitizedLandSchema.methods.canBeListedForSale = function() {
  return this.digitalDocument.isDigitalized && 
         this.verificationStatus === 'VERIFIED' && 
         this.currentOwner && 
         this.status === 'AVAILABLE';
};

digitizedLandSchema.methods.canBeClaimed = function() {
  return !this.currentOwner && this.verificationStatus === 'VERIFIED';
};

digitizedLandSchema.methods.addOwnershipRecord = function(newOwner, transferType = 'SALE', documentRef = '') {
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
    documentReference: documentRef,
    transferType: transferType
  });
  
  // Update current owner
  this.currentOwner = newOwner;
};

digitizedLandSchema.methods.getOwnershipDuration = function() {
  if (!this.currentOwner || this.ownershipHistory.length === 0) return 0;
  
  const currentRecord = this.ownershipHistory[this.ownershipHistory.length - 1];
  const startDate = currentRecord.fromDate;
  const endDate = currentRecord.toDate || new Date();
  
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); // Days
};

digitizedLandSchema.methods.getTotalArea = function() {
  const area = this.landDetails.area;
  // Convert everything to square feet for consistency
  const acresInSqft = (area.acres || 0) * 43560;
  const guntasInSqft = (area.guntas || 0) * 1089; // 1 gunta = 1089 sqft
  const sqft = area.sqft || 0;
  
  return acresInSqft + guntasInSqft + sqft;
};

// Static methods
digitizedLandSchema.statics.findByLandId = function(landId) {
  return this.findOne({ landId: landId.toUpperCase() });
};

digitizedLandSchema.statics.findByOwner = function(ownerId) {
  return this.find({ currentOwner: ownerId });
};

digitizedLandSchema.statics.findForSale = function(filters = {}) {
  const query = { 'marketInfo.isForSale': true, status: 'FOR_SALE' };
  
  if (filters.minPrice) query['marketInfo.askingPrice'] = { $gte: filters.minPrice };
  if (filters.maxPrice) {
    query['marketInfo.askingPrice'] = { 
      ...query['marketInfo.askingPrice'], 
      $lte: filters.maxPrice 
    };
  }
  if (filters.landType) query['landDetails.landType'] = filters.landType;
  if (filters.district) query['landDetails.district'] = new RegExp(filters.district, 'i');
  if (filters.state) query['landDetails.state'] = new RegExp(filters.state, 'i');
  
  return this.find(query);
};

digitizedLandSchema.statics.searchLands = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' }
  });
};

digitizedLandSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalLands: { $sum: 1 },
        digitalizedLands: {
          $sum: { $cond: ['$digitalDocument.isDigitalized', 1, 0] }
        },
        landsForSale: {
          $sum: { $cond: ['$marketInfo.isForSale', 1, 0] }
        },
        verifiedLands: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'VERIFIED'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Transform output
digitizedLandSchema.methods.toJSON = function() {
  const land = this.toObject();
  
  // Add computed fields
  land.totalAreaSqft = this.getTotalArea();
  land.ownershipDuration = this.getOwnershipDuration();
  land.canBeListed = this.canBeListedForSale();
  land.canBeClaimed = this.canBeClaimed();
  
  return land;
};

module.exports = mongoose.model('DigitizedLand', digitizedLandSchema);