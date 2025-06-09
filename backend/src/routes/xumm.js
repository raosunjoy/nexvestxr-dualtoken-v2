const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Get XUMM credentials for initialization (public endpoint)
router.get('/credentials', (req, res) => {
  try {
    // Only provide API key for client-side initialization
    // API secret should never be exposed to client
    if (!process.env.XUMM_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'XUMM API credentials not configured'
      });
    }
    
    res.json({
      success: true,
      data: {
        apiKey: process.env.XUMM_API_KEY,
        // Note: We don't send API secret to client for security
        // Client will use API key for read-only operations
      }
    });
  } catch (error) {
    logger.error('Failed to get XUMM credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve XUMM credentials'
    });
  }
});

// Get account info from XRPL
router.get('/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Mock account info for development
    // In production, this would connect to XRPL
    const mockAccountInfo = {
      account: address,
      balance: '1000000000', // 1000 XRP in drops
      sequence: 1,
      ownerCount: 0,
      previousTxnID: 'mock_txn_id',
      validated: true
    };
    
    res.json({
      success: true,
      data: mockAccountInfo
    });
  } catch (error) {
    logger.error('Failed to get account info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve account information'
    });
  }
});

// Get wallet balance
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Mock balance info for development
    const mockBalance = {
      xrp: 1000.0,
      tokens: [],
      totalValue: 1000.0
    };
    
    res.json({
      success: true,
      data: mockBalance
    });
  } catch (error) {
    logger.error('Failed to get wallet balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet balance'
    });
  }
});

// Validate XRP address
router.post('/validate-address', async (req, res) => {
  try {
    const { address } = req.body;
    
    // Basic XRP address validation
    const isValid = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address);
    
    res.json({
      success: true,
      data: {
        address,
        isValid
      }
    });
  } catch (error) {
    logger.error('Address validation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Address validation failed'
    });
  }
});

// Placeholder for XUMM wallet integration
router.post('/sign', authenticateToken, async (req, res) => {
  try {
    const { transaction } = req.body;
    // Mock XUMM sign request (handled client-side in this implementation)
    res.json({ success: true, transaction });
  } catch (error) {
    logger.error('XUMM sign failed', { userId: req.user?.id, error: error.message });
    res.status(500).json({ error: 'XUMM sign failed', details: error.message });
  }
});

module.exports = router;