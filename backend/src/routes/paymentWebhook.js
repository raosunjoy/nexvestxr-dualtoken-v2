const express = require('express');
const PaymentGatewayService = require('../services/PaymentGatewayService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Stripe webhook
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    const result = await PaymentGatewayService.handleStripeWebhook(event);
    res.json(result);
  } catch (error) {
    logger.error('Stripe webhook failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

// Razorpay webhook
router.post('/razorpay', express.json(), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const result = await PaymentGatewayService.handleRazorpayWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    logger.error('Razorpay webhook failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

module.exports = router;