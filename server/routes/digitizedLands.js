const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const DigitizedLand = require('../models/DigitizedLand');
const User = require('../models/User');
const LandTransaction = require('../models/LandTransaction');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add land to Digitized Land DB (Admin only)
router.post('/add', adminAuth, upload.array('documents'), async (req, res) => {
  try {
    console.log('Adding land to Digitized Land DB...');
    console.log('Request body:', req.body);
    console.log('Files:', req.files?.length || 0);

    const {
      surveyNumber,
      subDivision,
      village,
      taluka,
      district,
      state,
      pincode,
      area,
      boundaries,
      landType,
      classification,
      ownerName,
      soilType,
      waterSource,
      roadAccess
    } = req.body;

    // Validate required fields
    if (!surveyNumber || !village || !taluka || !district || !state || !pincode || !landType) {
      return res.status(400).json({ 
        message: 'Missing required fields: surveyNumber, village, taluka, district, state, pincode, landType' 
      });
    }

    // Parse JSON strings if they exist
    let parsedArea = {};
    let parsedBoundaries = {};

    try {
      parsedArea = typeof area === 'string' ? JSON.parse(area) : area || {};
      parsedBoundaries = typeof boundaries === 'string' ? JSON.parse(boundaries) : boundaries || {};
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedArea = {};
      parsedBoundaries = {};
    }

    // Upload documents to IPFS
    const originalDocuments = [];
    if (req.files && req.files.length > 0) {
      console.log('Uploading documents to IPFS...');
      for (const file of req.files) {
        try {
          const ipfsHash = await ipfsService.uploadFile(file.buffer, file.originalname);
          originalDocuments.push({
            type: 'OTHER',
            documentNumber: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            issueDate: new Date(),
            issuingAuthority: 'Land Registry Office',
            documentUrl: ipfsService.getFileUrl(ipfsHash),
            ipfsHash
          });
          console.log('Document uploaded:', file.originalname);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }
    }

    // Create land record in Digitized Land DB
    const landData = {
      originalDocuments,
      landDetails: {
        surveyNumber: surveyNumber.trim(),
        subDivision: subDivision?.trim() || '',
        village: village.trim(),
        taluka: taluka.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        area: {
          acres: parseFloat(parsedArea.acres) || 0,
          guntas: parseFloat(parsedArea.guntas) || 0,
          sqft: parseFloat(parsedArea.sqft) || 0
        },
        boundaries: {
          north: parsedBoundaries.north || '',
          south: parsedBoundaries.south || '',
          east: parsedBoundaries.east || '',
          west: parsedBoundaries.west || ''
        },
        landType,
        classification: classification || undefined,
        soilType: soilType || '',
        waterSource: waterSource || '',
        roadAccess: roadAccess === 'true' || roadAccess === true
      },
      ownershipHistory: ownerName ? [{
        ownerName: ownerName.trim(),
        fromDate: new Date(),
        documentReference: 'INITIAL_RECORD',
        transferType: 'INITIAL'
      }] : [],
      addedBy: req.user._id,
      verificationStatus: 'PENDING',
      digitalDocument: {
        isDigitalized: false
      }
    };

    console.log('Creating land with data:', JSON.stringify(landData, null, 2));

    const land = new DigitizedLand(landData);
    await land.save();

    console.log('Land saved successfully with ID:', land.landId);

    res.status(201).json({
      message: 'Land added to Digitized Land DB successfully',
      land: {
        id: land._id,
        landId: land.landId,
        surveyNumber: land.landDetails.surveyNumber,
        village: land.landDetails.village,
        district: land.landDetails.district,
        state: land.landDetails.state,
        landType: land.landDetails.landType,
        isDigitalized: land.digitalDocument.isDigitalized
      }
    });
  } catch (error) {
    console.error('Add land error:', error);
    res.status(500).json({ 
      message: 'Failed to add land to Digitized Land DB',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all lands from Digitized Land DB (with filters)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      district, 
      state, 
      landType, 
      isForSale, 
      landId,
      village,
      verificationStatus,
      isDigitalized
    } = req.query;

    const query = {};
    if (district) query['landDetails.district'] = new RegExp(district, 'i');
    if (state) query['landDetails.state'] = new RegExp(state, 'i');
    if (village) query['landDetails.village'] = new RegExp(village, 'i');
    if (landType) query['landDetails.landType'] = landType;
    if (isForSale === 'true') query['marketInfo.isForSale'] = true;
    if (landId) query.landId = new RegExp(landId, 'i');
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (isDigitalized !== undefined) query['digitalDocument.isDigitalized'] = isDigitalized === 'true';

    const lands = await DigitizedLand.find(query)
      .populate('currentOwner', 'fullName email')
      .populate('addedBy', 'fullName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await DigitizedLand.countDocuments(query);

    res.json({
      lands,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get lands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search land by Land ID
router.get('/search/:landId', async (req, res) => {
  try {
    const { landId } = req.params;
    const land = await DigitizedLand.findByLandId(landId)
      .populate('currentOwner', 'fullName email walletAddress')
      .populate('addedBy', 'fullName')
      .populate('verifiedBy', 'fullName');

    if (!land) {
      return res.status(404).json({ message: 'Land not found with this Land ID' });
    }

    res.json({ land });
  } catch (error) {
    console.error('Search land error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Claim ownership (Verified users only)
router.post('/:landId/claim', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.canClaimLand()) {
      return res.status(403).json({ 
        message: 'User must be verified to claim land ownership. Please complete your verification first.' 
      });
    }

    const land = await DigitizedLand.findById(req.params.landId);
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (land.currentOwner) {
      return res.status(400).json({ message: 'Land already has an owner' });
    }

    if (!land.canBeClaimed()) {
      return res.status(400).json({ message: 'Land cannot be claimed at this time' });
    }

    // Update land ownership
    land.addOwnershipRecord(req.user._id, 'INITIAL', 'DIGITAL_CLAIM');
    await land.save();

    // Add to user's owned lands
    user.ownedLands.push(land._id);
    await user.save();

    await land.populate('currentOwner', 'fullName email');

    console.log(`Land ${land.landId} claimed by user ${user.email}`);

    res.json({
      message: 'Land ownership claimed successfully',
      land
    });
  } catch (error) {
    console.error('Claim ownership error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Digitalize land document (Admin only)
router.post('/:landId/digitalize', adminAuth, async (req, res) => {
  try {
    console.log('Digitalizing land:', req.params.landId);
    
    const land = await DigitizedLand.findById(req.params.landId)
      .populate('currentOwner', 'fullName email');

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (land.digitalDocument.isDigitalized) {
      return res.status(400).json({ message: 'Land is already digitalized' });
    }

    // Generate QR code
    const qrData = {
      landId: land.landId,
      owner: land.currentOwner?.fullName || 'Unassigned',
      verifyUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-land/${land.landId}`,
      digitalizedDate: new Date().toISOString()
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Generate digital ownership certificate
    const certificatePDF = await PDFGenerator.generateLandCertificate(land, qrCodeDataURL);
    const certificateHash = await ipfsService.uploadFile(
      Buffer.from(certificatePDF),
      `land-certificate-${land.landId}.pdf`
    );

    // Update land with digital document info
    land.digitalDocument = {
      qrCode: qrCodeDataURL,
      certificateUrl: ipfsService.getFileUrl(certificateHash),
      ipfsHash: certificateHash,
      generatedDate: new Date(),
      isDigitalized: true,
      digitalizedBy: req.user._id
    };
    land.verificationStatus = 'VERIFIED';
    land.verifiedBy = req.user._id;

    await land.save();

    console.log('Land digitalized successfully:', land.landId);

    res.json({
      message: 'Land digitalized successfully',
      digitalDocument: land.digitalDocument
    });
  } catch (error) {
    console.error('Digitalization error:', error);
    res.status(500).json({ 
      message: 'Failed to digitalize land document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// List land for sale (Owner only)
router.post('/:landId/list-for-sale', auth, async (req, res) => {
  try {
    const { askingPrice, description, features, nearbyAmenities } = req.body;
    const land = await DigitizedLand.findById(req.params.landId);

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (!land.currentOwner || land.currentOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can list this land for sale' });
    }

    if (!land.canBeListedForSale()) {
      return res.status(400).json({ 
        message: 'Land must be digitalized and verified before listing for sale.' 
      });
    }

    // Calculate price per sqft if area is available
    const totalAreaSqft = land.getTotalArea();
    let pricePerSqft = 0;
    if (totalAreaSqft > 0) {
      pricePerSqft = parseFloat(askingPrice) / totalAreaSqft;
    }

    land.marketInfo = {
      isForSale: true,
      askingPrice: parseFloat(askingPrice),
      pricePerSqft,
      listedDate: new Date(),
      description: description || '',
      features: features || [],
      nearbyAmenities: nearbyAmenities || [],
      images: []
    };

    await land.save();

    console.log(`Land ${land.landId} listed for sale by ${req.user.email}`);

    res.json({
      message: 'Land listed for sale successfully',
      land
    });
  } catch (error) {
    console.error('List for sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove land from sale (Owner only)
router.post('/:landId/remove-from-sale', auth, async (req, res) => {
  try {
    const land = await DigitizedLand.findById(req.params.landId);

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (!land.currentOwner || land.currentOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can remove this land from sale' });
    }

    land.marketInfo.isForSale = false;
    land.status = 'AVAILABLE';

    await land.save();

    console.log(`Land ${land.landId} removed from sale by ${req.user.email}`);

    res.json({
      message: 'Land removed from sale successfully',
      land
    });
  } catch (error) {
    console.error('Remove from sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's owned lands
router.get('/my-lands', auth, async (req, res) => {
  try {
    const lands = await DigitizedLand.findByOwner(req.user._id)
      .sort({ createdAt: -1 });

    res.json({ lands });
  } catch (error) {
    console.error('Get user lands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get lands for sale
router.get('/for-sale', async (req, res) => {
  try {
    const { page = 1, limit = 20, minPrice, maxPrice, district, state, landType } = req.query;
    
    const filters = {};
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (district) filters.district = district;
    if (state) filters.state = state;
    if (landType) filters.landType = landType;

    const lands = await DigitizedLand.findForSale(filters)
      .populate('currentOwner', 'fullName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'marketInfo.listedDate': -1 });

    const total = await DigitizedLand.countDocuments({
      'marketInfo.isForSale': true,
      status: 'FOR_SALE',
      'digitalDocument.isDigitalized': true
    });

    res.json({
      lands,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get lands for sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get land statistics (Admin only)
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    const stats = await DigitizedLand.getStatistics();
    
    res.json({
      statistics: stats[0] || {
        totalLands: 0,
        digitalizedLands: 0,
        landsForSale: 0,
        verifiedLands: 0
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search lands with text search
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const lands = await DigitizedLand.searchLands(q)
      .populate('currentOwner', 'fullName email')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      lands,
      query: q,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Search lands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;