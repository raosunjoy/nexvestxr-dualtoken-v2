// routes/paymentRoutes.js - Complete payment gateway integration
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
const axios = require('axios');

const { auth, requireKYC } = require('../middleware/auth');
const CurrencyService = require('../services/CurrencyService');
const { User, Investment } = require('../database/schemas/currencySchemas');

// Get available payment methods based on user location
router.get('/methods', async (req, res) => {
  try {
    const { currency = 'USD', amount } = req.query;
    const userRegion = req.headers['x-user-region'] || 'global';

    const paymentMethods = {
      stripe: {
        name: 'Credit/Debit Card',
        currencies: ['USD', 'EUR', 'GBP', 'SGD'],
        fees: {
          percentage: 2.9,
          fixed: currency === 'USD' ? 0.30 : 0.25
        },
        processingTime: 'Instant',
        icon: '💳',
        available: ['US', 'EU', 'GB', 'SG'].includes(userRegion.toUpperCase())
      },
      moonpay: {
        name: 'Crypto Purchase',
        currencies: ['USD', 'EUR', 'GBP', 'SGD'],
        fees: {
          percentage: 4.5,
          fixed: 0
        },
        processingTime: '5-15 minutes',
        icon: '₿',
        available: !['IN'].includes(userRegion.toUpperCase())
      },
      ramp: {
        name: 'Bank Transfer',
        currencies: ['USD', 'EUR', 'GBP', 'SGD'],
        fees: {
          percentage: 2.9,
          fixed: 0
        },
        processingTime: '1-3 minutes',
        icon: '🏦',
        available: ['SG', 'MY', 'TH'].includes(userRegion.toUpperCase())
      },
      razorpay: {
        name: 'UPI/Net Banking',
        currencies: ['INR'],
        fees: {
          percentage: 2.0,
          fixed: 0
        },
        processingTime: 'Instant',
        icon: '💰',
        available: userRegion.toUpperCase() === 'IN'
      },
      xrpl: {
        name: 'XRP Direct',
        currencies: ['XRP'],
        fees: {
          percentage: 0,
          fixed: 0.00001
        },
        processingTime: '3-5 seconds',
        icon: '⚡',
        available: true
      }
    };

    // Filter available methods
    const availableMethods = Object.entries(paymentMethods)
      .filter(([key, method]) => {
        return method.available && 
               (method.currencies.includes(currency) || key === 'xrpl');
      })
      .reduce((acc, [key, method]) => {
        acc[key] = method;
        return acc;
      }, {});

    res.json({
      success: true,
      data: {
        currency,
        userRegion,
        paymentMethods: availableMethods,
        recommended: getRecommendedPaymentMethod(userRegion, currency, amount)
      }
    });

  } catch (error) {
    console.error('❌ Failed to get payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
});

// Helper function to recommend payment method
function getRecommendedPaymentMethod(region, currency, amount) {
  const recommendations = {
    'US': currency === 'USD' ? 'stripe' : 'moonpay',
    'EU': currency === 'EUR' ? 'stripe' : 'moonpay', 
    'GB': currency === 'GBP' ? 'stripe' : 'moonpay',
    'SG': currency === 'SGD' ? 'ramp' : 'moonpay',
    'IN': 'razorpay'
  };

  // For small amounts, recommend lowest fee options
  if (amount && parseFloat(amount) < 100) {
    return region === 'IN' ? 'razorpay' : 'xrpl';
  }

  return recommendations[region.toUpperCase()] || 'stripe';
}

// Create Stripe payment intent
router.post('/stripe/create-intent', auth, requireKYC, async (req, res) => {
  try {
    const { amount, currency, propertyId, returnUrl } = req.body;

    if (!amount || !currency || !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, currency, propertyId'
      });
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        userId: req.user.userId,
        propertyId: propertyId,
        platform: 'nexvestxr'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment intent for tracking
    const user = await User.findById(req.user.userId);
    if (!user.paymentIntents) {
      user.paymentIntents = [];
    }
    
    user.paymentIntents.push({
      stripePaymentIntentId: paymentIntent.id,
      amount: parseFloat(amount),
      currency,
      propertyId,
      status: 'pending',
      createdAt: new Date()
    });
    
    await user.save();

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: parseFloat(amount),
        currency
      }
    });

  } catch (error) {
    console.error('❌ Stripe payment intent creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

// Confirm Stripe payment
router.post('/stripe/confirm', auth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Process successful payment
      const { userId, propertyId } = paymentIntent.metadata;
      
      if (userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: 'Payment intent does not belong to authenticated user'
        });
      }

      // Create investment record
      const investmentData = {
        investmentId: `INV_STRIPE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: req.user.userId,
        propertyId,
        paymentIntentId,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency.toUpperCase(),
        paymentMethod: 'stripe',
        status: 'confirmed'
      };

      // Here you would typically create the investment and issue tokens
      console.log('✅ Processing investment:', investmentData);

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          investmentId: investmentData.investmentId,
          amount: investmentData.amount,
          currency: investmentData.currency
        }
      });

    } else {
      res.status(400).json({
        success: false,
        error: 'Payment not completed',
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('❌ Stripe payment confirmation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment'
    });
  }
});

// MoonPay crypto purchase
router.post('/moonpay/create-transaction', auth, requireKYC, async (req, res) => {
  try {
    const { amount, currency, propertyId, walletAddress } = req.body;

    if (!amount || !currency || !propertyId || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create MoonPay transaction
    const moonpayTransaction = await axios.post('https://api.moonpay.com/v3/transactions', {
      baseCurrencyAmount: parseFloat(amount),
      baseCurrencyCode: currency.toLowerCase(),
      currencyCode: 'xrp', // Convert to XRP
      walletAddress: walletAddress,
      redirectURL: `${process.env.FRONTEND_URL}/payment/success`,
      externalCustomerId: req.user.userId
    }, {
      headers: {
        'Authorization': `Api-Key ${process.env.MOONPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: {
        transactionId: moonpayTransaction.data.id,
        redirectUrl: moonpayTransaction.data.redirectUrl,
        amount: parseFloat(amount),
        currency
      }
    });

  } catch (error) {
    console.error('❌ MoonPay transaction creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create MoonPay transaction'
    });
  }
});

