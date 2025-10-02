const express = require("express");
const multer = require("multer");
const User = require("../models/User");
const { auth, adminAuth } = require("../middleware/auth");
const ipfsService = require("../config/ipfs");
const mongoose = require("mongoose");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Submit verification documents
router.post(
  "/verification/submit",
  auth,
  upload.fields([
    { name: "aadhaarCard", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "passport", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { aadhaarNumber, panNumber, dlNumber, passportNumber } = req.body;

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is admin (admins don't need verification)
      if (user.role === "ADMIN") {
        return res.status(400).json({
          message: "Admin accounts do not require verification",
        });
      }

      // Check if user is already verified
      if (user.verificationStatus === "VERIFIED") {
        return res.status(400).json({
          message: "User is already verified",
        });
      }

      const verificationDocuments = {};
      let documentsUploaded = 0;

      // Upload Aadhaar card
      if (req.files.aadhaarCard && aadhaarNumber) {
        try {
          const aadhaarFile = req.files.aadhaarCard[0];
          const aadhaarHash = await ipfsService.uploadFile(
            aadhaarFile.buffer,
            aadhaarFile.originalname
          );
          verificationDocuments.aadhaarCard = {
            number: aadhaarNumber.trim(),
            documentUrl: ipfsService.getFileUrl(aadhaarHash),
            ipfsHash: aadhaarHash,
            verified: false,
          };
          documentsUploaded++;
        } catch (uploadError) {
          console.error("Aadhaar card upload error:", uploadError);
          return res
            .status(500)
            .json({ message: "Failed to upload Aadhaar card" });
        }
      }

      // Upload PAN card
      if (req.files.panCard && panNumber) {
        try {
          const panFile = req.files.panCard[0];
          const panHash = await ipfsService.uploadFile(
            panFile.buffer,
            panFile.originalname
          );
          verificationDocuments.panCard = {
            number: panNumber.trim().toUpperCase(),
            documentUrl: ipfsService.getFileUrl(panHash),
            ipfsHash: panHash,
            verified: false,
          };
          documentsUploaded++;
        } catch (uploadError) {
          console.error("PAN card upload error:", uploadError);
          return res.status(500).json({ message: "Failed to upload PAN card" });
        }
      }

      // Upload Driving License
      if (req.files.drivingLicense && dlNumber) {
        try {
          const dlFile = req.files.drivingLicense[0];
          const dlHash = await ipfsService.uploadFile(
            dlFile.buffer,
            dlFile.originalname
          );
          verificationDocuments.drivingLicense = {
            number: dlNumber.trim().toUpperCase(),
            documentUrl: ipfsService.getFileUrl(dlHash),
            ipfsHash: dlHash,
            verified: false,
          };
          documentsUploaded++;
        } catch (uploadError) {
          console.error("Driving license upload error:", uploadError);
          return res
            .status(500)
            .json({ message: "Failed to upload driving license" });
        }
      }

      // Upload Passport
      if (req.files.passport && passportNumber) {
        try {
          const passportFile = req.files.passport[0];
          const passportHash = await ipfsService.uploadFile(
            passportFile.buffer,
            passportFile.originalname
          );
          verificationDocuments.passport = {
            number: passportNumber.trim().toUpperCase(),
            documentUrl: ipfsService.getFileUrl(passportHash),
            ipfsHash: passportHash,
            verified: false,
          };
          documentsUploaded++;
        } catch (uploadError) {
          console.error("Passport upload error:", uploadError);
          return res.status(500).json({ message: "Failed to upload passport" });
        }
      }

      // Check if at least one document was uploaded
      if (documentsUploaded === 0) {
        return res.status(400).json({
          message:
            "At least one verification document with its number is required",
        });
      }

      // Update user verification documents - only set fields that have actual values
      const currentDocs = user.verificationDocuments?.toObject() || {};

      // Create a clean verification documents object
      const updatedDocs = {};

      // Copy existing documents that are not undefined
      if (
        currentDocs.aadhaarCard &&
        typeof currentDocs.aadhaarCard === "object"
      ) {
        updatedDocs.aadhaarCard = currentDocs.aadhaarCard;
      }
      if (currentDocs.panCard && typeof currentDocs.panCard === "object") {
        updatedDocs.panCard = currentDocs.panCard;
      }
      if (
        currentDocs.drivingLicense &&
        typeof currentDocs.drivingLicense === "object"
      ) {
        updatedDocs.drivingLicense = currentDocs.drivingLicense;
      }
      if (currentDocs.passport && typeof currentDocs.passport === "object") {
        updatedDocs.passport = currentDocs.passport;
      }

      // Only add newly uploaded documents that are not undefined
      if (verificationDocuments.aadhaarCard) {
        updatedDocs.aadhaarCard = verificationDocuments.aadhaarCard;
      }
      if (verificationDocuments.panCard) {
        updatedDocs.panCard = verificationDocuments.panCard;
      }
      if (verificationDocuments.drivingLicense) {
        updatedDocs.drivingLicense = verificationDocuments.drivingLicense;
      }
      if (verificationDocuments.passport) {
        updatedDocs.passport = verificationDocuments.passport;
      }

      user.verificationDocuments = updatedDocs;
      user.verificationStatus = "PENDING";

      await user.save();

      console.log(
        `Verification documents submitted by user: ${user.email} (${documentsUploaded} documents)`
      );

      res.json({
        message: "Verification documents submitted successfully",
        documentsUploaded,
        verificationStatus: user.verificationStatus,
      });
    } catch (error) {
      console.error("Document submission error:", error);
      res.status(500).json({
        message: "Failed to submit verification documents",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
);

// Get pending verifications (Admin only)
router.get("/verification/pending", adminAuth, async (req, res) => {
  try {
    const pendingUsers = await User.findPendingVerifications()
      .select("-password -loginAttempts -lockUntil")
      .sort({ createdAt: -1 });

    res.json({ users: pendingUsers });
  } catch (error) {
    console.error("Get pending verifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify user (Admin only)
router.put("/verification/:userId/verify", adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason, verifiedDocuments } = req.body;

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be VERIFIED or REJECTED",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "ADMIN") {
      return res.status(400).json({
        message: "Cannot modify admin user verification status",
      });
    }

    // Update verification status
    user.verificationStatus = status;
    user.verifiedBy = req.user._id;
    user.verificationDate = new Date();

    if (status === "REJECTED") {
      user.rejectionReason =
        rejectionReason || "Documents did not meet verification requirements";
    } else if (status === "VERIFIED") {
      user.rejectionReason = undefined;

      // Mark specific documents as verified
      if (verifiedDocuments) {
        Object.keys(verifiedDocuments).forEach((docType) => {
          if (
            user.verificationDocuments[docType] &&
            verifiedDocuments[docType]
          ) {
            user.verificationDocuments[docType].verified = true;
          }
        });
      }
    }

    await user.save();

    console.log(
      `User ${user.email} ${status.toLowerCase()} by admin ${req.user.email}`
    );

    res.json({
      message: `User ${status.toLowerCase()} successfully`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        verificationStatus: user.verificationStatus,
        verificationDate: user.verificationDate,
      },
    });
  } catch (error) {
    console.error("User verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all verified users (Admin only)
router.get("/verified", adminAuth, async (req, res) => {
  try {
    const verifiedUsers = await User.findVerifiedUsers()
      .select("-password -verificationDocuments -loginAttempts -lockUntil")
      .sort({ verificationDate: -1 });

    res.json({ users: verifiedUsers });
  } catch (error) {
    console.error("Get verified users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -loginAttempts -lockUntil")
      .populate(
        "ownedLands",
        "landId landDetails.village landDetails.district digitalDocument.isDigitalized marketInfo.isForSale"
      );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        ...user.toJSON(),
        isVerified: user.verificationStatus === "VERIFIED",
        canClaimLand: user.canClaimLand(),
        hasRequiredDocuments: user.hasRequiredDocuments(),
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { fullName, phoneNumber, address } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update allowed fields
    if (fullName) user.fullName = fullName.trim();
    if (phoneNumber) user.profile.phoneNumber = phoneNumber.trim();
    if (address) {
      user.profile.address = {
        ...user.profile.address,
        ...address,
      };
    }

    await user.save();

    console.log(`Profile updated for user: ${user.email}`);

    res.json({
      message: "Profile updated successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user statistics (Admin only)
router.get("/statistics", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "USER" });
    const verifiedUsers = await User.countDocuments({
      role: "USER",
      verificationStatus: "VERIFIED",
    });
    const pendingUsers = await User.countDocuments({
      role: "USER",
      verificationStatus: "PENDING",
    });
    const rejectedUsers = await User.countDocuments({
      role: "USER",
      verificationStatus: "REJECTED",
    });

    const recentUsers = await User.find({ role: "USER" })
      .select("fullName email verificationStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      statistics: {
        totalUsers,
        verifiedUsers,
        pendingUsers,
        rejectedUsers,
        verificationRate:
          totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Get user statistics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify user by ID (Admin only)
router.post("/verify-user", adminAuth, async (req, res) => {
  // Robust ID validation and debug logging
  const userId = req.body._id || req.body.userId;
  console.log("User ID received:", userId); // Debug log
  if (
    !userId ||
    userId === "undefined" ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or missing user ID" });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // ...existing verification logic...
    res.json({ success: true, user });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Example: Add validation to any user verification route
router.get("/verify/:id", async (req, res) => {
  try {
    // Debug: log incoming params and body
    console.log("Incoming params:", req.params);
    console.log("Incoming body:", req.body);

    const userId = req.params.id || req.body.userId || req.body._id;
    if (
      !userId ||
      userId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("User verification error:", err);
    res.status(500).json({ error: "User verification failed" });
  }
});

module.exports = router;
