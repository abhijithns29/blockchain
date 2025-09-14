const express = require('express');
const multer = require('multer');
const Property = require('../models/Property');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth, adminAuth } = require('../middleware/auth');
const blockchainService = require('../config/blockchain');
const ipfsService = require('../config/ipfs');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Get all properties
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, city } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (city) query['location.city'] = new RegExp(city, 'i');

    const properties = await Property.find(query)
      .populate('owner', 'fullName email walletAddress')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Property.countDocuments(query);

    res.json({
      properties,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'fullName email walletAddress')
      .populate('transactionHistory');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ property });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register new property (Admin only)
router.post('/register', adminAuth, upload.array('files'), async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      size,
      valuation,
      ownerId,
      metadata
    } = req.body;

    // Upload files to IPFS
    const documents = [];
    const images = [];
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ipfsHash = await ipfsService.uploadFile(file.buffer, file.originalname);
        
        const fileData = {
          name: file.originalname,
          ipfsHash,
          uploadDate: new Date()
        };

        if (file.mimetype.startsWith('image/')) {
          images.push(fileData);
        } else {
          documents.push(fileData);
        }
      }
    }

    // Create property metadata for IPFS
    const propertyMetadata = {
      title,
      description,
      location: JSON.parse(location),
      size: parseInt(size),
      valuation: parseFloat(valuation),
      documents,
      images,
      metadata: JSON.parse(metadata || '{}'),
      registrationDate: new Date()
    };

    const ipfsHash = await ipfsService.uploadJSON(propertyMetadata);

    // Register property on blockchain
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    let blockchainId = 0;
    let blockchainTxHash = null;

    try {
      const blockchainTx = await blockchainService.registerProperty(
        owner.walletAddress,
        ipfsHash,
        `${propertyMetadata.location.address}, ${propertyMetadata.location.city}`,
        parseInt(size),
        parseFloat(valuation)
      );

      // Get the property ID from blockchain event
      const propertyRegisteredEvent = blockchainTx.events?.find(
        event => event.event === 'PropertyRegistered'
      );
      
      if (propertyRegisteredEvent) {
        blockchainId = propertyRegisteredEvent.args.propertyId.toNumber();
      } else {
        // Fallback: get current property counter
        const contractInfo = await blockchainService.getContractInfo();
        blockchainId = contractInfo.propertyCounter;
      }
      
      blockchainTxHash = blockchainTx.transactionHash;
    } catch (blockchainError) {
      console.error('Blockchain registration failed:', blockchainError);
      // Continue with database registration even if blockchain fails
      blockchainId = Date.now(); // Use timestamp as fallback ID
    }

    // Create property in database
    const property = new Property({
      ...propertyMetadata,
      blockchainId,
      owner: ownerId,
      documents,
      images,
      isVerified: true
    });

    await property.save();

    // Add property to user's owned properties
    owner.ownedProperties.push(property._id);
    await owner.save();

    res.status(201).json({
      message: 'Property registered successfully',
      property,
      blockchainTxHash
    });
  } catch (error) {
    console.error('Property registration error:', error);
    res.status(500).json({ message: 'Server error during property registration' });
  }
});

// List property for sale/rent
router.post('/:id/list', auth, async (req, res) => {
  try {
    const { listingType, price, terms } = req.body;
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to list this property' });
    }

    // Update property status
    property.status = listingType === 'SALE' ? 'FOR_SALE' : 'FOR_RENT';
    await property.save();

    res.json({
      message: `Property listed for ${listingType.toLowerCase()} successfully`,
      property
    });
  } catch (error) {
    console.error('List property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's properties
router.get('/user/owned', auth, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id })
      .populate('transactionHistory')
      .sort({ createdAt: -1 });

    res.json({ properties });
  } catch (error) {
    console.error('Get user properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;