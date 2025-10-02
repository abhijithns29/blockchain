const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus
} = require('../controllers/twoFactorController');

// Protect all routes
router.use(auth);

router.post('/setup', setupTwoFactor);
router.post('/verify', verifyTwoFactor);
router.post('/disable', disableTwoFactor);
router.get('/status', getTwoFactorStatus);

module.exports = router;
