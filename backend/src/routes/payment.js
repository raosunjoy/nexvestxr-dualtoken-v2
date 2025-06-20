const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const paymentService = require('../services/PaymentGatewayService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Create payment intent (generic)
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, propertyId, paymentMethod } = req.body;
    
    if (!amount || !currency || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Amount, currency, and payment method are required'
      });
    }

    let result;
    switch (paymentMethod) {
      case 'card':
      case 'stripe':
        result = await paymentService.createStripeIntent(amount, currency, req.user.id);
        break;
      case 'razorpay':
        result = await paymentService.createRazorpayOrder(amount, currency, req.user.id);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported payment method'
        });
    }

    res.json({
      success: true,
      data: {
        clientSecret: result.clientSecret || result.id,
        paymentIntentId: result.id,
        amount,
        currency,
        paymentMethod
      }
    });

  } catch (error) {
    logger.error('Payment intent creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      details: error.message
    });
  }
});

// Get available payment methods
router.get('/methods', authenticateToken, async (req, res) => {
  try {
    const methods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        type: 'card',
        currencies: ['AED', 'USD', 'EUR'],
        fees: { percentage: 2.9, fixed: 0.30 },
        processingTime: 'instant'
      },
      {
        id: 'razorpay',
        name: 'Razorpay',
        type: 'multiple',
        currencies: ['INR', 'USD'],
        fees: { percentage: 2.0, fixed: 0 },
        processingTime: 'instant'
      },
      {
        id: 'moonpay',
        name: 'MoonPay',
        type: 'crypto',
        currencies: ['USD', 'EUR', 'GBP'],
        fees: { percentage: 4.5, fixed: 0 },
        processingTime: '10-30 minutes'
      },
      {
        id: 'ramp',
        name: 'Ramp Network',
        type: 'crypto',
        currencies: ['USD', 'EUR'],
        fees: { percentage: 3.5, fixed: 0 },
        processingTime: '10-20 minutes'
      }
    ];

    res.json({
      success: true,
      data: methods
    });

  } catch (error) {
    logger.error('Payment methods fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
});

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, method } = req.query;
    
    // Mock payment history - in production, this would query actual payment records
    const history = [
      {
        id: 'pay_1',
        amount: 5000,
        currency: 'AED',
        status: 'completed',
        method: 'stripe',
        propertyId: 'PROP_001',
        createdAt: '2024-06-19T10:30:00Z',
        completedAt: '2024-06-19T10:30:15Z'
      },
      {
        id: 'pay_2',
        amount: 10000,
        currency: 'AED',
        status: 'pending',
        method: 'razorpay',
        propertyId: 'PROP_002',
        createdAt: '2024-06-20T08:15:00Z'
      }
    ];

    const filteredHistory = history.filter(payment => {
      if (status && payment.status !== status) return false;
      if (method && payment.method !== method) return false;
      return true;
    });

    const startIndex = (page - 1) * limit;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredHistory.length,
        pages: Math.ceil(filteredHistory.length / limit)
      }
    });

  } catch (error) {
    logger.error('Payment history fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

// Create payment order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, method, propertyId } = req.body;

    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(amount),
      currency,
      method,
      propertyId,
      userId: req.user.id,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    logger.error('Payment order creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order'
    });
  }
});

// Verify payment
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { paymentId, signature, orderId } = req.body;

    // Mock payment verification
    const verification = {
      verified: true,
      paymentId,
      orderId,
      status: 'completed',
      verifiedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: verification
    });

  } catch (error) {
    logger.error('Payment verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

module.exports = router;