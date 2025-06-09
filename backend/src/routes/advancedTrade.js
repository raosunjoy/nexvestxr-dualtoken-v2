const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const AdvancedTradeService = require('../services/AdvancedTradeService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Create limit order
router.post('/limit', authenticateToken, async (req, res) => {
  try {
    const { pairId, side, amount, price, options } = req.body;
    const userId = req.user.id;
    const userAddress = req.user.address;

    const order = await AdvancedTradeService.createLimitOrder(userId, userAddress, pairId, side, amount, price, options);
    res.json({ success: true, data: { transactions: [order] } });
  } catch (error) {
    logger.error('Limit order failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Limit order failed', details: error.message });
  }
});

// Create stop-loss order
router.post('/stop-loss', authenticateToken, async (req, res) => {
  try {
    const { pairId, side, amount, stopPrice, limitPrice } = req.body;
    const userId = req.user.id;
    const userAddress = req.user.address;

    const result = await AdvancedTradeService.createStopLossOrder(userId, userAddress, pairId, side, amount, stopPrice, limitPrice);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Stop-loss order failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Stop-loss order failed', details: error.message });
  }
});

// Create OCO order
router.post('/oco', authenticateToken, async (req, res) => {
  try {
    const { pairId, side, amount, stopPrice, limitPrice, targetPrice } = req.body;
    const userId = req.user.id;
    const userAddress = req.user.address;

    const result = await AdvancedTradeService.createOCOOrder(userId, userAddress, pairId, side, amount, stopPrice, limitPrice, targetPrice);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('OCO order failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'OCO order failed', details: error.message });
  }
});

// Add liquidity to a pool
router.post('/liquidity/add', authenticateToken, async (req, res) => {
  try {
    const { pairId, tokenAmount, xrpAmount } = req.body;
    const userId = req.user.id;
    const userAddress = req.user.address;

    const result = await AdvancedTradeService.addLiquidity(userId, userAddress, pairId, tokenAmount, xrpAmount);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Liquidity addition failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Liquidity addition failed', details: error.message });
  }
});

// Create margin order
router.post('/margin', authenticateToken, async (req, res) => {
  try {
    const { pairId, side, amount, price, leverage } = req.body;
    const userId = req.user.id;
    const userAddress = req.user.address;

    const result = await AdvancedTradeService.createMarginOrder(userId, userAddress, pairId, side, amount, price, leverage);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Margin order failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Margin order failed', details: error.message });
  }
});

module.exports = router;