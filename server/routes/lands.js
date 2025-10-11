const express = require("express");
const QRCode = require("qrcode");
const fs = require("fs");
const Land = require("../models/Land");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { auth, adminAuth } = require("../middleware/auth");
const { upload, uploadToGridFS } = require("../config/gridfs");
const PDFGenerator = require("../utils/pdfGenerator");
const DocumentWatermark = require("../utils/documentWatermark");
const ipfsService = require("../config/ipfs");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const router = express.Router();

// Add land to database (Admin only)
router.post("/add", adminAuth, upload.single("document"), async (req, res) => {
  try {
    console.log("=== ADDING LAND TO DATABASE ===");
    console.log("Request body:", req.body);
    console.log("File received:", req.file ? req.file.filename : "None");
    console.log("User making request:", req.user ? req.user._id : "No user");
    console.log("Processing step 1: Request validation");

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
      ownerId,
      coordinates,
      soilType,
      waterSource,
      roadAccess,
      electricityConnection,
    } = req.body;

    console.log("Processing step 2: Field extraction completed");
    
    // Validate required fields
    console.log("Processing step 3: Validating required fields");
    const requiredFields = {
      surveyNumber,
      village,
      taluka,
      district,
      state,
      pincode,
      landType,
      ownerId,
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === "")
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    console.log("Processing step 4: Required fields validation passed");
    
    // Validate owner exists
    console.log("Processing step 5: Validating owner exists");
    const owner = await User.findById(ownerId);
    if (!owner) {
      console.log("❌ Owner validation failed: user not found");
      return res.status(400).json({ error: "Invalid ownerId: user not found" });
    }
    console.log("✅ Owner validation passed:", owner.fullName);

    // Parse JSON strings safely
    let parsedArea = {};
    let parsedBoundaries = {};
    let parsedCoordinates = null;

    try {
      parsedArea = area
        ? typeof area === "string"
          ? JSON.parse(area)
          : area
        : {};
      parsedBoundaries = boundaries
        ? typeof boundaries === "string"
          ? JSON.parse(boundaries)
          : boundaries
        : {};
      parsedCoordinates = coordinates
        ? typeof coordinates === "string"
          ? JSON.parse(coordinates)
          : coordinates
        : null;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return res.status(400).json({
        message:
          "Invalid JSON format in area, boundaries, or coordinates fields",
      });
    }

    // Upload document to IPFS with watermark
    let originalDocument = null;
    if (req.file) {
      console.log("Processing and uploading original document...");
      console.log("File details:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      try {
        // Generate watermark
        const watermarkText = DocumentWatermark.generateWatermarkText(
          "PENDING", // Asset ID will be generated
          owner?.fullName || "Unknown"
        );

        // Read the file from disk
        const fileBuffer = fs.readFileSync(req.file.path);

        let processedBuffer;
        if (req.file.mimetype === "application/pdf") {
          processedBuffer = await DocumentWatermark.addWatermarkToPDF(
            fileBuffer,
            watermarkText
          );
        } else {
          processedBuffer = await DocumentWatermark.addWatermarkToImage(
            fileBuffer,
            watermarkText
          );
        }

        const ipfsHash = await ipfsService.uploadFile(
          processedBuffer,
          req.file.originalname
        );

        originalDocument = {
          filename: req.file.originalname,
          hash: ipfsHash,
          url: ipfsService.getFileUrl(ipfsHash),
          uploadedAt: new Date(),
          uploadedBy: req.user._id,
        };

        console.log(
          `✅ Original document processed and uploaded: ${req.file.originalname}, IPFS Hash: ${ipfsHash}`
        );

        // Clean up the temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error("Document upload error:", uploadError);
        // Clean up the temporary file if it exists
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.error("Failed to clean up temporary file:", cleanupError);
          }
        }
        
        // Provide more specific error messages
        let errorMessage = "Failed to upload document";
        if (uploadError.message.includes("IPFS")) {
          errorMessage = "Failed to upload document to IPFS. Please check your internet connection and try again.";
        } else if (uploadError.message.includes("watermark")) {
          errorMessage = "Failed to process document watermark. Please ensure the file is a valid PDF or image.";
        } else if (uploadError.message.includes("file format")) {
          errorMessage = "Unsupported file format. Please upload a PDF, JPEG, or PNG file.";
        } else {
          errorMessage = `Failed to upload document: ${uploadError.message}`;
        }
        
        return res.status(500).json({
          message: errorMessage,
          error: process.env.NODE_ENV === "development" ? uploadError.message : undefined,
        });
      }
    }

    // Create land record
    console.log("Creating land record with processed data...");
    const landData = {
      surveyNumber: surveyNumber.trim(),
      subDivision: subDivision?.trim() || "",
      village: village.trim(),
      taluka: taluka.trim(),
      district: district.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      area: {
        acres: parseFloat(parsedArea.acres) || 0,
        guntas: parseFloat(parsedArea.guntas) || 0,
        sqft: parseFloat(parsedArea.sqft) || 0,
      },
      boundaries: {
        north: parsedBoundaries.north || "",
        south: parsedBoundaries.south || "",
        east: parsedBoundaries.east || "",
        west: parsedBoundaries.west || "",
      },
      coordinates: parsedCoordinates
        ? {
            latitude: parseFloat(parsedCoordinates.latitude),
            longitude: parseFloat(parsedCoordinates.longitude),
          }
        : undefined,
      landType,
      classification: classification || undefined,
      originalDocument,
      owner: ownerId,
      currentOwner: ownerId,
      ownershipHistory: [
        {
          owner: ownerId,
          fromDate: new Date(),
          documentReference: "INITIAL_RECORD",
          transactionType: "INITIAL",
        },
      ],
      addedBy: req.user._id,
      verificationStatus: "PENDING",
      metadata: {
        soilType: soilType || "",
        waterSource: waterSource || "",
        roadAccess: roadAccess === "true" || roadAccess === true,
        electricityConnection:
          electricityConnection === "true" || electricityConnection === true,
      },
    };

    // Generate and assign assetId
    landData.assetId = uuidv4();

    console.log("Creating land with processed data...");
    const savedLand = await new Land(landData).save();

    console.log(
      `✅ Land successfully added with Asset ID: ${savedLand.assetId}`
    );

    // Call digitalization with the saved document's _id
    console.log("=== DIGITALIZING LAND DOCUMENT ===");
    console.log("Land ID:", savedLand._id);

    // await digitalizeLandDocuments(savedLand._id, req.user._id);

    res.status(201).json({
      success: true,
      message: "Land added to database successfully",
      land: {
        id: savedLand._id,
        assetId: savedLand.assetId,
        surveyNumber: savedLand.surveyNumber,
        village: savedLand.village,
        district: savedLand.district,
        state: savedLand.state,
        landType: savedLand.landType,
        documentsUploaded: originalDocument ? 1 : 0,
      },
    });
  } catch (error) {
    console.error("❌ Add land error:", error);

    // Log failed attempt
    try {
      await AuditLog.logAction(
        "LAND_ADD",
        req.user._id,
        "LAND",
        "FAILED",
        { error: error.message },
        req
      );
    } catch (auditError) {
      console.error("Audit log error:", auditError);
    }

    res.status(500).json({
      success: false,
      message: "Failed to add land to database",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Digitalize land document (Admin only)
router.post("/digitalize", adminAuth, async (req, res) => {
  try {
    const { landId } = req.body;
    console.log("Digitalizing land with ID:", landId);

    if (!landId) {
      return res.status(400).json({ error: "landId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(landId)) {
      return res.status(400).json({ error: "Invalid landId format" });
    }

    const land = await Land.findById(landId).populate(
      "currentOwner",
      "fullName email verificationDocuments verificationStatus"
    );

    if (!land) {
      return res.status(404).json({ error: "Land not found" });
    }

    if (land.digitalDocument.isDigitalized) {
      return res.status(400).json({ error: "Land is already digitalized" });
    }

    // Generate QR code with verification data
    const qrData = {
      assetId: land.assetId,
      owner: land.currentOwner?.fullName || "Unassigned",
      verifyUrl: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/verify-land/${land.assetId}`,
      digitalizedDate: new Date().toISOString(),
      digitalizedBy: req.user.fullName,
    };

    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Generate watermark
    const watermarkText = DocumentWatermark.generateWatermarkText(
      land.assetId,
      land.currentOwner?.fullName || "Government Land"
    );

    // Generate digital ownership certificate
    console.log("Generating certificate PDF...");
    let certificatePDF;
    try {
      certificatePDF = await PDFGenerator.generateLandCertificate(
        land,
        qrCodeDataURL
      );
      console.log("Certificate PDF generated, size:", certificatePDF.length);
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError);
      throw new Error(`Failed to generate certificate PDF: ${pdfError.message}`);
    }
    
    console.log("Skipping watermark for testing...");
    let watermarkedPDF = certificatePDF; // Skip watermark for now
    console.log("Using PDF without watermark, size:", watermarkedPDF.length);

    console.log("Uploading certificate to IPFS...");
    let certificateHash;
    try {
      certificateHash = await ipfsService.uploadFile(
        watermarkedPDF,
        `land-certificate-${land.assetId}.pdf`
      );
      console.log("Certificate uploaded to IPFS, hash:", certificateHash);
    } catch (ipfsError) {
      console.error("IPFS upload error:", ipfsError);
      throw new Error(`Failed to upload certificate to IPFS: ${ipfsError.message}`);
    }

    // Update land with digital document info
    land.digitalDocument = {
      hash: certificateHash,
      url: ipfsService.getFileUrl(certificateHash),
      digitalizedBy: req.user._id,
      verifiedBy: req.user._id,
      generatedAt: new Date(),
      isDigitalized: true,
    };

    land.verificationStatus = "VERIFIED";
    land.verifiedBy = req.user._id;

    await land.save();

    // Log audit trail
    await AuditLog.logAction(
      "LAND_DIGITALIZE",
      req.user._id,
      "LAND",
      land._id.toString(),
      {
        assetId: land.assetId,
        certificateGenerated: true,
        qrCodeGenerated: true,
      },
      req
    );

    console.log(`✅ Land digitalized successfully: ${land.assetId}`);

    res.json({
      success: true,
      message: "Land digitalized successfully",
      digitalDocument: {
        url: land.digitalDocument.url,
        hash: land.digitalDocument.hash,
        isDigitalized: land.digitalDocument.isDigitalized,
        generatedAt: land.digitalDocument.generatedAt,
      },
    });
  } catch (error) {
    console.error("❌ Digitalization error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to digitalize land document",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Get all lands with advanced filtering (Admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      district,
      state,
      landType,
      isForSale,
      assetId,
      village,
      verificationStatus,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};
    if (district) query.district = new RegExp(district, "i");
    if (state) query.state = new RegExp(state, "i");
    if (village) query.village = new RegExp(village, "i");
    if (landType) query.landType = landType;
    if (isForSale === "true") query["marketInfo.isForSale"] = true;
    if (assetId) query.assetId = new RegExp(assetId, "i");
    if (verificationStatus) query.verificationStatus = verificationStatus;

    // Price filters
    if (minPrice || maxPrice) {
      query["marketInfo.askingPrice"] = {};
      if (minPrice) query["marketInfo.askingPrice"].$gte = parseFloat(minPrice);
      if (maxPrice) query["marketInfo.askingPrice"].$lte = parseFloat(maxPrice);
    }

    // Area filters (convert to sqft for comparison)
    if (minArea || maxArea) {
      // This would require a more complex aggregation pipeline
      // For now, we'll filter by acres
      if (minArea) query["area.acres"] = { $gte: parseFloat(minArea) };
      if (maxArea) {
        query["area.acres"] = {
          ...query["area.acres"],
          $lte: parseFloat(maxArea),
        };
      }
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    const lands = await Land.find(query)
      .populate("currentOwner", "fullName email")
      .populate("addedBy", "fullName")
      .populate("verifiedBy", "fullName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortObj);

    const total = await Land.countDocuments(query);

    res.json({
      success: true,
      lands,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: {
        district,
        state,
        landType,
        isForSale,
        verificationStatus,
      },
    });
  } catch (error) {
    console.error("Get lands error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lands",
    });
  }
});

// Get land by ID with populated details
router.get("/land/:id", async (req, res) => {
  try {
    const land = await Land.findById(req.params.id)
      .populate("owner", "name email fullName") // fetch owner details
      .populate("currentOwner", "name email fullName") // fetch current owner details
      .populate("digitalDocument.digitalizedBy", "name email fullName") // fetch user who digitalized
      .populate("digitalDocument.verifiedBy", "name email fullName"); // fetch verifier

    if (!land) {
      return res.status(404).json({ error: "Land not found" });
    }

    res.json(land);
  } catch (error) {
    console.error("Error fetching land details:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Search land by asset ID
router.get("/search/:assetId", async (req, res) => {
  try {
    const { assetId } = req.params;

    if (!assetId || assetId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Asset ID is required",
      });
    }

    // Use findOne if findByAssetId is not defined
    const land = await Land.findOne({ assetId: assetId.trim() })
      .populate("currentOwner", "fullName email walletAddress")
      .populate("addedBy", "fullName")
      .populate("verifiedBy", "fullName")
      .populate("ownershipHistory.owner", "fullName");

    if (!land) {
      return res.status(404).json({
        success: false,
        message: "Land not found with this Asset ID",
      });
    }

    res.json({
      success: true,
      land,
    });
  } catch (error) {
    console.error("Search land error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
});

// Claim ownership (Verified users only)
router.post("/:landId/claim", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.canClaimLand()) {
      return res.status(403).json({
        success: false,
        message:
          "User must be verified to claim land ownership. Please complete your verification first.",
      });
    }

    const land = await Land.findById(req.params.landId);
    if (!land) {
      return res.status(404).json({
        success: false,
        message: "Land not found",
      });
    }

    if (land.currentOwner) {
      return res.status(400).json({
        success: false,
        message: "Land already has an owner",
      });
    }

    if (land.verificationStatus !== "VERIFIED") {
      return res.status(400).json({
        success: false,
        message: "Land must be verified before claiming ownership",
      });
    }

    // Update land ownership
    land.addOwnershipRecord(req.user._id, "INITIAL", "DIGITAL_CLAIM");
    await land.save();

    // Add to user's owned lands
    user.ownedLands.push(land._id);
    await user.save();

    // Log audit trail
    await AuditLog.logAction(
      "LAND_CLAIM",
      req.user._id,
      "LAND",
      land._id.toString(),
      {
        assetId: land.assetId,
        claimedBy: user.fullName,
      },
      req
    );

    await land.populate("currentOwner", "fullName email");

    console.log(`✅ Land ${land.assetId} claimed by user ${user.email}`);

    res.json({
      success: true,
      message: "Land ownership claimed successfully",
      land,
    });
  } catch (error) {
    console.error("Claim ownership error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to claim ownership",
    });
  }
});

// List land for sale (Owner only)
// Enhanced list-for-sale route with image upload support
router.post(
  "/:landId/list-for-sale",
  auth,
  upload.array("images", 7), // Allow up to 7 images as per frontend
  async (req, res) => {
    try {
      console.log("📝 List for sale request received:", {
        landId: req.params.landId,
        body: req.body,
        files: req.files ? req.files.length : 0,
      });

      const { askingPrice, description, features, nearbyAmenities } = req.body;

      if (!askingPrice || askingPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid asking price is required",
        });
      }

      const land = await Land.findById(req.params.landId);
      if (!land) {
        return res.status(404).json({
          success: false,
          message: "Land not found",
        });
      }

      if (
        !land.currentOwner ||
        land.currentOwner.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can list this land for sale",
        });
      }

      // Only call canBeListedForSale if it exists
      if (
        typeof land.canBeListedForSale === "function" &&
        !land.canBeListedForSale()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Land must be digitalized and verified before listing for sale",
        });
      }

      // Parse features and amenities if they're JSON strings
      let parsedFeatures = [];
      let parsedAmenities = [];

      try {
        if (features) {
          parsedFeatures =
            typeof features === "string" ? JSON.parse(features) : features;
        }
        if (nearbyAmenities) {
          parsedAmenities =
            typeof nearbyAmenities === "string"
              ? JSON.parse(nearbyAmenities)
              : nearbyAmenities;
        }
      } catch (parseError) {
        console.log(
          "⚠️ Could not parse features/amenities as JSON, using as strings"
        );
        parsedFeatures = features ? [features] : [];
        parsedAmenities = nearbyAmenities ? [nearbyAmenities] : [];
      }

      // Handle image uploads to GridFS
      const imageFilenames = [];
      if (req.files && req.files.length > 0) {
        console.log(
          `📸 Processing ${req.files.length} images for land ${land.assetId}`
        );
        for (const file of req.files) {
          try {
            // Upload to GridFS
            const gridfsFilename = await uploadToGridFS(
              file.path,
              file.filename
            );
            imageFilenames.push(gridfsFilename);

            // Clean up temporary file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (uploadError) {
            console.error(
              `❌ Failed to upload image ${file.originalname}:`,
              uploadError
            );
            // Clean up temporary file on error
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }
      }

      // Calculate price per sqft
      const totalAreaSqft = land.getTotalAreaSqft ? land.getTotalAreaSqft() : 0;
      let pricePerSqft = 0;
      if (totalAreaSqft > 0) {
        pricePerSqft = parseFloat(askingPrice) / totalAreaSqft;
      }

      land.marketInfo = {
        isForSale: true,
        askingPrice: parseFloat(askingPrice),
        pricePerSqft,
        listedDate: new Date(),
        description: description || "",
        features: parsedFeatures,
        nearbyAmenities: parsedAmenities,
        images: imageFilenames,
      };

      await land.save();

      // Log audit trail
      await AuditLog.logAction(
        "LAND_LIST_SALE",
        req.user._id,
        "LAND",
        land._id.toString(),
        {
          assetId: land.assetId,
          askingPrice: parseFloat(askingPrice),
          imageCount: imageFilenames.length,
        },
        req
      );

      console.log(
        `✅ Land ${land.assetId} listed for sale with ${imageFilenames.length} images`
      );

      res.json({
        success: true,
        message: "Land listed for sale successfully",
        land,
      });
    } catch (error) {
      console.error("List for sale error:", error);

      // Clean up any uploaded files if there was an error
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to list land for sale",
      });
    }
  }
);

// Get user's owned lands
router.get("/my-lands", auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      isForSale,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query for user's owned lands
    const query = {
      currentOwner: req.user._id,
    };

    // Add filters
    if (status) query.status = status;
    if (isForSale !== undefined) {
      query["marketInfo.isForSale"] = isForSale === "true";
    }

    // Build sort object
    const sortObj = {};
    if (sortBy === "price") {
      sortObj["marketInfo.askingPrice"] = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "area") {
      sortObj["area.acres"] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const lands = await Land.find(query)
      .populate("currentOwner", "fullName email")
      .populate("addedBy", "fullName")
      .populate("verifiedBy", "fullName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortObj);

    const total = await Land.countDocuments(query);

    res.json({
      success: true,
      lands,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get user lands error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your lands",
    });
  }
});

// Get marketplace lands (lands for sale)
router.get("/marketplace", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      minPrice,
      maxPrice,
      district,
      state,
      landType,
      minArea,
      maxArea,
      sortBy = "listedDate",
      sortOrder = "desc",
    } = req.query;

    // Build query for lands that are for sale
    const query = {
      "marketInfo.isForSale": true,
      status: "FOR_SALE",
      "digitalDocument.isDigitalized": true,
    };

    // Add filters
    if (district) query.district = new RegExp(district, "i");
    if (state) query.state = new RegExp(state, "i");
    if (landType) query.landType = landType;

    // Price filters
    if (minPrice || maxPrice) {
      query["marketInfo.askingPrice"] = {};
      if (minPrice) query["marketInfo.askingPrice"].$gte = parseFloat(minPrice);
      if (maxPrice) query["marketInfo.askingPrice"].$lte = parseFloat(maxPrice);
    }

    // Area filters
    if (minArea || maxArea) {
      query["area.acres"] = {};
      if (minArea) query["area.acres"].$gte = parseFloat(minArea);
      if (maxArea) query["area.acres"].$lte = parseFloat(maxArea);
    }

    // Build sort object
    const sortObj = {};
    if (sortBy === "price") {
      sortObj["marketInfo.askingPrice"] = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "area") {
      sortObj["area.acres"] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortObj["marketInfo.listedDate"] = sortOrder === "desc" ? -1 : 1;
    }

    const lands = await Land.find(query)
      .populate("currentOwner", "fullName email")
      .populate("addedBy", "fullName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortObj);

    const total = await Land.countDocuments(query);

    res.json({
      success: true,
      lands,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get marketplace lands error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace lands",
    });
  }
});

// Get lands for sale with advanced filters (legacy endpoint)
router.get("/for-sale", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      minPrice,
      maxPrice,
      district,
      state,
      landType,
      minArea,
      maxArea,
      sortBy = "listedDate",
      sortOrder = "desc",
    } = req.query;

    const filters = {};
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (district) filters.district = district;
    if (state) filters.state = state;
    if (landType) filters.landType = landType;

    let query = Land.findForSale(filters)
      .populate("currentOwner", "fullName email")
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply sorting
    const sortObj = {};
    if (sortBy === "price") {
      sortObj["marketInfo.askingPrice"] = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "area") {
      sortObj["area.acres"] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortObj["marketInfo.listedDate"] = sortOrder === "desc" ? -1 : 1;
    }

    query = query.sort(sortObj);
    const lands = await query;

    const total = await Land.countDocuments({
      "marketInfo.isForSale": true,
      status: "FOR_SALE",
      "digitalDocument.isDigitalized": true,
      ...filters,
    });

    res.json({
      success: true,
      lands,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get lands for sale error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lands for sale",
    });
  }
});

// Get nearby lands (geo-location based)
router.get("/nearby", async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const lands = await Land.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(maxDistance)
    ).populate("currentOwner", "fullName email");

    res.json({
      success: true,
      lands,
      searchCenter: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      maxDistance: parseInt(maxDistance),
    });
  } catch (error) {
    console.error("Get nearby lands error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nearby lands",
    });
  }
});

// Verify land by QR code
router.get("/verify/:assetId", async (req, res) => {
  try {
    const { assetId } = req.params;

    const land = await Land.findByAssetId(assetId)
      .populate("currentOwner", "fullName email")
      .populate("verifiedBy", "fullName")
      .populate("ownershipHistory.owner", "fullName");

    if (!land) {
      return res.status(404).json({
        success: false,
        message: "Land not found",
      });
    }

    if (!land.digitalDocument.isDigitalized) {
      return res.status(400).json({
        success: false,
        message: "Land is not digitalized",
      });
    }

    res.json({
      success: true,
      verification: {
        isValid: true,
        assetId: land.assetId,
        currentOwner: land.currentOwner,
        verificationStatus: land.verificationStatus,
        digitalizedDate: land.digitalDocument.generatedDate,
        ownershipHistory: land.ownershipHistory,
        landDetails: {
          village: land.village,
          district: land.district,
          state: land.state,
          area: land.area,
          landType: land.landType,
        },
      },
    });
  } catch (error) {
    console.error("Verify land error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

// Download land certificate
router.get("/:landId/certificate", async (req, res) => {
  try {
    const { landId } = req.params;
    console.log(`Certificate download request for landId: ${landId}`);

    if (!mongoose.Types.ObjectId.isValid(landId)) {
      console.error(`Invalid landId format: ${landId}`);
      return res.status(400).json({
        success: false,
        error: "Invalid landId format",
      });
    }

    const land = await Land.findById(landId);
    if (!land) {
      console.error(`Land not found: ${landId}`);
      return res.status(404).json({
        success: false,
        error: "Land not found",
      });
    }

    if (!land.digitalDocument || !land.digitalDocument.isDigitalized) {
      console.error(`Land not digitalized: ${landId}`);
      return res.status(400).json({
        success: false,
        error:
          "Land is not digitalized. Please contact an administrator to digitalize this land first.",
      });
    }

    if (!land.digitalDocument.hash) {
      console.error(`No digital document hash found for land: ${landId}`);
      return res.status(404).json({
        success: false,
        error: "Digital certificate hash not found",
      });
    }

    console.log(
      `Attempting to download certificate for land: ${land.assetId}, hash: ${land.digitalDocument.hash}`
    );

    // Fetch the PDF from IPFS
    const pdfBuffer = await ipfsService.downloadFile(land.digitalDocument.hash);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error(`Empty or null PDF buffer for land: ${landId}`);
      return res.status(404).json({
        success: false,
        error: "Certificate file not found or is empty",
      });
    }

    console.log(
      `Successfully retrieved certificate for land: ${land.assetId}, size: ${pdfBuffer.length} bytes`
    );

    // Set proper headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="land-certificate-${land.assetId}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-cache");

    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Download certificate error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download certificate",
      error: error.message,
    });
  }
});

// Download original land document
router.get("/:landId/original-document", async (req, res) => {
  try {
    const { landId } = req.params;
    console.log(`Original document download request for landId: ${landId}`);

    if (!mongoose.Types.ObjectId.isValid(landId)) {
      console.error(`Invalid landId format: ${landId}`);
      return res.status(400).json({
        success: false,
        error: "Invalid landId format",
      });
    }

    const land = await Land.findById(landId);
    if (!land) {
      console.error(`Land not found: ${landId}`);
      return res.status(404).json({
        success: false,
        error: "Land not found",
      });
    }

    if (!land.originalDocument || !land.originalDocument.hash) {
      console.error(`No original document found for land: ${landId}`);
      return res.status(404).json({
        success: false,
        error: "Original document not found for this land",
      });
    }

    if (!land.originalDocument.filename) {
      console.error(
        `No filename found for original document of land: ${landId}`
      );
      return res.status(404).json({
        success: false,
        error: "Original document filename not found",
      });
    }

    console.log(
      `Attempting to download original document for land: ${land.assetId}, hash: ${land.originalDocument.hash}`
    );

    // Fetch the file from IPFS
    const fileBuffer = await ipfsService.downloadFile(
      land.originalDocument.hash
    );

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error(`Empty or null file buffer for land: ${landId}`);
      return res.status(404).json({
        success: false,
        error: "Document file not found or is empty",
      });
    }

    console.log(
      `Successfully retrieved original document for land: ${land.assetId}, size: ${fileBuffer.length} bytes`
    );

    // Detect file type from filename
    const mime = require("mime-types");
    const path = require("path");

    const originalFilename = land.originalDocument.filename;
    const ext = path.extname(originalFilename).toLowerCase();
    const mimeType =
      mime.lookup(originalFilename) || "application/octet-stream";

    // Generate download filename
    const downloadFilename = `land-document-${land.assetId}${ext}`;

    // Set proper headers for file download
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadFilename}"`
    );
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("Cache-Control", "no-cache");

    // Send the file buffer
    res.send(fileBuffer);
  } catch (error) {
    console.error("Download original document error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download original document",
      error: error.message,
    });
  }
});

// Check document status before download
router.get("/:landId/document-status", async (req, res) => {
  try {
    const { landId } = req.params;
    console.log(`Document status check for landId: ${landId}`);

    if (!mongoose.Types.ObjectId.isValid(landId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid landId format",
      });
    }

    const land = await Land.findById(landId);
    if (!land) {
      return res.status(404).json({
        success: false,
        error: "Land not found",
      });
    }

    const status = {
      landId: land._id,
      assetId: land.assetId,
      originalDocument: null,
      digitalDocument: null,
    };

    // Check original document
    if (land.originalDocument && land.originalDocument.hash) {
      const originalExists = await ipfsService.fileExists(
        land.originalDocument.hash
      );
      const originalInfo = await ipfsService.getFileInfo(
        land.originalDocument.hash
      );

      status.originalDocument = {
        exists: originalExists,
        filename: land.originalDocument.filename,
        hash: land.originalDocument.hash,
        size: originalInfo ? originalInfo.size : 0,
        url: ipfsService.getFileUrl(land.originalDocument.hash),
      };
    }

    // Check digital document
    if (land.digitalDocument && land.digitalDocument.hash) {
      const digitalExists = await ipfsService.fileExists(
        land.digitalDocument.hash
      );
      const digitalInfo = await ipfsService.getFileInfo(
        land.digitalDocument.hash
      );

      status.digitalDocument = {
        exists: digitalExists,
        isDigitalized: land.digitalDocument.isDigitalized,
        hash: land.digitalDocument.hash,
        size: digitalInfo ? digitalInfo.size : 0,
        url: ipfsService.getFileUrl(land.digitalDocument.hash),
      };
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Document status check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check document status",
      error: error.message,
    });
  }
});

// Get lands owned by a specific user (by user ID)
router.get("/owned-by/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Check if user is requesting their own lands or if they're an admin
    if (req.user._id.toString() !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Access denied. You can only view your own lands." });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get lands owned by the user
    const lands = await Land.find({ currentOwner: userId })
      .populate("currentOwner", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalLands = await Land.countDocuments({ currentOwner: userId });

    // Format the response
    const formattedLands = lands.map((land) => ({
      _id: land._id,
      assetId: land.assetId,
      surveyNumber: land.surveyNumber,
      subDivision: land.subDivision,
      village: land.village,
      taluka: land.taluka,
      district: land.district,
      state: land.state,
      pincode: land.pincode,
      area: land.area,
      boundaries: land.boundaries,
      landType: land.landType,
      classification: land.classification,
      coordinates: land.coordinates,
      soilType: land.soilType,
      waterSource: land.waterSource,
      roadAccess: land.roadAccess,
      electricityConnection: land.electricityConnection,
      status: land.status,
      currentOwner: land.currentOwner,
      createdAt: land.createdAt,
      updatedAt: land.updatedAt,
      marketInfo: land.marketInfo,
      digitalDocument: land.digitalDocument,
    }));

    res.json({
      success: true,
      lands: formattedLands,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLands / parseInt(limit)),
        totalLands,
        hasNext: skip + parseInt(limit) < totalLands,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching owned lands:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch owned lands",
      message: error.message,
    });
  }
});

// Fix: Add a catch-all route at the end to return JSON for unknown API endpoints
router.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res
      .status(404)
      .json({ success: false, message: "API route not found" });
  }
  next();
});

module.exports = router;
