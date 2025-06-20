const axios = require('axios');
const winston = require('winston');
const Razorpay = require('razorpay');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class PaymentGatewayService {
  constructor() {
    this.stripeApiKey = process.env.STRIPE_API_KEY;
    this.moonpayApiKey = process.env.MOONPAY_API_KEY;
    this.moonpaySecret = process.env.MOONPAY_SECRET;
    this.rampApiKey = process.env.RAMP_API_KEY;
    
    // Only initialize Razorpay if credentials are provided and valid
    if (process.env.RAZORPAY_KEY_ID && 
        process.env.RAZORPAY_KEY_SECRET && 
        process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id' &&
        process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_secret') {
      try {
        this.razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        logger.info('Razorpay initialized successfully');
      } catch (error) {
        logger.warn('Failed to initialize Razorpay:', error.message);
        this.razorpay = null;
      }
    } else {
      logger.info('Razorpay credentials not provided, skipping initialization');
      this.razorpay = null;
    }
    
    this.baseCurrency = 'XRP';
  }

  async createStripeIntent(amount, currency = 'USD', userId) {
    try {
      // Mock Stripe payment intent for testing - in production, use actual Stripe API
      const paymentIntent = {
        id: `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: amount * 100, // Stripe uses cents
        currency: currency.toLowerCase(),
        status: 'requires_payment_method',
        clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
        created: Math.floor(Date.now() / 1000),
        description: `Payment for NexVestXR Property Investment - User ${userId}`,
        metadata: {
          userId: userId.toString(),
          platform: 'nexvestxr'
        }
      };

      logger.info('Mock Stripe payment intent created', { 
        userId, 
        paymentIntentId: paymentIntent.id,
        amount,
        currency 
      });
      
      return paymentIntent;
    } catch (error) {
      logger.error('Stripe payment intent creation failed', { userId, error: error.message });
      throw new Error(`Stripe payment intent failed: ${error.message}`);
    }
  }

  async createStripeOnRampSession(userId, amount, currency = 'USD') {
    try {
      const response = await axios.post(
        'https://api.stripe.com/v1/crypto/onramp/sessions',
        new URLSearchParams({
          amount: amount.toString(),
          currency: currency.toLowerCase(),
          destination: this.baseCurrency,
          customer_email: `user-${userId}@nexvestxr.com`,
          redirect_url: 'https://nexvestxr.com/payment/complete'
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.stripeApiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('Stripe on-ramp session created', { userId, sessionId: response.data.id });
      return { success: true, session: response.data };
    } catch (error) {
      logger.error('Stripe on-ramp session creation failed', { userId, error: error.message });
      throw new Error(`Stripe on-ramp failed: ${error.message}`);
    }
  }

  async createMoonPayOnRampTransaction(userId, amount, currency = 'USD') {
    try {
      const params = new URLSearchParams({
        apiKey: this.moonpayApiKey,
        currencyCode: this.baseCurrency,
        baseCurrencyCode: currency,
        baseCurrencyAmount: amount.toString(),
        walletAddress: `user-${userId}-wallet`,
        redirectURL: 'https://nexvestxr.com/payment/complete'
      });

      const signature = require('crypto').createHmac('sha256', this.moonpaySecret)
        .update(params.toString())
        .digest('base64');

      const url = `https://buy.moonpay.com?${params.toString()}&signature=${encodeURIComponent(signature)}`;

      logger.info('MoonPay on-ramp transaction URL generated', { userId, url });
      return { success: true, transactionUrl: url };
    } catch (error) {
      logger.error('MoonPay on-ramp transaction failed', { userId, error: error.message });
      throw new Error(`MoonPay on-ramp failed: ${error.message}`);
    }
  }

  async createMoonPayOffRampTransaction(userId, amount, currency = 'USD') {
    try {
      const params = new URLSearchParams({
        apiKey: this.moonpayApiKey,
        baseCurrencyCode: this.baseCurrency,
        baseCurrencyAmount: amount.toString(),
        quoteCurrencyCode: currency,
        refundWalletAddress: `user-${userId}-wallet`,
        redirectURL: 'https://nexvestxr.com/payment/complete'
      });

      const signature = require('crypto').createHmac('sha256', this.moonpaySecret)
        .update(params.toString())
        .digest('base64');

      const url = `https://sell.moonpay.com?${params.toString()}&signature=${encodeURIComponent(signature)}`;

      logger.info('MoonPay off-ramp transaction URL generated', { userId, url });
      return { success: true, transactionUrl: url };
    } catch (error) {
      logger.error('MoonPay off-ramp transaction failed', { userId, error: error.message });
      throw new Error(`MoonPay off-ramp failed: ${error.message}`);
    }
  }

  async createRampOnRampTransaction(userId, amount, currency = 'USD') {
    try {
      const params = new URLSearchParams({
        apiKey: this.rampApiKey,
        swapAsset: this.baseCurrency,
        fiatCurrency: currency,
        fiatValue: amount.toString(),
        userEmail: `user-${userId}@nexvestxr.com`,
        userAddress: `user-${userId}-wallet`,
        finalUrl: 'https://nexvestxr.com/payment/complete'
      });

      const url = `https://app.ramp.network?${params.toString()}`;

      logger.info('Ramp on-ramp transaction URL generated', { userId, url });
      return { success: true, transactionUrl: url };
    } catch (error) {
      logger.error('Ramp on-ramp transaction failed', { userId, error: error.message });
      throw new Error(`Ramp on-ramp failed: ${error.message}`);
    }
  }

  async createRazorpayOrder(amount, currency = 'INR', userId) {
    // For testing, always return a mock order regardless of Razorpay configuration
    if (process.env.NODE_ENV === 'test' || !this.razorpay) {
      const mockOrder = {
        id: `order_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: amount * 100, // Amount in paise
        currency,
        receipt: `receipt_${userId}_${Date.now()}`,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
        notes: {
          userId: userId.toString(),
          platform: 'nexvestxr'
        }
      };

      logger.info('Mock Razorpay order created', { userId, orderId: mockOrder.id });
      return mockOrder;
    }
    
    try {
      const options = {
        amount: amount * 100, // Amount in paise
        currency,
        receipt: `receipt_${userId}_${Date.now()}`,
        payment_capture: 1,
      };

      const order = await this.razorpay.orders.create(options);
      logger.info('Razorpay order created', { userId, orderId: order.id });
      return { success: true, order };
    } catch (error) {
      logger.error('Razorpay order creation failed', { userId, error: error.message });
      throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
  }

  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          logger.info('Stripe payment succeeded', { paymentIntentId: paymentIntent.id });
          // Update user balance or transaction status
          return { success: true, message: 'Payment processed' };
        default:
          logger.warn('Unhandled Stripe event type', { eventType: event.type });
          return { success: false, message: 'Event type not handled' };
      }
    } catch (error) {
      logger.error('Stripe webhook handling failed', { error: error.message });
      throw error;
    }
  }

  async handleRazorpayWebhook(payload, signature) {
    if (!this.razorpay) {
      throw new Error('Razorpay service is not available. Please configure Razorpay credentials.');
    }
    
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      const event = payload.event;
      switch (event) {
        case 'payment.captured':
          const payment = payload.payload.payment.entity;
          logger.info('Razorpay payment captured', { paymentId: payment.id });
          // Update user balance or transaction status
          return { success: true, message: 'Payment processed' };
        case 'payment.failed':
          const failedPayment = payload.payload.payment.entity;
          logger.warn('Razorpay payment failed', { paymentId: failedPayment.id });
          return { success: false, message: 'Payment failed' };
        default:
          logger.warn('Unhandled Razorpay event', { event });
          return { success: false, message: 'Event not handled' };
      }
    } catch (error) {
      logger.error('Razorpay webhook handling failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = new PaymentGatewayService();