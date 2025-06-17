const express = require('express');
const router = express.Router();
const { auth, requireKYC, userRateLimit } = require('../middleware/auth');
const UAEProperty = require('../models/UAEProperty');
const UAEUser = require('../models/UAEUser');
const CurrencyService = require('../services/CurrencyService');

// Apply rate limiting
router.use(userRateLimit(100)); // 100 requests per minute

// ============================================================================
// PROPERTY ROUTES (UAE-SPECIFIC)
// ============================================================================

// Get all UAE properties with filtering and pagination
router.get('/properties', async (req, res) => {
  try {
    const {
      city,
      zone,
      propertyType,
      category,
      minPrice,
      maxPrice,
      currency = 'AED',
      bedrooms,
      developer,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      language = 'en'
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };
    
    if (city) filter['location.city'] = city;
    if (zone) filter['location.zone'] = zone;
    if (propertyType) filter.propertyType = propertyType;
    if (category) filter.category = category;
    if (bedrooms) filter['specifications.bedrooms'] = parseInt(bedrooms);
    if (developer) filter['developer.id'] = developer;

    // Price filtering based on currency
    if (minPrice || maxPrice) {
      const priceField = `valuation.${currency.toLowerCase()}`;
      filter[priceField] = {};
      if (minPrice) filter[priceField].$gte = parseFloat(minPrice);
      if (maxPrice) filter[priceField].$lte = parseFloat(maxPrice);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const properties = await UAEProperty.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await UAEProperty.countDocuments(filter);

    // Transform response based on language preference
    const transformedProperties = properties.map(property => ({
      ...property,
      title: property.title[language] || property.title.en,
      description: property.description[language] || property.description.en,
      location: {
        ...property.location,
        address: property.location.address[language] || property.location.address.en
      },
      developer: {
        ...property.developer,
        name: property.developer.name[language] || property.developer.name.en
      }
    }));

    res.json({
      success: true,
      data: {
        properties: transformedProperties,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          currency,
          language,
          appliedFilters: filter
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch UAE properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
});

// Get single property by ID
router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { currency = 'AED', language = 'en' } = req.query;

    const property = await UAEProperty.findOne({
      $or: [{ _id: id }, { id: id }],
      status: 'active'
    }).lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Convert pricing if needed
    let convertedPricing = property.valuation;
    if (currency !== 'AED') {
      const convertedAmount = await CurrencyService.convertCurrency(
        property.valuation.aed,
        'AED',
        currency
      );
      convertedPricing = {
        ...property.valuation,
        [currency.toLowerCase()]: convertedAmount,
        displayCurrency: currency
      };
    }

    // Transform response based on language
    const transformedProperty = {
      ...property,
      title: property.title[language] || property.title.en,
      description: property.description[language] || property.description.en,
      location: {
        ...property.location,
        address: property.location.address[language] || property.location.address.en
      },
      developer: {
        ...property.developer,
        name: property.developer.name[language] || property.developer.name.en
      },
      valuation: convertedPricing
    };

    // Update view count
    await UAEProperty.findByIdAndUpdate(property._id, {
      $inc: { 'metrics.views': 1 },
      $set: { 'metrics.lastUpdated': new Date() }
    });

    res.json({
      success: true,
      data: transformedProperty
    });

  } catch (error) {
    console.error('❌ Failed to fetch property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property'
    });
  }
});

// Get properties by zone/city
router.get('/properties/location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const { currency = 'AED', language = 'en', limit = 10 } = req.query;

    const properties = await UAEProperty.find({
      $or: [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.zone': new RegExp(location, 'i') }
      ],
      status: 'active'
    })
    .limit(parseInt(limit))
    .sort({ 'metrics.views': -1 })
    .lean();

    // Transform properties
    const transformedProperties = await Promise.all(
      properties.map(async (property) => {
        let convertedPrice = property.valuation.aed;
        if (currency !== 'AED') {
          convertedPrice = await CurrencyService.convertCurrency(
            property.valuation.aed,
            'AED',
            currency
          );
        }

        return {
          id: property.id,
          title: property.title[language] || property.title.en,
          location: {
            city: property.location.city,
            zone: property.location.zone,
            address: property.location.address[language] || property.location.address.en
          },
          price: convertedPrice,
          currency,
          propertyType: property.propertyType,
          image: property.media.images[0]?.url,
          developer: property.developer.name[language] || property.developer.name.en
        };
      })
    );

    res.json({
      success: true,
      data: transformedProperties
    });

  } catch (error) {
    console.error('❌ Failed to fetch properties by location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties by location'
    });
  }
});

// ============================================================================
// INVESTMENT ROUTES
// ============================================================================

