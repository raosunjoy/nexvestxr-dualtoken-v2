const express = require('express');
const TradeService = require('../services/TradeService');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

router.post('/buy', authenticateToken, async (req, res) => {
  try {
    const { tokenCode, issuerAddress, amount, paymentAmount } = req.body;
    const userAddress = req.user.address;

    const transaction = await TradeService.buyTokens(userAddress, tokenCode, issuerAddress, amount, paymentAmount);
    res.json({ success: true, transaction });
  } catch (error) {
    logger.error('Token buy failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Token buy failed', details: error.message });
  }
});

router.post('/sell', authenticateToken, async (req, res) => {
  try {
    const { tokenCode, issuerAddress, amount, receiveAmount } = req.body;
    const userAddress = req.user.address;

    const transaction = await TradeService.sellTokens(userAddress, tokenCode, issuerAddress, amount, receiveAmount);
    res.json({ success: true, transaction });
  } catch (error) {
    logger.error('Token sell failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Token sell failed', details: error.message });
  }
});

router.post('/limit-order', authenticateToken, async (req, res) => {
  try {
    const { tokenCode, issuerAddress, amount, pricePerToken, type } = req.body;
    const userAddress = req.user.address;

    const transaction = await TradeService.createLimitOrder(userAddress, tokenCode, issuerAddress, amount, pricePerToken, type);
    res.json({ success: true, transaction });
  } catch (error) {
    logger.error('Limit order failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Limit order failed', details: error.message });
  }
});

router.get('/order-book/:tokenCode/:issuerAddress', authenticateToken, async (req, res) => {
  try {
    const { tokenCode, issuerAddress } = req.params;

    const orderBook = await TradeService.getOrderBook(tokenCode, issuerAddress);
    res.json({ success: true, orderBook });
  } catch (error) {
    logger.error('Order book fetch failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Order book fetch failed', details: error.message });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { tokenCode, issuerAddress } = req.query;

    const history = await TradeService.getTradingHistory(tokenCode, issuerAddress);
    res.json({ success: true, history });
  } catch (error) {
    logger.error('Trading history fetch failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Trading history fetch failed', details: error.message });
  }
});

module.exports = router;