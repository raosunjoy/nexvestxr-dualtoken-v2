// routes/currencyRoutes.js
// API routes for currency and localization

const express = require('express');
const router = express.Router();
const CurrencyService = require('../services/CurrencyService');
const { User, Property, Investment } = require('../database/schemas/currencySchemas');
const auth = require('../middleware/auth');

// Get current exchange rates
router.get('/rates', async (req, res) => {
  try {
    const rates = await CurrencyService.getCurrentRates();
    
    res.json({
      success: true,
      data: {
        rates,
        baseCurrency: 'USD',
        lastUpdated: new Date(),
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'SGD', 'INR']
      }
    });
  } catch (error) {
    console.error('❌ Failed to get exchange rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rates'
    });
  }
});

// Detect user location and currency
router.get('/detect-location', async (req, res) => {
  try {
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);

    const locationData = await CurrencyService.detectUserLocationAndCurrency(clientIP);
    
    res.json({
      success: true,
      data: locationData
    });
  } catch (error) {
    console.error('❌ Failed to detect location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect location',
      data: {
        country: 'Unknown',
        countryCode: 'XX',
        detectedCurrency: 'USD',
        timezone: 'UTC'
      }
    });
  }
});

// Convert currency amounts
router.post('/convert', async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: amount, fromCurrency, toCurrency'
      });
    }

    const convertedAmount = await CurrencyService.convertCurrency(
      parseFloat(amount),
      fromCurrency,
      toCurrency
    );

    const formattedAmount = CurrencyService.formatCurrency(convertedAmount, toCurrency);

    res.json({
      success: true,
      data: {
        originalAmount: parseFloat(amount),
        originalCurrency: fromCurrency,
        convertedAmount,
        targetCurrency: toCurrency,
        formattedAmount,
        exchangeRate: convertedAmount / parseFloat(amount)
      }
    });
  } catch (error) {
    console.error('❌ Currency conversion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Currency conversion failed'
    });
  }
});

// Get currency-specific investment amounts
router.get('/investment-amounts/:currency', (req, res) => {
  try {
    const { currency } = req.params;
    
    const amounts = CurrencyService.getCurrencySpecificAmounts(currency);
    const formattedAmounts = amounts.map(amount => ({
      value: amount,
      formatted: CurrencyService.formatCurrency(amount, currency)
    }));

    res.json({
      success: true,
      data: {
        currency,
        amounts: formattedAmounts,
        minInvestment: amounts[0],
        maxInvestment: amounts[amounts.length - 1]
      }
    });
  } catch (error) {
    console.error('❌ Failed to get investment amounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get investment amounts'
    });
  }
});

// Get currency-specific messaging
router.get('/messaging/:currency', (req, res) => {
  try {
    const { currency } = req.params;
    const { messageType, amount } = req.query;

    const message = CurrencyService.getCurrencySpecificMessaging(
      currency, 
      messageType, 
      amount ? parseFloat(amount) : null
    );

    res.json({
      success: true,
      data: {
        currency,
        messageType,
        message,
        amount: amount ? parseFloat(amount) : null
      }
    });
  } catch (error) {
    console.error('❌ Failed to get currency messaging:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get currency messaging'
    });
  }
});

// Update user currency preference (requires authentication)
router.put('/user/preference', auth, async (req, res) => {
  try {
    const { currency } = req.body;
    const userId = req.user.id;

    if (!currency || !['USD', 'EUR', 'GBP', 'SGD', 'INR'].includes(currency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency. Supported: USD, EUR, GBP, SGD, INR'
      });
    }

    await CurrencyService.updateUserCurrencyPreference(userId, currency);

    res.json({
      success: true,
      message: 'Currency preference updated successfully',
      data: { currency }
    });
  } catch (error) {
    console.error('❌ Failed to update currency preference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update currency preference'
    });
  }
});

// Get user's portfolio value in preferred currency
router.get('/portfolio/value', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency } = req.query;

    const portfolioValue = await CurrencyService.calculatePortfolioValue(userId, currency);

    res.json({
      success: true,
      data: portfolioValue
    });
  } catch (error) {
    console.error('❌ Failed to calculate portfolio value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate portfolio value'
    });
  }
});

// Get B2B messaging (always INR)
router.get('/b2b/messaging/:userType', (req, res) => {
  try {
    const { userType } = req.params; // 'developer' or 'propertyOwner'
    const { amount } = req.query;

    const messaging = CurrencyService.getB2BMessaging(userType, amount);

    res.json({
      success: true,
      data: {
        userType,
        currency: 'INR',
        messaging,
        amount: amount ? parseFloat(amount) : null
      }
    });
  } catch (error) {
    console.error('❌ Failed to get B2B messaging:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get B2B messaging'
    });
  }
});

