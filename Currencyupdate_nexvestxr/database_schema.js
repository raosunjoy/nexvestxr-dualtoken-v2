// database/schemas/currencySchemas.js
// Complete database schema for multi-currency NexVestXR platform

const mongoose = require('mongoose');

// Currency Exchange Rates Schema
const exchangeRateSchema = new mongoose.Schema({
  baseCurrency: {
    type: String,
    default: 'USD',
    required: true
  },
  rates: {
    USD: { type: Number, required: true, default: 1.0 },
    EUR: { type: Number, required: true },
    GBP: { type: Number, required: true },
    SGD: { type: Number, required: true },
    INR: { type: Number, required: true }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'exchangerate-api.com'
  }
});

// User Schema with Currency Preferences
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  phoneNumber: String,
  
  // Geographic & Currency Info
  country: String,
  detectedCountry: String, // IP-based detection
  preferredCurrency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'SGD', 'INR'],
    default: 'USD'
  },
  detectedCurrency: String, // IP-based detection
  timezone: String,
  
  // Investment Profile
  userType: {
    type: String,
    enum: ['consumer', 'property_owner', 'developer'],
    default: 'consumer'
  },
  accreditedInvestor: { type: Boolean, default: false },
  
  // Financial Info (stored in base USD, displayed in preferred currency)
  totalInvestment: {
    usd: { type: Number, default: 0 },
    displayCurrency: String, // User's preferred currency
    displayAmount: Number    // Amount in preferred currency
  },
  
  // KYC and Compliance
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: Date,
  preferences: {
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: true }
  }
});

// Property Schema (Always INR for B2B)
const propertySchema = new mongoose.Schema({
  propertyId: { type: String, unique: true, required: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Property Details
  title: { type: String, required: true },
  description: String,
  location: {
    address: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Financial Info (Always in INR for properties)
  valuation: {
    inr: { type: Number, required: true }, // Base currency for all properties
    usd: Number, // Converted for display to international users
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Tokenization Details
  tokenization: {
    totalTokens: Number,
    tokenPrice: {
      inr: Number, // Base price in INR
      minInvestment: {
        usd: Number,
        eur: Number,
        gbp: Number,
        sgd: Number,
        inr: Number
      }
    },
    tokensAvailable: Number,
    tokensSold: Number,
    fundingGoal: {
      inr: Number,
      percentageToTokenize: { type: Number, min: 1, max: 100 }
    }
  },
  
  // Property Type
  propertyType: {
    type: String,
    enum: ['residential', 'commercial', 'industrial', 'agricultural'],
    required: true
  },
  
  // XERA or PROPX
  tokenType: {
    type: String,
    enum: ['XERA', 'PROPX'],
    required: true
  },
  
  // For PROPX (Developer Properties)
  developer: {
    name: String,
    registrationNumber: String,
    contactInfo: {
      email: String,
      phone: String
    },
    projectTimeline: {
      startDate: Date,
      expectedCompletion: Date
    }
  },
  
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'live', 'sold_out', 'completed'],
    default: 'draft'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Investment Schema with Multi-Currency Support
const investmentSchema = new mongoose.Schema({
  investmentId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  
  // Investment Amount
  investment: {
    // Base amount in USD for calculations
    baseAmount: {
      usd: { type: Number, required: true }
    },
    // Original investment in user's currency
    originalCurrency: {
      currency: { type: String, required: true },
      amount: { type: Number, required: true },
      exchangeRate: { type: Number, required: true } // Rate at time of investment
    },
    // Current value in user's preferred currency
    currentValue: {
      currency: String,
      amount: Number,
      lastUpdated: Date
    }
  },
  
  // Token Details
  tokens: {
    quantity: { type: Number, required: true },
    pricePerToken: {
      currency: String,
      amount: Number
    }
  },
  
  // Transaction Details
  transactionHash: String, // XRPL transaction hash
  paymentMethod: {
    type: String,
    enum: ['xrpl', 'stripe', 'wire_transfer', 'crypto'],
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Performance Tracking
  returns: {
    totalReturns: {
      usd: Number,
      userCurrency: {
        currency: String,
        amount: Number
      }
    },
    roi: Number, // Return on Investment percentage
    dividendsPaid: [{
      date: Date,
      amount: {
        usd: Number,
        userCurrency: {
          currency: String,
          amount: Number
        }
      }
    }]
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Marketing Campaign Schema (Currency-Specific)
const campaignSchema = new mongoose.Schema({
  campaignId: { type: String, unique: true, required: true },
  name: String,
  
  // Targeting
  targeting: {
    countries: [String],
    currencies: [String],
    userTypes: [String],
    ageRange: {
      min: Number,
      max: Number
    }
  },
  
  // Localized Content
  content: {
    USD: {
      headline: String,
      description: String,
      cta: String,
      investmentAmounts: [Number]
    },
    EUR: {
      headline: String,
      description: String,
      cta: String,
      investmentAmounts: [Number]
    },
    GBP: {
      headline: String,
      description: String,
      cta: String,
      investmentAmounts: [Number]
    },
    SGD: {
      headline: String,
      description: String,
      cta: String,
      investmentAmounts: [Number]
    },
    INR: {
      headline: String,
      description: String,
      cta: String,
      investmentAmounts: [Number]
    }
  },
  
  // Performance Metrics
  metrics: {
    impressions: {
      USD: Number,
      EUR: Number,
      GBP: Number,
      SGD: Number,
      INR: Number
    },
    clicks: {
      USD: Number,
      EUR: Number,
      GBP: Number,
      SGD: Number,
      INR: Number
    },
    conversions: {
      USD: Number,
      EUR: Number,
      GBP: Number,
      SGD: Number,
      INR: Number
    }
  },
  
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for performance
exchangeRateSchema.index({ lastUpdated: -1 });
userSchema.index({ email: 1 });
userSchema.index({ country: 1, preferredCurrency: 1 });
propertySchema.index({ propertyId: 1 });
propertySchema.index({ tokenType: 1, status: 1 });
investmentSchema.index({ userId: 1, propertyId: 1 });
investmentSchema.index({ 'investment.originalCurrency.currency': 1 });

// Create models
const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);
const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);
const Investment = mongoose.model('Investment', investmentSchema);
const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = {
  ExchangeRate,
  User,
  Property,
  Investment,
  Campaign
};