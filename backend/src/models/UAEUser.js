const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// UAE-specific user schema with international compliance
const uaeUserSchema = new mongoose.Schema({
  // Basic User Information
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    countryCode: { type: String, required: true }, // +971, +966, etc.
    number: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verificationCode: String,
    verificationExpiry: Date
  },
  password: {
    hash: { type: String, required: true },
    salt: String,
    lastChanged: { type: Date, default: Date.now },
    resetToken: String,
    resetExpiry: Date
  },

  // Personal Information
  profile: {
    firstName: {
      en: { type: String, required: true },
      ar: String
    },
    lastName: {
      en: { type: String, required: true },
      ar: String
    },
    displayName: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    nationality: { type: String, required: true }, // ISO country code
    profilePicture: String,
    bio: {
      en: String,
      ar: String
    }
  },

  // Location and Residence
  location: {
    country: { type: String, required: true }, // Current residence
    city: String,
    emirate: {
      type: String,
      enum: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah', 'Ras Al Khaimah', 'Umm Al Quwain']
    },
    address: {
      street: String,
      building: String,
      apartment: String,
      area: String,
      poBox: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    residencyStatus: {
      type: String,
      enum: ['citizen', 'resident', 'visitor', 'investor_visa'],
      required: true
    }
  },

  // User Type and Investment Profile
  userType: {
    type: String,
    enum: ['consumer', 'property_owner', 'developer', 'institutional'],
    required: true,
    default: 'consumer'
  },
  investmentProfile: {
    tier: {
      type: String,
      enum: ['retail', 'premium', 'institutional'],
      default: 'retail'
    },
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate'
    },
    investmentGoals: [{
      type: String,
      enum: ['capital_appreciation', 'rental_income', 'portfolio_diversification', 'speculation']
    }],
    totalInvested: { type: Number, default: 0 },
    portfolioValue: { type: Number, default: 0 },
    preferredPropertyTypes: [String],
    preferredLocations: [String]
  },

  // Currency and Localization Preferences
  preferences: {
    currency: {
      primary: { type: String, default: 'AED' },
      display: { type: String, default: 'AED' },
      autoDetect: { type: Boolean, default: true }
    },
    language: {
      primary: { type: String, enum: ['en', 'ar'], default: 'en' },
      secondary: String,
      rtlMode: { type: Boolean, default: false }
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'monthly'],
        default: 'daily'
      },
      types: {
        propertyUpdates: { type: Boolean, default: true },
        priceAlerts: { type: Boolean, default: true },
        dividends: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false }
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'connections_only'],
        default: 'private'
      },
      dataSharing: { type: Boolean, default: false },
      analyticsTracking: { type: Boolean, default: true }
    }
  },

  // KYC and Compliance
  kyc: {
    status: {
      type: String,
      enum: ['pending', 'submitted', 'under_review', 'approved', 'rejected', 'expired'],
      default: 'pending'
    },
    level: {
      type: String,
      enum: ['standard', 'enhanced', 'comprehensive'],
      default: 'standard'
    },
    documents: {
      emirates_id: {
        submitted: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        url: String,
        expiryDate: Date,
        number: String
      },
      passport: {
        submitted: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        url: String,
        expiryDate: Date,
        number: String,
        issuingCountry: String
      },
      visa: {
        submitted: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        url: String,
        expiryDate: Date,
        type: String
      },
      salary_certificate: {
        submitted: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        url: String,
        employer: String,
        salary: Number
      },
      bank_statement: {
        submitted: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        url: String,
        bankName: String,
        months: Number
      },
      trade_license: {
        submitted: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        url: String,
        licenseNumber: String,
        issuingAuthority: String
      },
      proof_of_address: {
        submitted: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        url: String,
        type: String
      }
    },
    aml: {
      checked: { type: Boolean, default: false },
      checkedDate: Date,
      status: {
        type: String,
        enum: ['clear', 'flagged', 'under_investigation'],
        default: 'clear'
      },
      riskScore: { type: Number, min: 0, max: 100, default: 0 },
      pepCheck: { type: Boolean, default: false },
      sanctionsCheck: { type: Boolean, default: false }
    },
    fatf: {
      compliant: { type: Boolean, default: true },
      jurisdiction: String,
      lastChecked: Date
    },
    reviewer: String,
    reviewDate: Date,
    rejectionReason: String,
    expiryDate: Date
  },

  // Financial Information
  financial: {
    annualIncome: {
      amount: Number,
      currency: { type: String, default: 'AED' },
      verified: { type: Boolean, default: false }
    },
    netWorth: {
      amount: Number,
      currency: { type: String, default: 'AED' },
      lastUpdated: Date
    },
    employmentStatus: {
      type: String,
      enum: ['employed', 'self_employed', 'unemployed', 'retired', 'student']
    },
    employer: {
      name: String,
      industry: String,
      position: String,
      yearsOfService: Number
    },
    bankDetails: {
      bankName: String,
      iban: String,
      swift: String,
      verified: { type: Boolean, default: false }
    },
    creditScore: {
      score: Number,
      provider: String,
      lastUpdated: Date
    }
  },

  // Investment Limits and Restrictions
  limits: {
    daily: {
      investment: { type: Number, default: 50000 }, // AED
      withdrawal: { type: Number, default: 25000 }, // AED
      trading: { type: Number, default: 100000 } // AED
    },
    monthly: {
      investment: { type: Number, default: 500000 }, // AED
      withdrawal: { type: Number, default: 250000 } // AED
    },
    annual: {
      investment: { type: Number, default: 2000000 }, // AED
      withdrawal: { type: Number, default: 1000000 } // AED
    },
    used: {
      dailyInvestment: { type: Number, default: 0 },
      dailyWithdrawal: { type: Number, default: 0 },
      dailyTrading: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    }
  },

  // Security Settings
  security: {
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      method: {
        type: String,
        enum: ['sms', 'email', 'authenticator'],
        default: 'sms'
      },
      secret: String,
      backupCodes: [String],
      lastUsed: Date
    },
    sessions: [{
      id: String,
      deviceInfo: {
        userAgent: String,
        ip: String,
        location: String,
        device: String
      },
      createdAt: { type: Date, default: Date.now },
      lastActivity: { type: Date, default: Date.now },
      active: { type: Boolean, default: true }
    }],
    loginAttempts: {
      count: { type: Number, default: 0 },
      lastAttempt: Date,
      lockedUntil: Date
    },
    apiKeys: [{
      id: String,
      name: String,
      key: String,
      permissions: [String],
      createdAt: { type: Date, default: Date.now },
      lastUsed: Date,
      active: { type: Boolean, default: true }
    }]
  },

  // Investments and Portfolio
  portfolio: {
    properties: [{
      propertyId: String,
      tokens: Number,
      invested: Number,
      currency: String,
      purchaseDate: Date,
      currentValue: Number,
      dividends: Number
    }],
    totalInvested: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    totalReturns: { type: Number, default: 0 },
    dividendsEarned: { type: Number, default: 0 },
    performance: {
      roi: { type: Number, default: 0 }, // Return on Investment %
      irr: { type: Number, default: 0 }, // Internal Rate of Return %
      lastCalculated: Date
    }
  },

  // Activity and Engagement
  activity: {
    lastLogin: Date,
    lastActivity: Date,
    loginCount: { type: Number, default: 0 },
    sessionsCount: { type: Number, default: 0 },
    investmentCount: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },
    viewedProperties: [String],
    savedProperties: [String],
    searchHistory: [{
      query: String,
      filters: Object,
      timestamp: { type: Date, default: Date.now }
    }]
  },

  // Social Features
  social: {
    connections: [String], // User IDs
    following: [String], // User IDs
    followers: [String], // User IDs
    reputation: {
      score: { type: Number, min: 0, max: 100, default: 50 },
      reviews: { type: Number, default: 0 },
      trustLevel: {
        type: String,
        enum: ['new', 'bronze', 'silver', 'gold', 'platinum'],
        default: 'new'
      }
    }
  },

  // Status and Flags
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'banned', 'pending_verification'],
    default: 'pending_verification'
  },
  flags: {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    kycCompleted: { type: Boolean, default: false },
    investmentEligible: { type: Boolean, default: false },
    riskAssessed: { type: Boolean, default: false },
    complianceCleared: { type: Boolean, default: false }
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'referral'],
      default: 'web'
    },
    referralCode: String,
    referredBy: String,
    userAgent: String,
    ipAddress: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'uae_users'
});

