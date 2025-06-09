const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { authenticateToken } = require('../middleware/auth');
const PaymentGatewayService = require('../services/PaymentGatewayService');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const stripe = new Stripe(process.env.STRIPE_API_KEY || 'sk_test_your_stripe_key_here'); // Fallback for testing

// Create Stripe Payment Intent
router.post('/stripe/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const userId = req.user.id;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe expects amount in smallest currency unit (e.g., paise for INR)
      currency,
      payment_method_types: ['card'],
      metadata: {
        userId,
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Stripe deposit failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Stripe deposit failed', details: error.message });
  }
});

// Create Razorpay order
router.post('/razorpay/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const userId = req.user.id;
    
    const result = await PaymentGatewayService.createRazorpayOrder(userId, amount, currency);
    res.json({ success: true, order: result.order });
  } catch (error) {
    logger.error('Razorpay deposit failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Razorpay deposit failed', details: error.message });
  } 
});
    
// Get transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    // Mock transaction history for beta
    const transactions = [
      { id: 'tx1', type: 'deposit', amount: 100, currency: 'USD', createdAt: new Date().toISOString() },
      { id: 'tx2', type: 'withdrawal', amount: 50, currency: 'INR', createdAt: new Date().toISOString() },
    ];
  
    res.json({ success: true, transactions });
  } catch (error) {
    logger.error('Transaction history fetch failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Transaction history fetch failed', details: error.message });
  }
});
    
module.exports = router;