// Invest in a property
router.post('/invest', auth, requireKYC, async (req, res) => {
  try {
    const { propertyId, amount, currency = 'AED' } = req.body;
    const userId = req.user.id;

    if (!propertyId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Property ID and amount are required'
      });
    }

    // Get property and user
    const property = await UAEProperty.findOne({
      $or: [{ _id: propertyId }, { id: propertyId }],
      status: 'active'
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    const user = await UAEUser.findById(userId);
    if (!user.canInvest) {
      return res.status(403).json({
        success: false,
        error: 'User not eligible to invest'
      });
    }

    // Convert amount to AED if needed
    let aedAmount = amount;
    if (currency !== 'AED') {
      aedAmount = await CurrencyService.convertCurrency(amount, currency, 'AED');
    }

    // Check investment limits
    if (!user.canInvestAmount(aedAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Investment amount exceeds daily limit'
      });
    }

    // Check minimum investment
    const tierLimits = property.investmentTiers[user.investmentProfile.tier];
    if (aedAmount < tierLimits.minAmount) {
      return res.status(400).json({
        success: false,
        error: `Minimum investment for ${user.investmentProfile.tier} tier is AED ${tierLimits.minAmount}`
      });
    }

    // Calculate tokens
    const tokenPrice = property.tokenization.tokenPrice.aed;
    const tokens = Math.floor(aedAmount / tokenPrice);

    if (tokens === 0) {
      return res.status(400).json({
        success: false,
        error: 'Investment amount too small to purchase tokens'
      });
    }

    // Update property
    await property.addInvestment(aedAmount);

    // Update user portfolio
    await user.addInvestment(aedAmount, currency);

    // Add to user portfolio
    const portfolioEntry = {
      propertyId: property.id,
      tokens,
      invested: aedAmount,
      currency: 'AED',
      purchaseDate: new Date(),
      currentValue: aedAmount
    };

    user.portfolio.properties.push(portfolioEntry);
    await user.save();

    // Log investment activity
    console.log(`✅ Investment successful: User ${userId} invested ${amount} ${currency} in property ${propertyId}`);

    res.status(201).json({
      success: true,
      message: 'Investment successful',
      data: {
        investment: {
          propertyId: property.id,
          amount: aedAmount,
          currency: 'AED',
          tokens,
          tokenPrice,
          transactionId: `TXN_${Date.now()}_${userId}`
        },
        property: {
          id: property.id,
          title: property.title.en,
          fundingProgress: property.fundingProgress
        }
      }
    });

  } catch (error) {
    console.error('❌ Investment failed:', error);
    res.status(500).json({
      success: false,
      error: 'Investment failed'
    });
  }
});

