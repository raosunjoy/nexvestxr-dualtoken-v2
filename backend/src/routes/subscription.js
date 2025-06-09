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