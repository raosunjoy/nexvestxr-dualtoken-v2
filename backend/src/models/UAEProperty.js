const mongoose = require('mongoose');

// UAE-specific property schema with RERA compliance
const uaePropertySchema = new mongoose.Schema({
  // Basic Property Information
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  description: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  
  // Location Information (UAE-specific)
  location: {
    city: {
      type: String,
      required: true,
      enum: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah', 'Ras Al Khaimah', 'Umm Al Quwain']
    },
    zone: {
      type: String,
      required: true,
      enum: [
        'Downtown Dubai', 'Dubai Marina', 'Business Bay', 'Jumeirah Lake Towers',
        'DIFC', 'Palm Jumeirah', 'Dubai Hills', 'Arabian Ranches', 'Mirdif',
        'Al Reem Island', 'Yas Island', 'Saadiyat Island', 'Al Khalidiyah'
      ]
    },
    zoneCode: {
      type: String,
      required: true,
      enum: ['DXB_DT', 'DXB_MR', 'DXB_BB', 'DXB_JLT', 'DXB_DIFC', 'DXB_PJ', 'DXB_DH', 'DXB_AR', 'DXB_MDF']
    },
    address: {
      en: { type: String, required: true },
      ar: { type: String, required: true }
    },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    nearbyLandmarks: [{
      name: {
        en: String,
        ar: String
      },
      distance: Number, // in meters
      type: {
        type: String,
        enum: ['metro', 'mall', 'hospital', 'school', 'mosque', 'beach', 'airport']
      }
    }]
  },

  // Property Type and Specifications
  propertyType: {
    type: String,
    required: true,
    enum: ['apartment', 'villa', 'townhouse', 'penthouse', 'office', 'retail', 'warehouse', 'hotel_apartment']
  },
  category: {
    type: String,
    required: true,
    enum: ['residential', 'commercial', 'industrial', 'hospitality']
  },
  specifications: {
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    area: {
      built: { type: Number, required: true }, // in sqft
      plot: { type: Number }, // for villas/townhouses
      unit: { type: String, default: 'sqft', enum: ['sqft', 'sqm'] }
    },
    floor: { type: Number },
    totalFloors: { type: Number },
    parking: { type: Number, default: 0 },
    balcony: { type: Boolean, default: false },
    furnished: {
      type: String,
      enum: ['unfurnished', 'semi-furnished', 'fully-furnished'],
      default: 'unfurnished'
    },
    amenities: [{
      type: String,
      enum: [
        'swimming_pool', 'gym', 'sauna', 'steam_room', 'jacuzzi',
        'children_play_area', 'bbq_area', 'garden', 'balcony',
        'maid_room', 'study_room', 'storage_room', 'laundry_room',
        'security', 'concierge', 'valet_parking', 'business_center'
      ]
    }]
  },

  // Financial Information (AED-based)
  valuation: {
    aed: { type: Number, required: true, min: 100000 }, // Minimum AED 100k
    usd: { type: Number }, // Auto-calculated
    eur: { type: Number }, // Auto-calculated
    currency: { type: String, default: 'AED' },
    valuationDate: { type: Date, default: Date.now },
    valuationMethod: {
      type: String,
      enum: ['comparable_sales', 'income_approach', 'cost_approach', 'ai_valuation'],
      default: 'ai_valuation'
    },
    pricePerSqft: { type: Number }, // Auto-calculated
    marketValue: { type: Number }, // Current market estimate
    appreciationRate: { type: Number, default: 0 } // Annual %
  },

  // Investment and Tokenization
  tokenization: {
    isTokenized: { type: Boolean, default: false },
    tokenType: {
      type: String,
      enum: ['XERA', 'PROPX'],
      required: function() { return this.tokenization.isTokenized; }
    },
    totalTokens: { type: Number },
    availableTokens: { type: Number },
    tokenPrice: {
      aed: { type: Number },
      minInvestment: {
        aed: { type: Number, default: 25000 }, // AED 25k minimum
        usd: { type: Number },
        eur: { type: Number }
      }
    },
    fundingTarget: {
      aed: { type: Number },
      raised: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    },
    fundingDeadline: { type: Date },
    fundingStatus: {
      type: String,
      enum: ['pending', 'active', 'funded', 'cancelled'],
      default: 'pending'
    }
  },

  // Developer Information
  developer: {
    id: { type: String, required: true },
    name: {
      en: { type: String, required: true },
      ar: { type: String, required: true }
    },
    tier: {
      type: Number,
      enum: [1, 2],
      required: true
    },
    verified: { type: Boolean, default: false },
    reraLicense: { type: String, required: true }, // RERA license number
    tradeLicense: { type: String, required: true },
    completedProjects: { type: Number, default: 0 },
    platformFee: { type: Number }, // Percentage
    reputation: {
      score: { type: Number, min: 0, max: 10, default: 5 },
      reviews: { type: Number, default: 0 },
      onTimeDelivery: { type: Number, default: 0 } // Percentage
    }
  },

  // UAE Regulatory Compliance
  compliance: {
    rera: {
      registered: { type: Boolean, required: true },
      registrationNumber: { type: String, required: true },
      expiryDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['active', 'pending', 'expired', 'suspended'],
        default: 'pending'
      }
    },
    dld: {
      titleDeed: { type: String }, // Title deed number
      registered: { type: Boolean, default: false },
      registrationDate: { type: Date },
      ownership: {
        type: String,
        enum: ['freehold', 'leasehold'],
        required: true
      }
    },
    permits: [{
      type: {
        type: String,
        enum: ['building_permit', 'occupancy_certificate', 'completion_certificate']
      },
      number: String,
      issueDate: Date,
      expiryDate: Date,
      authority: String
    }],
    environmental: {
      greenBuilding: { type: Boolean, default: false },
      certification: String, // LEED, BREEAM, etc.
      sustainabilityScore: { type: Number, min: 0, max: 100 }
    }
  },

  // Investment Tiers and Eligibility
  investmentTiers: {
    retail: {
      enabled: { type: Boolean, default: true },
      minAmount: { type: Number, default: 25000 }, // AED
      maxAmount: { type: Number, default: 500000 }, // AED
      kycLevel: { type: String, default: 'standard' }
    },
    premium: {
      enabled: { type: Boolean, default: true },
      minAmount: { type: Number, default: 500000 }, // AED
      maxAmount: { type: Number, default: 2000000 }, // AED
      kycLevel: { type: String, default: 'enhanced' }
    },
    institutional: {
      enabled: { type: Boolean, default: false },
      minAmount: { type: Number, default: 2000000 }, // AED
      kycLevel: { type: String, default: 'comprehensive' }
    }
  },

  // AI and Analytics
  aiAnalysis: {
    riskScore: { type: Number, min: 0, max: 100 },
    liquidityScore: { type: Number, min: 0, max: 100 },
    growthPotential: { type: Number, min: 0, max: 100 },
    marketTrend: {
      type: String,
      enum: ['bullish', 'bearish', 'neutral'],
      default: 'neutral'
    },
    similarProperties: [String], // Property IDs
    priceHistory: [{
      date: Date,
      price: Number,
      source: String
    }],
    predictedValue: {
      oneYear: Number,
      threeYear: Number,
      fiveYear: Number
    }
  },

  // Social and Community Features
  social: {
    confidenceScore: { type: Number, min: 0, max: 100, default: 50 },
    reviewCount: { type: Number, default: 0 },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    communityScore: { type: Number, min: 0, max: 100 },
    trustLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'verified'],
      default: 'medium'
    }
  },

  // Media and Documentation
  media: {
    images: [{
      url: String,
      type: { type: String, enum: ['exterior', 'interior', 'amenity', 'floor_plan'] },
      caption: {
        en: String,
        ar: String
      },
      order: Number
    }],
    videos: [{
      url: String,
      type: { type: String, enum: ['tour', 'drone', 'amenity'] },
      thumbnail: String,
      duration: Number
    }],
    documents: [{
      type: {
        type: String,
        enum: ['floor_plan', 'brochure', 'title_deed', 'permit', 'noc', 'valuation_report']
      },
      url: String,
      filename: String,
      uploadDate: { type: Date, default: Date.now },
      verified: { type: Boolean, default: false }
    }],
    virtualTour: {
      enabled: { type: Boolean, default: false },
      url: String,
      provider: String
    }
  },

  // Status and Workflow
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'active', 'sold_out', 'suspended', 'cancelled'],
    default: 'draft'
  },
  workflow: {
    submittedDate: { type: Date, default: Date.now },
    reviewedDate: Date,
    approvedDate: Date,
    publishedDate: Date,
    reviewer: String,
    approver: String,
    rejectionReason: String
  },

  // Performance Metrics
  metrics: {
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    investments: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },

  // Multi-currency support
  currencies: {
    supported: {
      type: [String],
      default: ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD']
    },
    preferredDisplay: { type: String, default: 'AED' }
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: Date
}, {
  timestamps: true,
  collection: 'uae_properties'
});

