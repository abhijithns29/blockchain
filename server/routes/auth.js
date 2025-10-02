const express = require("express");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Register user
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, walletAddress, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email address",
      });
    }

    // Check wallet address if provided
    if (walletAddress) {
      const existingWallet = await User.findOne({ walletAddress });
      if (existingWallet) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this wallet address",
        });
      }
    }

    // Determine user role (only allow ADMIN for specific emails)
    const adminEmails = [
      "admin@landregistry.gov",
      "officer@landregistry.gov",
      "superadmin@landregistry.gov",
      "auditor@landregistry.gov",
    ];

    let userRole = "USER";
    if (email.toLowerCase() === "auditor@landregistry.gov") {
      userRole = "AUDITOR";
    } else if (adminEmails.includes(email.toLowerCase())) {
      userRole = "ADMIN";
    }

    // Create new user
    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
    };

    // Add wallet address if provided
    if (walletAddress) {
      userData.walletAddress = walletAddress.trim();
    }

    const user = new User(userData);
    await user.save();

    // Log registration
    await AuditLog.logAction(
      "USER_REGISTER",
      user._id,
      "USER",
      user._id.toString(),
      { email: user.email, role: user.role },
      req
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || "fallback-secret-key-for-development",
      { expiresIn: "24h" }
    );

    // Log successful registration
    console.log(`New user registered: ${user.email} (${user.role})`);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isVerified: user.verificationStatus === "VERIFIED",
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === "walletAddress" ? "wallet address" : field;
      return res.status(400).json({
        success: false,
        message: `User already exists with this ${fieldName}`,
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again.",
    });
  }
});

// Setup Two-Factor Authentication
router.post("/2fa/setup", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "Two-factor authentication is already enabled",
      });
    }

    const secret = user.generateTwoFactorSecret();
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      qrCode: qrCodeUrl,
      secret: secret.base32,
      message: "Scan the QR code with your authenticator app",
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to setup two-factor authentication",
    });
  }
});

// Verify and enable Two-Factor Authentication
router.post("/2fa/verify", auth, async (req, res) => {
  try {
    const { token, secret } = req.body;

    if (!token || !secret) {
      return res.status(400).json({
        success: false,
        message: "Token and secret are required",
      });
    }

    const user = await User.findById(req.user._id).select("+twoFactorSecret");

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: "Two-factor setup not initiated",
      });
    }

    const isValid = user.verifyTwoFactorToken(token);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Enable 2FA and generate backup codes
    user.twoFactorEnabled = true;

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      backupCodes.push(code);
      user.twoFactorBackupCodes.push({ code, used: false });
    }

    await user.save();

    res.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
      backupCodes,
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify two-factor authentication",
    });
  }
});

// Disable Two-Factor Authentication
router.post("/2fa/disable", auth, async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findById(req.user._id).select("+twoFactorSecret");

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "Two-factor authentication is not enabled",
      });
    }

    const isValid = user.verifyTwoFactorToken(token);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disable two-factor authentication",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password, walletAddress } = req.body;

    // Validate input
    if (!email && !walletAddress) {
      return res.status(400).json({
        message: "Email or wallet address is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    // Find user by email or wallet address
    let user;
    if (email) {
      user = await User.findByEmail(email);
    } else if (walletAddress) {
      user = await User.findOne({ walletAddress: walletAddress.trim() });
    }

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        message:
          "Account is temporarily locked due to too many failed login attempts. Please try again later.",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || "fallback-secret-key-for-development",
      { expiresIn: "24h" }
    );

    // Log successful login
    console.log(`User logged in: ${user.email} (${user.role})`);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isVerified: user.verificationStatus === "VERIFIED",
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login. Please try again.",
    });
  }
});

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -loginAttempts -lockUntil")
      .populate(
        "ownedLands",
        "landId landDetails.village landDetails.district digitalDocument.isDigitalized"
      );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
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
    console.error("Get user error:", error);
    res.status(500).json({
      message: "Server error while fetching user data",
    });
  }
});

// Verify wallet address
router.post("/verify-wallet", async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        message: "Wallet address, signature, and message are required",
      });
    }

    // Find user by wallet address
    const user = await User.findOne({ walletAddress: walletAddress.trim() });
    if (!user) {
      return res.status(404).json({
        message: "No user found with this wallet address",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // In a real implementation, you would verify the signature here
    // using ethers.js verifyMessage function
    // For now, we'll accept any signature for demo purposes

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || "fallback-secret-key-for-development",
      { expiresIn: "24h" }
    );

    // Log successful wallet verification
    console.log(`Wallet verified for user: ${user.email} (${user.role})`);

    res.json({
      message: "Wallet verified successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isVerified: user.verificationStatus === "VERIFIED",
      },
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    res.status(500).json({
      message: "Server error during wallet verification",
    });
  }
});

// Refresh token
router.post("/refresh-token", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user || !user.isActive) {
      return res.status(403).json({
        message: "User not found or account deactivated",
      });
    }

    // Generate new JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || "fallback-secret-key-for-development",
      { expiresIn: "24h" }
    );

    res.json({
      message: "Token refreshed successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isVerified: user.verificationStatus === "VERIFIED",
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      message: "Server error during token refresh",
    });
  }
});

// Logout (optional - mainly for logging purposes)
router.post("/logout", auth, async (req, res) => {
  try {
    // In a stateless JWT system, logout is mainly handled on the client side
    // But we can log the logout event for audit purposes
    console.log(`User logged out: ${req.user.email} (${req.user.role})`);

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Server error during logout",
    });
  }
});

module.exports = router;