// Ramp purchase
router.post('/ramp/create-purchase', auth, requireKYC, async (req, res) => {
  try {
    const { amount, currency, propertyId, walletAddress } = req.body;

    const rampPurchase = await axios.post('https://api.ramp.network/api/host-api/purchase', {
      amount: parseFloat(amount),
      fiatCurrency: currency,
      asset: 'XRP',
      userAddress: walletAddress,
      hostApiKey: process.env.RAMP_API_KEY,
      hostAppName: 'NexVestXR',
      hostLogoUrl: `${process.env.FRONTEND_URL}/logo.png`,
      swapAsset: 'XRP',
      finalUrl: `${process.env.FRONTEND_URL}/payment/success`
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: {
        purchaseId: rampPurchase.data.purchase.id,
        widgetUrl: rampPurchase.data.widgetUrl,
        amount: parseFloat(amount),
        currency
      }
    });

  } catch (error) {
    console.error('❌ Ramp purchase creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Ramp purchase'
    });
  }
});

// Razorpay for Indian users
router.post('/razorpay/create-order', auth, requireKYC, async (req, res) => {
  try {
    const { amount, propertyId } = req.body;

    if (!amount || !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, propertyId'
      });
    }

    // Create Razorpay order
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const order = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount) * 100), // Amount in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: req.user.userId,
        propertyId: propertyId,
        platform: 'nexvestxr'
      }
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: parseFloat(amount),
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('❌ Razorpay order creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Razorpay order'
    });
  }
});

// Webhook for Stripe payments
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      // Process successful payment
      console.log('✅ Stripe payment succeeded:', paymentIntent.id);
      
      // Update investment status, issue tokens, etc.
      // Implementation depends on your business logic
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Stripe webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method } = req.query;
    const userId = req.user.userId;

    // Build query
    const query = { userId };
    if (status) query.status = status;
    if (method) query.paymentMethod = method;

    // Get payments (this would typically come from a Payment model)
    // For now, we'll return mock data
    const payments = [
      {
        id: 'pay_1',
        amount: 1000,
        currency: 'USD',
        method: 'stripe',
        status: 'completed',
        propertyId: 'prop_1',
        createdAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalPayments: payments.length,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to get payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

// Calculate fees for a payment
router.post('/calculate-fees', async (req, res) => {
  try {
    const { amount, currency, method } = req.body;

    if (!amount || !currency || !method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, currency, method'
      });
    }

    const feeStructures = {
      stripe: {
        percentage: 2.9,
        fixed: currency === 'USD' ? 0.30 : 0.25
      },
      moonpay: {
        percentage: 4.5,
        fixed: 0
      },
      ramp: {
        percentage: 2.9,
        fixed: 0
      },
      razorpay: {
        percentage: 2.0,
        fixed: 0
      },
      xrpl: {
        percentage: 0,
        fixed: 0.00001
      }
    };

    const feeStructure = feeStructures[method];
    if (!feeStructure) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method'
      });
    }

    const amountNum = parseFloat(amount);
    const percentageFee = amountNum * (feeStructure.percentage / 100);
    const totalFees = percentageFee + feeStructure.fixed;
    const totalAmount = amountNum + totalFees;

    res.json({
      success: true,
      data: {
        originalAmount: amountNum,
        fees: {
          percentage: percentageFee,
          fixed: feeStructure.fixed,
          total: totalFees
        },
        totalAmount: totalAmount,
        currency,
        method,
        formattedFees: CurrencyService.formatCurrency(totalFees, currency),
        formattedTotal: CurrencyService.formatCurrency(totalAmount, currency)
      }
    });

  } catch (error) {
    console.error('❌ Failed to calculate fees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fees'
    });
  }
});

module.exports = router;