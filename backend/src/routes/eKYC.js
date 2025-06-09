const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Mock MyInfo eKYC for global investors
router.post('/myinfo', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body; // Authorization code from MyInfo redirect
    const userId = req.user.id;

    // Mock MyInfo API call (in production, use actual MyInfo API)
    const mockResponse = {
      success: true,
      data: {
        name: 'John Doe',
        nationality: 'SG',
        dob: '1990-01-01',
        address: '123 Singapore Street',
        email: `user-${userId}@example.com`,
        phone: '+65 1234 5678',
      },
    };

    // Update user KYC status (assumed User model exists)
    logger.info('MyInfo eKYC completed (mocked)', { userId });
    res.json({ success: true, kycData: mockResponse.data });
  } catch (error) {
    logger.error('MyInfo eKYC failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'eKYC failed', details: error.message });
  }
});

module.exports = router;