module.exports = router;

// routes/propertyRoutes.js
// Property routes with currency localization

const express = require('express');
const router = express.Router();
const CurrencyService = require('../services/CurrencyService');
const { Property, User } = require('../database/schemas/currencySchemas');
const auth = require('../middleware/auth');

// Get properties with currency-specific pricing
router.get('/properties', async (req, res) => {
  try {
    const { 
      currency = 'USD', 
      tokenType, 
      minInvestment, 
      maxInvestment, 
      city, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Build query
    const query = { status: 'live' };
    if (tokenType) query.tokenType = tokenType;
    if (city) query['location.city'] = new RegExp(city, 'i');

    // Get properties
    const properties = await Property.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Property.countDocuments(query);

    // Convert pricing for each property
    const propertiesWithConvertedPricing = await Promise.all(
      properties.map(async (property) => {
        const convertedPricing = await CurrencyService.convertPropertyPricing(
          property.toObject(), 
          currency
        );

        return {
          ...property.toObject(),
          convertedPricing: {
            ...convertedPricing,
            currency
          }
        };
      })
    );

    // Filter by converted investment amounts if specified
    let filteredProperties = propertiesWithConvertedPricing;
    if (minInvestment || maxInvestment) {
      filteredProperties = propertiesWithConvertedPricing.filter(property => {
        const minInv = property.convertedPricing.minInvestment;
        if (minInvestment && minInv < parseFloat(minInvestment)) return false;
        if (maxInvestment && minInv > parseFloat(maxInvestment)) return false;
        return true;
      });
    }

    res.json({
      success: true,
      data: {
        properties: filteredProperties,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProperties: total,
          limit: parseInt(limit)
        },
        currency,
        filters: {
          tokenType,
          minInvestment,
          maxInvestment,
          city
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to get properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
});

// Get single property with currency conversion
router.get('/properties/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { currency = 'USD' } = req.query;

    const property = await Property.findOne({ propertyId });
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Convert pricing
    const convertedPricing = await CurrencyService.convertPropertyPricing(
      property.toObject(), 
      currency
    );

    res.json({
      success: true,
      data: {
        ...property.toObject(),
        convertedPricing: {
          ...convertedPricing,
          currency
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to get property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property'
    });
  }
});

// Create property (B2B - always INR)
router.post('/properties', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !['property_owner', 'developer'].includes(user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'Only property owners and developers can create properties'
      });
    }

    const propertyData = {
      ...req.body,
      ownerUserId: userId,
      propertyId: `PROP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Ensure valuation is in INR
    if (!propertyData.valuation || !propertyData.valuation.inr) {
      return res.status(400).json({
        success: false,
        error: 'Property valuation in INR is required'
      });
    }

    // Calculate USD equivalent for international display
    const usdValue = await CurrencyService.convertCurrency(
      propertyData.valuation.inr, 
      'INR', 
      'USD'
    );
    propertyData.valuation.usd = usdValue;

    // Ensure tokenization pricing is in INR
    if (propertyData.tokenization && propertyData.tokenization.tokenPrice) {
      const { tokenPrice } = propertyData.tokenization;
      
      // Calculate minimum investment amounts in all currencies
      tokenPrice.minInvestment = {
        inr: tokenPrice.inr,
        usd: await CurrencyService.convertCurrency(tokenPrice.inr, 'INR', 'USD'),
        eur: await CurrencyService.convertCurrency(tokenPrice.inr, 'INR', 'EUR'),
        gbp: await CurrencyService.convertCurrency(tokenPrice.inr, 'INR', 'GBP'),
        sgd: await CurrencyService.convertCurrency(tokenPrice.inr, 'INR', 'SGD')
      };
    }

    const property = new Property(propertyData);
    await property.save();

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('❌ Failed to create property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create property'
    });
  }
});

module.exports = router;

// routes/investmentRoutes.js
// Investment routes with multi-currency support

const express = require('express');
const router = express.Router();
const CurrencyService = require('../services/CurrencyService');
const { Investment, Property, User } = require('../database/schemas/currencySchemas');
const auth = require('../middleware/auth');

// Create investment with currency conversion
router.post('/invest', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { propertyId, amount, currency, paymentMethod } = req.body;

    // Validate inputs
    if (!propertyId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: propertyId, amount, currency'
      });
    }

    // Get property
    const property = await Property.findOne({ propertyId });
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Convert investment amount to USD (base currency)
    const usdAmount = await CurrencyService.convertCurrency(amount, currency, 'USD');
    const currentRates = await CurrencyService.getCurrentRates();

    // Calculate tokens based on INR pricing
    const tokenPriceInr = property.tokenization.tokenPrice.inr;
    const amountInr = await CurrencyService.convertCurrency(amount, currency, 'INR');
    const tokenQuantity = Math.floor(amountInr / tokenPriceInr);

    if (tokenQuantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Investment amount too small to purchase tokens'
      });
    }

    // Create investment record
    const investmentData = {
      investmentId: `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      propertyId: property._id,
      investment: {
        baseAmount: {
          usd: usdAmount
        },
        originalCurrency: {
          currency,
          amount: parseFloat(amount),
          exchangeRate: currentRates[currency]
        },
        currentValue: {
          currency,
          amount: parseFloat(amount),
          lastUpdated: new Date()
        }
      },
      tokens: {
        quantity: tokenQuantity,
        pricePerToken: {
          currency: 'INR',
          amount: tokenPriceInr
        }
      },
      paymentMethod: paymentMethod || 'xrpl',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const investment = new Investment(investmentData);
    await investment.save();

    // Update property token availability
    await Property.findByIdAndUpdate(property._id, {
      $inc: { 
        'tokenization.tokensAvailable': -tokenQuantity,
        'tokenization.tokensSold': tokenQuantity
      },
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Investment created successfully',
      data: {
        ...investment.toObject(),
        displayAmount: CurrencyService.formatCurrency(amount, currency),
        tokensAcquired: tokenQuantity,
        property: {
          title: property.title,
          location: property.location
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to create investment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create investment'
    });
  }
});

// Get user investments with currency conversion
router.get('/my-investments', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency = 'USD', page = 1, limit = 20 } = req.query;

    // Get user's investments
    const investments = await Investment.find({ userId })
      .populate('propertyId', 'title location tokenType')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Investment.countDocuments({ userId });

    // Convert values to user's preferred currency
    const investmentsWithConvertedValues = await Promise.all(
      investments.map(async (investment) => {
        const currentValue = await CurrencyService.convertCurrency(
          investment.investment.baseAmount.usd,
          'USD',
          currency
        );

        const originalAmount = investment.investment.originalCurrency.amount;
        const roi = ((currentValue - originalAmount) / originalAmount) * 100;

        return {
          ...investment.toObject(),
          convertedValues: {
            currentValue: {
              amount: currentValue,
              formatted: CurrencyService.formatCurrency(currentValue, currency),
              currency
            },
            originalInvestment: {
              amount: originalAmount,
              formatted: CurrencyService.formatCurrency(originalAmount, investment.investment.originalCurrency.currency),
              currency: investment.investment.originalCurrency.currency
            },
            roi: Math.round(roi * 100) / 100,
            profit: {
              amount: currentValue - originalAmount,
              formatted: CurrencyService.formatCurrency(currentValue - originalAmount, currency)
            }
          }
        };
      })
    );

    // Calculate portfolio summary
    const totalInvested = investmentsWithConvertedValues.reduce((sum, inv) => 
      sum + (inv.convertedValues.currentValue.amount || 0), 0
    );

    const totalOriginalInvestment = investmentsWithConvertedValues.reduce((sum, inv) => {
      const originalInCurrency = inv.investment.originalCurrency.currency === currency ? 
        inv.investment.originalCurrency.amount :
        CurrencyService.convertCurrency(inv.investment.originalCurrency.amount, inv.investment.originalCurrency.currency, currency);
      return sum + originalInCurrency;
    }, 0);

    const portfolioROI = totalOriginalInvestment > 0 ? 
      ((totalInvested - totalOriginalInvestment) / totalOriginalInvestment) * 100 : 0;

    res.json({
      success: true,
      data: {
        investments: investmentsWithConvertedValues,
        summary: {
          totalInvestments: investments.length,
          totalValue: {
            amount: totalInvested,
            formatted: CurrencyService.formatCurrency(totalInvested, currency),
            currency
          },
          totalOriginalInvestment: {
            amount: totalOriginalInvestment,
            formatted: CurrencyService.formatCurrency(totalOriginalInvestment, currency),
            currency
          },
          totalProfit: {
            amount: totalInvested - totalOriginalInvestment,
            formatted: CurrencyService.formatCurrency(totalInvested - totalOriginalInvestment, currency),
            currency
          },
          portfolioROI: Math.round(portfolioROI * 100) / 100
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalInvestments: total,
          limit: parseInt(limit)
        },
        currency
      }
    });
  } catch (error) {
    console.error('❌ Failed to get investments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch investments'
    });
  }
});