// Get user's investment portfolio
router.get('/portfolio', auth, async (req, res) => {
  try {
    const { currency = 'AED', language = 'en' } = req.query;
    const userId = req.user.id;

    const user = await UAEUser.findById(userId)
      .populate('portfolio.properties')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate portfolio value in requested currency
    const portfolioValue = await CurrencyService.calculatePortfolioValue(userId, currency);

    // Get detailed property information
    const detailedPortfolio = await Promise.all(
      user.portfolio.properties.map(async (investment) => {
        const property = await UAEProperty.findOne({
          $or: [{ _id: investment.propertyId }, { id: investment.propertyId }]
        }).lean();

        if (!property) return null;

        let currentValue = investment.invested;
        if (currency !== 'AED') {
          currentValue = await CurrencyService.convertCurrency(
            investment.currentValue || investment.invested,
            'AED',
            currency
          );
        }

        return {
          property: {
            id: property.id,
            title: property.title[language] || property.title.en,
            location: property.location.zone,
            image: property.media.images[0]?.url,
            propertyType: property.propertyType
          },
          investment: {
            tokens: investment.tokens,
            invested: currency === 'AED' ? investment.invested : 
              await CurrencyService.convertCurrency(investment.invested, 'AED', currency),
            currentValue,
            currency,
            purchaseDate: investment.purchaseDate,
            performance: ((currentValue - (currency === 'AED' ? investment.invested : 
              await CurrencyService.convertCurrency(investment.invested, 'AED', currency))) / 
              (currency === 'AED' ? investment.invested : 
              await CurrencyService.convertCurrency(investment.invested, 'AED', currency))) * 100
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        portfolio: {
          totalValue: portfolioValue.totalValue,
          currency: portfolioValue.currency,
          formattedValue: portfolioValue.formattedValue,
          performance: user.portfolio.performance,
          properties: detailedPortfolio.filter(Boolean)
        },
        summary: {
          totalInvested: user.portfolio.totalInvested,
          totalReturns: user.portfolio.totalReturns,
          dividendsEarned: user.portfolio.dividendsEarned,
          propertyCount: user.portfolio.properties.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio'
    });
  }
});

// ============================================================================
// CURRENCY AND LOCALIZATION ROUTES
// ============================================================================

// Get supported currencies
router.get('/currencies', async (req, res) => {
  try {
    const currencies = [
      { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', primary: true },
      { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', region: 'GCC' },
      { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦', region: 'GCC' },
      { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼', region: 'GCC' },
      { code: 'USD', name: 'US Dollar', flag: '🇺🇸', region: 'International' },
      { code: 'EUR', name: 'Euro', flag: '🇪🇺', region: 'International' },
      { code: 'GBP', name: 'British Pound', flag: '🇬🇧', region: 'International' },
      { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', region: 'International' },
      { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', region: 'Emerging' }
    ];

    // Get current exchange rates
    const rates = await CurrencyService.getCurrentRates();

    res.json({
      success: true,
      data: {
        currencies,
        exchangeRates: rates,
        baseCurrency: 'AED',
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch currencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currencies'
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
        error: 'Amount, fromCurrency, and toCurrency are required'
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
        fromCurrency,
        toCurrency,
        convertedAmount,
        formattedAmount,
        exchangeRate: convertedAmount / parseFloat(amount),
        timestamp: new Date()
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

// ============================================================================
// UAE COMPLIANCE AND REGULATORY ROUTES
// ============================================================================

// RERA property verification
router.get('/compliance/rera/:propertyId', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;

    const property = await UAEProperty.findOne({
      $or: [{ _id: propertyId }, { id: propertyId }]
    }).lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Mock RERA verification (in production, this would call RERA API)
    const reraVerification = {
      registrationNumber: property.compliance.rera.registrationNumber,
      status: property.compliance.rera.status,
      registered: property.compliance.rera.registered,
      expiryDate: property.compliance.rera.expiryDate,
      verified: property.compliance.rera.status === 'active',
      lastChecked: new Date()
    };

    res.json({
      success: true,
      data: {
        propertyId: property.id,
        rera: reraVerification,
        compliance: {
          overall: reraVerification.verified ? 'compliant' : 'non_compliant',
          checks: {
            rera_registered: reraVerification.registered,
            status_active: reraVerification.status === 'active',
            not_expired: new Date(reraVerification.expiryDate) > new Date()
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ RERA verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'RERA verification failed'
    });
  }
});

// User KYC status and requirements
router.get('/compliance/kyc', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await UAEUser.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const kycRequirements = {
      standard: ['emirates_id', 'passport'],
      enhanced: ['emirates_id', 'passport', 'salary_certificate'],
      comprehensive: ['emirates_id', 'passport', 'salary_certificate', 'bank_statement', 'trade_license']
    };

    const currentLevel = user.kyc.level;
    const requiredDocs = kycRequirements[currentLevel];
    const submittedDocs = Object.keys(user.kyc.documents).filter(
      doc => user.kyc.documents[doc].submitted
    );
    const verifiedDocs = Object.keys(user.kyc.documents).filter(
      doc => user.kyc.documents[doc].verified
    );

    const completionPercentage = (verifiedDocs.length / requiredDocs.length) * 100;

    res.json({
      success: true,
      data: {
        kyc: {
          status: user.kyc.status,
          level: user.kyc.level,
          completionPercentage: Math.round(completionPercentage),
          expiryDate: user.kyc.expiryDate
        },
        documents: {
          required: requiredDocs,
          submitted: submittedDocs,
          verified: verifiedDocs,
          pending: submittedDocs.filter(doc => !verifiedDocs.includes(doc))
        },
        aml: user.kyc.aml,
        investmentEligibility: {
          eligible: user.flags.investmentEligible,
          tier: user.investmentProfile.tier,
          limits: user.limits
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch KYC status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC status'
    });
  }
});

// ============================================================================
// ANALYTICS AND INSIGHTS
// ============================================================================

// Market analytics for UAE properties
router.get('/analytics/market', async (req, res) => {
  try {
    const { zone, propertyType, currency = 'AED', timeframe = '30d' } = req.query;

    // Build aggregation pipeline
    const matchStage = { status: 'active' };
    if (zone) matchStage['location.zone'] = zone;
    if (propertyType) matchStage.propertyType = propertyType;

    const analytics = await UAEProperty.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          averagePrice: { $avg: '$valuation.aed' },
          medianPrice: { $median: '$valuation.aed' },
          totalProperties: { $sum: 1 },
          totalValue: { $sum: '$valuation.aed' },
          pricePerSqft: { $avg: '$valuation.pricePerSqft' }
        }
      }
    ]);

    // Convert to requested currency if needed
    let convertedAnalytics = analytics[0];
    if (currency !== 'AED' && analytics[0]) {
      convertedAnalytics = {
        ...analytics[0],
        averagePrice: await CurrencyService.convertCurrency(analytics[0].averagePrice, 'AED', currency),
        medianPrice: await CurrencyService.convertCurrency(analytics[0].medianPrice, 'AED', currency),
        totalValue: await CurrencyService.convertCurrency(analytics[0].totalValue, 'AED', currency),
        pricePerSqft: await CurrencyService.convertCurrency(analytics[0].pricePerSqft, 'AED', currency),
        currency
      };
    }

    res.json({
      success: true,
      data: {
        market: convertedAnalytics || {
          averagePrice: 0,
          medianPrice: 0,
          totalProperties: 0,
          totalValue: 0,
          pricePerSqft: 0,
          currency
        },
        filters: { zone, propertyType, currency, timeframe },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch market analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market analytics'
    });
  }
});

module.exports = router;