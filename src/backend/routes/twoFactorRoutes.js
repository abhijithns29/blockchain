const express = require('express');
const {
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus
} = require('../controllers/twoFactorController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Setup 2FA
router.post('/setup', setupTwoFactor);

// Verify and enable 2FA
router.post('/verify', verifyTwoFactor);

// Disable 2FA
router.post('/disable', disableTwoFactor);

// Get 2FA status
router.get('/status', getTwoFactorStatus);

module.exports = router;