// Indexes
uaeUserSchema.index({ email: 1 }, { unique: true });
uaeUserSchema.index({ 'phone.number': 1, 'phone.countryCode': 1 });
uaeUserSchema.index({ userType: 1, status: 1 });
uaeUserSchema.index({ 'kyc.status': 1 });
uaeUserSchema.index({ 'location.country': 1, 'location.emirate': 1 });
uaeUserSchema.index({ 'preferences.currency.primary': 1 });
uaeUserSchema.index({ createdAt: -1 });
uaeUserSchema.index({ lastActiveAt: -1 });

// Virtual fields
uaeUserSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName.en} ${this.profile.lastName.en}`;
});

uaeUserSchema.virtual('isKycApproved').get(function() {
  return this.kyc.status === 'approved';
});

uaeUserSchema.virtual('canInvest').get(function() {
  return this.status === 'active' && this.flags.kycCompleted && this.flags.investmentEligible;
});

// Pre-save middleware
uaeUserSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password.hash')) {
    const salt = await bcrypt.genSalt(12);
    this.password.hash = await bcrypt.hash(this.password.hash, salt);
    this.password.salt = salt;
    this.password.lastChanged = new Date();
  }
  
  // Update timestamps
  this.updatedAt = new Date();
  if (this.isNew) {
    this.id = this._id.toString();
  }
  
  next();
});

// Static methods
uaeUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

uaeUserSchema.statics.findByKycStatus = function(status) {
  return this.find({ 'kyc.status': status });
};

uaeUserSchema.statics.findEligibleInvestors = function() {
  return this.find({
    status: 'active',
    'flags.kycCompleted': true,
    'flags.investmentEligible': true
  });
};

uaeUserSchema.statics.findByCurrency = function(currency) {
  return this.find({ 'preferences.currency.primary': currency });
};

// Instance methods
uaeUserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password.hash);
};

uaeUserSchema.methods.generateResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.password.resetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.password.resetExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

uaeUserSchema.methods.updateLimits = function() {
  const now = new Date();
  const lastReset = new Date(this.limits.used.lastReset);
  
  // Reset daily limits if it's a new day
  if (now.toDateString() !== lastReset.toDateString()) {
    this.limits.used.dailyInvestment = 0;
    this.limits.used.dailyWithdrawal = 0;
    this.limits.used.dailyTrading = 0;
    this.limits.used.lastReset = now;
  }
};

uaeUserSchema.methods.canInvestAmount = function(amount, currency = 'AED') {
  this.updateLimits();
  
  let aedAmount = amount;
  if (currency !== 'AED') {
    // Convert to AED for limit checking
    // This would need the currency service
    // aedAmount = await CurrencyService.convertCurrency(amount, currency, 'AED');
  }
  
  return (this.limits.used.dailyInvestment + aedAmount) <= this.limits.daily.investment;
};

uaeUserSchema.methods.addInvestment = function(amount, currency = 'AED') {
  let aedAmount = amount;
  if (currency !== 'AED') {
    // Convert to AED
    // aedAmount = await CurrencyService.convertCurrency(amount, currency, 'AED');
  }
  
  this.limits.used.dailyInvestment += aedAmount;
  this.portfolio.totalInvested += aedAmount;
  this.activity.investmentCount += 1;
  this.lastActiveAt = new Date();
  
  return this.save();
};

uaeUserSchema.methods.updateKycStatus = function(status, reviewer = null, reason = null) {
  this.kyc.status = status;
  this.kyc.reviewDate = new Date();
  this.kyc.reviewer = reviewer;
  
  if (status === 'rejected') {
    this.kyc.rejectionReason = reason;
  } else if (status === 'approved') {
    this.flags.kycCompleted = true;
    this.flags.investmentEligible = true;
    this.flags.complianceCleared = true;
    this.kyc.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  }
  
  return this.save();
};

module.exports = mongoose.model('UAEUser', uaeUserSchema);