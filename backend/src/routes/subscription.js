const express = require('express');
const SubscriptionService = require('../services/SubscriptionService');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Get all available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        id: 'uae-retail',
        name: 'UAE Retail',
        description: 'Perfect for individual investors in the UAE',
        price: 99,
        currency: 'AED',
        interval: 'month',
        features: [
          'Access to 50+ properties',
          'Basic portfolio analytics',
          'Email support',
          'Mobile app access'
        ],
        maxInvestment: 500000,
        region: 'UAE'
      },
      {
        id: 'uae-premium',
        name: 'UAE Premium',
        description: 'Advanced features for serious investors',
        price: 299,
        currency: 'AED',
        interval: 'month',
        features: [
          'Access to all properties',
          'Advanced analytics',
          'Priority support',
          'API access',
          'Personalized advisory'
        ],
        maxInvestment: 2000000,
        region: 'UAE'
      },
      {
        id: 'uae-institutional',
        name: 'UAE Institutional',
        description: 'Enterprise-grade features for institutions',
        price: 999,
        currency: 'AED',
        interval: 'month',
        features: [
          'Unlimited property access',
          'White-label solutions',
          'Dedicated account manager',
          'Custom integrations',
          'Real-time data feeds'
        ],
        maxInvestment: null,
        region: 'UAE'
      }
    ];

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    logger.error('Failed to fetch subscription plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

// Subscribe to a plan
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    // Mock subscription creation
    const subscription = {
      subscriptionId: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      planId,
      userId: req.user.id,
      status: 'active',
      startDate: new Date().toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMethod: paymentMethod || 'card'
    };

    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    logger.error('Subscription failed:', error);
    res.status(500).json({
      success: false,
      error: 'Subscription failed'
    });
  }
});

// Get current subscription
router.get('/current', authenticateToken, async (req, res) => {
  try {
    // Mock current subscription
    const subscription = {
      plan: {
        id: 'uae-retail',
        name: 'UAE Retail',
        price: 99,
        currency: 'AED'
      },
      status: 'active',
      startDate: '2024-06-01T00:00:00Z',
      nextBillingDate: '2024-07-01T00:00:00Z',
      usage: {
        propertiesViewed: 125,
        investmentsMade: 3,
        supportTickets: 2
      }
    };

    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    logger.error('Failed to fetch current subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current subscription'
    });
  }
});

// Get available plans for a role (developer or investor)
router.get('/plans/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    if (!['developer', 'investor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const plans = await SubscriptionService.getAvailablePlans(role);
    res.json({ success: true, plans });
  } catch (error) {
    logger.error('Failed to fetch plans', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch plans', details: error.message });
  }
});

// Subscribe to a plan
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { role, plan } = req.body;
    const userId = req.user.id;

    if (!role || !plan || !['developer', 'investor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role or plan' });
    }

    const result = await SubscriptionService.processPayment(userId, role, plan);
    res.json({ success: true, subscription: result.subscription });
  } catch (error) {
    logger.error('Subscription failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Subscription failed', details: error.message });
  }
});

// Get user's subscription
router.get('/my-subscription/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    const userId = req.user.id;

    if (!['developer', 'investor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const subscription = await SubscriptionService.getUserSubscription(userId, role);
    res.json({ success: true, subscription });
  } catch (error) {
    logger.error('Failed to fetch subscription', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Failed to fetch subscription', details: error.message });
  }
});

module.exports = router;