// Indexes for performance
uaePropertySchema.index({ 'location.city': 1, 'location.zone': 1 });
uaePropertySchema.index({ propertyType: 1, category: 1 });
uaePropertySchema.index({ 'valuation.aed': 1 });
uaePropertySchema.index({ 'developer.tier': 1, 'developer.verified': 1 });
uaePropertySchema.index({ status: 1, 'tokenization.isTokenized': 1 });
uaePropertySchema.index({ 'compliance.rera.status': 1 });
uaePropertySchema.index({ createdAt: -1 });

// Virtual fields
uaePropertySchema.virtual('pricePerSqft').get(function() {
  return this.valuation.aed / this.specifications.area.built;
});

uaePropertySchema.virtual('fundingProgress').get(function() {
  if (!this.tokenization.fundingTarget.aed) return 0;
  return (this.tokenization.raised / this.tokenization.fundingTarget.aed) * 100;
});

// Pre-save middleware
uaePropertySchema.pre('save', async function(next) {
  if (this.isModified('valuation.aed')) {
    // Auto-calculate USD and EUR values
    const CurrencyService = require('../services/CurrencyService');
    this.valuation.usd = await CurrencyService.convertCurrency(this.valuation.aed, 'AED', 'USD');
    this.valuation.eur = await CurrencyService.convertCurrency(this.valuation.aed, 'AED', 'EUR');
    this.valuation.pricePerSqft = this.valuation.aed / this.specifications.area.built;
  }
  
  this.updatedAt = new Date();
  next();
});

// Static methods
uaePropertySchema.statics.findByZone = function(zone) {
  return this.find({ 'location.zone': zone, status: 'active' });
};

uaePropertySchema.statics.findByPriceRange = function(minPrice, maxPrice, currency = 'AED') {
  const field = `valuation.${currency.toLowerCase()}`;
  return this.find({
    [field]: { $gte: minPrice, $lte: maxPrice },
    status: 'active'
  });
};

uaePropertySchema.statics.findByDeveloper = function(developerId) {
  return this.find({ 'developer.id': developerId, status: 'active' });
};

// Instance methods
uaePropertySchema.methods.updateConfidenceScore = function(score) {
  this.social.confidenceScore = Math.max(0, Math.min(100, score));
  return this.save();
};

uaePropertySchema.methods.addInvestment = function(amount) {
  this.tokenization.raised += amount;
  this.tokenization.percentage = (this.tokenization.raised / this.tokenization.fundingTarget.aed) * 100;
  this.metrics.investments += 1;
  return this.save();
};

module.exports = mongoose.model('UAEProperty', uaePropertySchema);