module.exports = router;

// middleware/currencyDetection.js
// Middleware to automatically detect and set user currency

const CurrencyService = require('../services/CurrencyService');

const currencyDetectionMiddleware = async (req, res, next) => {
  try {
    // Skip for API routes that don't need currency detection
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/webhook')) {
      return next();
    }

    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Detect location and currency
    const locationData = await CurrencyService.detectUserLocationAndCurrency(clientIP);
    
    // Add to request object
    req.detectedLocation = locationData;
    req.detectedCurrency = locationData.detectedCurrency;

    // Check if user has currency preference in headers
    const preferredCurrency = req.headers['x-preferred-currency'];
    if (preferredCurrency && ['USD', 'EUR', 'GBP', 'SGD', 'INR'].includes(preferredCurrency)) {
      req.userCurrency = preferredCurrency;
    } else {
      req.userCurrency = locationData.detectedCurrency;
    }

    next();
  } catch (error) {
    console.error('❌ Currency detection middleware error:', error);
    // Set defaults and continue
    req.detectedLocation = {
      country: 'Unknown',
      countryCode: 'XX',
      detectedCurrency: 'USD',
      timezone: 'UTC'
    };
    req.detectedCurrency = 'USD';
    req.userCurrency = 'USD';
    next();
  }
};

