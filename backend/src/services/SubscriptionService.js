const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Subscription plans
const developerPlans = {
  basic: {
    name: 'Basic',
    price: 50000, // ₹50,000/month
    features: ['Tokenization (up to 3 properties)', 'Basic Compliance', 'Document Storage'],
    propertyLimit: 3,
  },
  pro: {
    name: 'Pro',
    price: 200000, // ₹2,00,000/month
    features: ['Tokenization (up to 10 properties)', 'Full Compliance', 'Collaboration Portal', 'Analytics'],
    propertyLimit: 10,
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // Custom pricing
    features: ['Unlimited Properties', 'Priority Support', 'Custom Integrations'],
    propertyLimit: Infinity,
  },
};

const investorPlans = {
  free: {
    name: 'Free',
    price: 0,
    features: ['Basic Trading (Buy/Sell)', '0.5% Trading Fee', 'Standard KYC'],
    tradingFee: 0.005,
  },
  premium: {
    name: 'Premium',
    price: 1000, // ₹1,000/month
    features: ['Advanced Trading (Limit Orders, Analytics)', '0.3% Trading Fee', 'Priority KYC'],
    tradingFee: 0.003,
  },
  institutional: {
    name: 'Institutional',
    price: 0, // Custom pricing
    features: ['Bulk Trading', '0.2% Trading Fee', 'Dedicated Support', 'API Access'],
    tradingFee: 0.002,
  },
};

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['developer', 'investor'], required: true },
  plan: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'trial'], default: 'trial' },
  trialEndDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

class SubscriptionService {
  async getAvailablePlans(role) {
    try {
      const plans = role === 'developer' ? developerPlans : investorPlans;
      logger.info('Fetched available plans', { role });
      return plans;
    } catch (error) {
      logger.error('Failed to fetch available plans', { role, error: error.message });
      throw error;
    }
  }

  async subscribeUser(userId, role, plan) {
    try {
      const availablePlans = role === 'developer' ? developerPlans : investorPlans;
      if (!availablePlans[plan]) {
        throw new Error('Invalid plan');
      }

      // Check if user already has a subscription
      let subscription = await Subscription.findOne({ userId, role });
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial for beta

      if (subscription) {
        subscription.plan = plan;
        subscription.status = 'trial';
        subscription.trialEndDate = trialEndDate;
        subscription.updatedAt = new Date();
      } else {
        subscription = new Subscription({
          userId,
          role,
          plan,
          status: 'trial',
          trialEndDate,
        });
      }

      await subscription.save();
      logger.info('User subscribed successfully', { userId, role, plan });
      return subscription;
    } catch (error) {
      logger.error('Subscription failed', { userId, role, plan, error: error.message });
      throw error;
    }
  }

  async getUserSubscription(userId, role) {
    try {
      const subscription = await Subscription.findOne({ userId, role });
      if (!subscription) {
        throw new Error('No subscription found');
      }

      const plans = role === 'developer' ? developerPlans : investorPlans;
      const planDetails = plans[subscription.plan];

      logger.info('Fetched user subscription', { userId, role });
      return { ...subscription.toObject(), planDetails };
    } catch (error) {
      logger.error('Failed to fetch user subscription', { userId, role, error: error.message });
      throw error;
    }
  }

  // Mock payment processing (in production, integrate with Stripe/MoonPay)
  async processPayment(userId, role, plan) {
    try {
      const subscription = await this.subscribeUser(userId, role, plan);
      // Mock payment success for beta; in production, process payment via Stripe/MoonPay
      logger.info('Payment processed successfully (mocked)', { userId, role, plan });
      return { success: true, subscription };
    } catch (error) {
      logger.error('Payment processing failed', { userId, role, plan, error: error.message });
      throw error;
    }
  }
}

module.exports = new SubscriptionService();