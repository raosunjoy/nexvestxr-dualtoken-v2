const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');
const FlareService = require('../services/FlareService');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Initialize FlareService
let flareService = null;

// Initialize Flare service on module load
(async () => {
  try {
    flareService = new FlareService();
    await flareService.initialize();
    logger.info('FlareService initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize FlareService', { error: error.message });
  }
})();

// Placeholder for Flare Network integration
router.get('/price-feed', authenticateToken, async (req, res) => {
  try {
    // Mock price feed (in production, fetch from Flare Network oracle)
    const priceFeed = {
      token: 'JVCOIMB789',
      price: 1000, // ₹1,000 per token
      timestamp: new Date().toISOString(),
    };

    res.json({ success: true, priceFeed });
  } catch (error) {
    logger.error('Price feed fetch failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Price feed fetch failed', details: error.message });
  }
});

// Tokenize a new property on Flare Network
router.post('/tokenize', authenticateToken, async (req, res) => {
  try {
    if (!flareService) {
      return res.status(503).json({ error: 'Flare service not available' });
    }

    const { ipfsHash, totalValue, totalTokens } = req.body;

    if (!ipfsHash || !totalValue || !totalTokens) {
      return res.status(400).json({ 
        error: 'ipfsHash, totalValue, and totalTokens are required' 
      });
    }

    if (totalValue <= 0 || totalTokens <= 0) {
      return res.status(400).json({ 
        error: 'totalValue and totalTokens must be greater than 0' 
      });
    }

    // Tokenize property on Flare Network
    const result = await flareService.tokenizeProperty(
      ipfsHash,
      totalValue,
      totalTokens,
      req.user.id
    );

    logger.info('Property tokenization successful', { 
      userId: req.user.id, 
      tokenId: result.tokenId,
      transactionHash: result.transactionHash 
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Property tokenization failed', { 
      userId: req.user.id, 
      error: error.message 
    });
    res.status(500).json({ 
      error: 'Property tokenization failed', 
      details: error.message 
    });
  }
});

// Purchase property tokens (fractional ownership)
router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    if (!flareService) {
      return res.status(503).json({ error: 'Flare service not available' });
    }

    const { tokenId, amount, paymentValue } = req.body;

    if (!tokenId || !amount || !paymentValue) {
      return res.status(400).json({ 
        error: 'tokenId, amount, and paymentValue are required' 
      });
    }

    if (amount <= 0 || parseFloat(paymentValue) <= 0) {
      return res.status(400).json({ 
        error: 'amount and paymentValue must be greater than 0' 
      });
    }

    // Purchase tokens on Flare Network
    const result = await flareService.purchasePropertyTokens(
      tokenId,
      amount,
      paymentValue,
      req.user.id
    );

    logger.info('Property token purchase successful', { 
      userId: req.user.id, 
      tokenId,
      amount,
      transactionHash: result.transactionHash 
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Property token purchase failed', { 
      userId: req.user.id, 
      error: error.message 
    });
    res.status(500).json({ 
      error: 'Property token purchase failed', 
      details: error.message 
    });
  }
});

// Get property information
router.get('/property/:tokenId', authenticateToken, async (req, res) => {
  try {
    if (!flareService) {
      return res.status(503).json({ error: 'Flare service not available' });
    }

    const { tokenId } = req.params;

    if (!tokenId) {
      return res.status(400).json({ error: 'tokenId is required' });
    }

    const propertyInfo = await flareService.getPropertyInfo(tokenId);

    res.json({ success: true, data: propertyInfo });
  } catch (error) {
    logger.error('Failed to get property info', { 
      userId: req.user.id, 
      tokenId: req.params.tokenId,
      error: error.message 
    });
    res.status(500).json({ 
      error: 'Failed to get property info', 
      details: error.message 
    });
  }
});

// Get user's property token balance
router.get('/balance/:tokenId', authenticateToken, async (req, res) => {
  try {
    if (!flareService) {
      return res.status(503).json({ error: 'Flare service not available' });
    }

    const { tokenId } = req.params;
    const { address } = req.query;

    if (!tokenId) {
      return res.status(400).json({ error: 'tokenId is required' });
    }

    // Use provided address or default to service wallet address
    const targetAddress = address || (flareService.wallet ? flareService.wallet.address : null);
    
    if (!targetAddress) {
      return res.status(400).json({ error: 'address parameter required or wallet not initialized' });
    }

    const balance = await flareService.getPropertyTokenBalance(tokenId, targetAddress);

    res.json({ success: true, data: balance });
  } catch (error) {
    logger.error('Failed to get token balance', { 
      userId: req.user.id, 
      tokenId: req.params.tokenId,
      error: error.message 
    });
    res.status(500).json({ 
      error: 'Failed to get token balance', 
      details: error.message 
    });
  }
});

// Get transaction details
router.get('/transaction/:txHash', authenticateToken, async (req, res) => {
  try {
    if (!flareService) {
      return res.status(503).json({ error: 'Flare service not available' });
    }

    const { txHash } = req.params;

    if (!txHash) {
      return res.status(400).json({ error: 'txHash is required' });
    }

    const txDetails = await flareService.getTransaction(txHash);

    res.json({ success: true, data: txDetails });
  } catch (error) {
    logger.error('Failed to get transaction details', { 
      userId: req.user.id, 
      txHash: req.params.txHash,
      error: error.message 
    });
    res.status(500).json({ 
      error: 'Failed to get transaction details', 
      details: error.message 
    });
  }
});

// Get network information
router.get('/network', authenticateToken, async (req, res) => {
  try {
    if (!flareService) {
      return res.status(503).json({ error: 'Flare service not available' });
    }

    const networkInfo = await flareService.getNetworkInfo();

    res.json({ success: true, data: networkInfo });
  } catch (error) {
    logger.error('Failed to get network info', { 
      userId: req.user.id, 
      error: error.message 
    });
    res.status(500).json({ 
      error: 'Failed to get network info', 
      details: error.message 
    });
  }
});

// Mint tokens (mobile-optimized response)
router.post('/mint', authenticateToken, async (req, res) => {
  try {
    if (!flareService) {
      return res.status(503).json({ error: 'Flare service not available' });
    }

    const { amount, tokenId } = req.body;
    const userId = req.user.id;

    if (!amount || !tokenId) {
      return res.status(400).json({ 
        error: 'amount and tokenId are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'amount must be greater than 0' 
      });
    }

    // Mock mint logic (replace with actual FlareService mint method)
    const tx = {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      status: 'success',
      gasUsed: 21000
    };

    logger.info('Tokens minted successfully', { 
      userId, 
      amount,
      tokenId,
      transactionHash: tx.transactionHash 
    });

    res.json({
      success: true,
      data: {
        transactionHash: tx.transactionHash,
        mobileSummary: `Minted ${amount} tokens for ${userId}`,
      },
      transactionHash: tx.transactionHash,
      message: 'Tokens minted successfully'
    });
  } catch (error) {
    logger.error('Token minting failed', { 
      userId: req.user.id, 
      error: error.message 
    });
    res.status(500).json({ 
      error: 'Token minting failed', 
      details: error.message 
    });
  }
});

module.exports = router;