module.exports = currencyDetectionMiddleware;

// utils/currencyUtils.js
// Utility functions for currency operations

const CurrencyService = require('../services/CurrencyService');

class CurrencyUtils {
  // Generate currency-specific marketing content
  static generateMarketingContent(currency, propertyData) {
    const messages = CurrencyService.getCurrencySpecificMessaging(currency, 'platform');
    const investmentAmounts = CurrencyService.getCurrencySpecificAmounts(currency);
    
    return {
      headline: this.getHeadlineByCurrency(currency),
      subheadline: messages,
      ctaText: CurrencyService.getCurrencySpecificMessaging(currency, 'cta'),
      investmentOptions: investmentAmounts.map(amount => ({
        value: amount,
        formatted: CurrencyService.formatCurrency(amount, currency),
        popular: amount === investmentAmounts[2] // Third option is popular
      })),
      successStory: CurrencyService.getCurrencySpecificMessaging(currency, 'success')
    };
  }

  static getHeadlineByurrency(currency) {
    const headlines = {
      'USD': 'Mobile-First Cross-Border Real Estate Investment',
      'EUR': 'European Gateway to Indian Real Estate',
      'GBP': 'From London to Mumbai in 31 Seconds',
      'SGD': 'Singapore to India Real Estate Bridge',
      'INR': 'India\'s Mobile-First Real Estate Platform'
    };
    return headlines[currency] || headlines['USD'];
  }

  // Generate A/B testing variants for different currencies
  static generateABTestVariants(currency) {
    return {
      variantA: {
        investmentAmounts: CurrencyService.getCurrencySpecificAmounts(currency),
        ctaText: `Start with ${CurrencyService.formatCurrency(CurrencyService.getCurrencySpecificAmounts(currency)[0], currency)}`,
        emphasis: 'minimum'
      },
      variantB: {
        investmentAmounts: CurrencyService.getCurrencySpecificAmounts(currency),
        ctaText: `Invest ${CurrencyService.formatCurrency(CurrencyService.getCurrencySpecificAmounts(currency)[2], currency)} today`,
        emphasis: 'popular'
      }
    };
  }

  // Calculate localized ROI projections
  static calculateLocalizedROI(initialInvestment, currency, months = 12) {
    const annualReturn = 0.15; // 15% annual return
    const monthlyReturn = annualReturn / 12;
    const finalValue = initialInvestment * Math.pow(1 + monthlyReturn, months);
    const profit = finalValue - initialInvestment;

    return {
      initialInvestment: {
        amount: initialInvestment,
        formatted: CurrencyService.formatCurrency(initialInvestment, currency)
      },
      projectedValue: {
        amount: finalValue,
        formatted: CurrencyService.formatCurrency(finalValue, currency)
      },
      projectedProfit: {
        amount: profit,
        formatted: CurrencyService.formatCurrency(profit, currency)
      },
      roi: ((profit / initialInvestment) * 100).toFixed(1),
      period: `${months} months`,
      currency
    };
  }

  // Generate region-specific compliance messaging
  static getComplianceMessaging(currency, userType = 'consumer') {
    const compliance = {
      'USD': {
        consumer: 'SEC-compliant investment platform for US investors',
        developer: 'Regulation D offerings for accredited investors'
      },
      'EUR': {
        consumer: 'MiFID II compliant for European investors',
        developer: 'EU regulatory framework compliance'
      },
      'GBP': {
        consumer: 'FCA guidelines compliant for UK investors',
        developer: 'UK financial services compliance'
      },
      'SGD': {
        consumer: 'MAS regulated platform for Singapore investors',
        developer: 'Singapore financial regulations compliance'
      },
      'INR': {
        consumer: 'RBI and SEBI compliant for Indian investors',
        developer: 'Indian real estate regulations compliance'
      }
    };

    return compliance[currency]?.[userType] || compliance['USD'][userType];
  }
}

module.exports = CurrencyUtils;