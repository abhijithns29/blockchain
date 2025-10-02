const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");

// Setup 2FA: generate secret, store in DB, return QR and secret
exports.setupTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Simplified secret generation
    const secret = speakeasy.generateSecret({
      length: 20,
      issuer: 'LandRegistry',
      name: user.email,
      encoding: 'base32'
    });

    // Store the base32 secret
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false;
    await user.save();

    // Generate QR code with specific parameters
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: user.email,
      issuer: 'LandRegistry',
      algorithm: 'sha1',
      period: 30
    });

    const qrCode = await qrcode.toDataURL(otpauthUrl);

    // Debug info
    const currentToken = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
      algorithm: 'sha1',
      step: 30
    });

    console.log('Setup - Current valid token:', currentToken);

    res.json({
      success: true,
      qrCode,
      secret: secret.base32,
      message: "2FA setup initiated"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error setting up 2FA", error: err.message });
  }
};

// Verify 2FA token and enable 2FA
exports.verifyTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    console.log('Verifying token:', token);

    // Basic token validation
    if (!token || typeof token !== "string" || !/^\d{6}$/.test(token)) {
      return res.status(400).json({ success: false, message: "Token must be a 6-digit number" });
    }

    const user = await User.findById(req.user.id).select("+twoFactorSecret");
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: "2FA not set up" });
    }

    // Debug current valid token
    const currentToken = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      algorithm: 'sha1',
      step: 30
    });

    console.log('Debug info:', {
      receivedToken: token,
      expectedToken: currentToken,
      time: Math.floor(Date.now() / 1000),
      secret: user.twoFactorSecret
    });

    // Verify with strict parameters
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      algorithm: 'sha1',
      step: 30,
      window: 1
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please try again.",
        debug: {
          expectedToken: currentToken,
          receivedToken: token,
          time: Math.floor(Date.now() / 1000)
        }
      });
    }

    user.twoFactorEnabled = true;
    const backupCodes = user.generateBackupCodes();
    await user.save();

    res.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
      backupCodes
    });
  } catch (err) {
    console.error('2FA Verification Error:', err);
    res.status(500).json({ 
      success: false, 
      message: "Error verifying 2FA", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

// Disable 2FA
exports.disableTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Verification token required" });
    }

    const user = await User.findById(req.user.id).select("+twoFactorSecret");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: "2FA is not enabled" });
    }

    // Verify token before disabling
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 2
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({ success: true, message: "Two-factor authentication disabled" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error disabling 2FA", error: err.message });
  }
};

// Get 2FA status
exports.getTwoFactorStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
      hasBackupCodes: user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error getting 2FA status", error: err.message });
  }
};