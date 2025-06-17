// Aldar Properties Mobile App Configuration
export const AldarConfig = {
  // Brand Configuration
  brand: {
    name: 'Aldar Properties',
    shortName: 'Aldar',
    tagline: "Abu Dhabi's Premier Real Estate Platform",
    description: 'Leading real estate developer and manager in the UAE with a diversified and sustainable operating model',
    website: 'https://www.aldar.com',
    logo: {
      primary: require('../assets/images/aldar-logo-primary.png'),
      white: require('../assets/images/aldar-logo-white.png'),
      icon: require('../assets/images/aldar-icon.png')
    }
  },

  // App Configuration
  app: {
    name: 'Aldar NexVestXR',
    displayName: 'Aldar Properties',
    version: '2.0.0',
    buildNumber: '1',
    bundleId: 'com.aldar.nexvestxr',
    scheme: 'aldar-nexvestxr'
  },

  // Theme Configuration
  theme: {
    primary: '#000000',
    secondary: '#0066CC',
    accent: '#00A651',
    warning: '#FF6B35',
    info: '#8B5CF6',
    fonts: {
      primary: 'Poppins',
      secondary: 'Inter',
      arabic: 'Almarai'
    }
  },

  // Platform Configuration
  platform: {
    name: 'NexVestXR for Aldar',
    version: '2.0.0',
    environment: __DEV__ ? 'development' : 'production',
    region: 'UAE',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    language: {
      primary: 'en',
      supported: ['en', 'ar'],
      rtl: true
    }
  },

  // API Configuration
  api: {
    baseUrl: __DEV__ 
      ? 'http://localhost:3001/api' 
      : 'https://api.nexvestxr.aldar.com',
    version: 'v2',
    timeout: 10000,
    retries: 3
  },

  // Developer Configuration
  developer: {
    name: 'Aldar Properties',
    tier: 'TIER1',
    license: 'ADRA-ALDAR-001',
    address: '0x5555555555555555555555555555555555555555',
    platformFee: 1.5,
    operatingEmirates: ['ABU_DHABI', 'DUBAI'],
    compliance: {
      rera: true,
      adra: true,
      sec: true,
      cbuae: true
    }
  },

  // Feature Flags
  features: {
    dualToken: true,
    xeraToken: true,
    propxToken: true,
    governance: true,
    staking: true,
    dividends: true,
    crossChain: true,
    realTimeTrading: true,
    marginTrading: true,
    arbitrage: true,
    multiCurrency: true,
    kycAml: true,
    smartContracts: true,
    biometric: true,
    faceId: true,
    touchId: true,
    pushNotifications: true,
    offline: true,
    deepLinking: true
  },

  // Blockchain Configuration
  blockchain: {
    networks: {
      xrpl: {
        enabled: true,
        mainnet: 'wss://xrplcluster.com',
        testnet: 'wss://s.altnet.rippletest.net:51233'
      },
      flare: {
        enabled: true,
        mainnet: 'https://flare-api.flare.network/ext/bc/C/rpc',
        testnet: 'https://coston2-api.flare.network/ext/bc/C/rpc'
      }
    },
    contracts: {
      xeraToken: '0x1234567890123456789012345678901234567890',
      propxFactory: '0x2345678901234567890123456789012345678901',
      classifier: '0x3456789012345678901234567890123456789012',
      staking: '0x4567890123456789012345678901234567890123'
    }
  },

  // Property Configuration
  properties: {
    minimumInvestment: 10000,
    currency: 'AED',
    locations: [
      {
        id: 'saadiyat_island',
        name: 'Saadiyat Island',
        emirate: 'ABU_DHABI',
        zone: 'Cultural District',
        premium: true,
        coordinates: {
          latitude: 24.5500,
          longitude: 54.4347
        }
      },
      {
        id: 'al_reem_island',
        name: 'Al Reem Island',
        emirate: 'ABU_DHABI',
        zone: 'Business District',
        premium: true,
        coordinates: {
          latitude: 24.4908,
          longitude: 54.3850
        }
      },
      {
        id: 'yas_island',
        name: 'Yas Island',
        emirate: 'ABU_DHABI',
        zone: 'Entertainment District',
        premium: true,
        coordinates: {
          latitude: 24.4887,
          longitude: 54.6037
        }
      },
      {
        id: 'corniche',
        name: 'Corniche',
        emirate: 'ABU_DHABI',
        zone: 'Waterfront',
        premium: true,
        coordinates: {
          latitude: 24.4764,
          longitude: 54.3233
        }
      },
      {
        id: 'al_maryah_island',
        name: 'Al Maryah Island',
        emirate: 'ABU_DHABI',
        zone: 'Financial District',
        premium: true,
        coordinates: {
          latitude: 24.5000,
          longitude: 54.3900
        }
      }
    ],
    types: [
      {
        id: 'villa',
        name: 'Villa',
        multiplier: 1.2,
        minValue: 1000000,
        icon: '🏖️'
      },
      {
        id: 'apartment',
        name: 'Apartment',
        multiplier: 1.0,
        minValue: 500000,
        icon: '🏙️'
      },
      {
        id: 'commercial',
        name: 'Commercial',
        multiplier: 1.3,
        minValue: 2000000,
        icon: '🏢'
      },
      {
        id: 'resort',
        name: 'Resort',
        multiplier: 1.4,
        minValue: 5000000,
        icon: '🎢'
      },
      {
        id: 'mixed_use',
        name: 'Mixed Use',
        multiplier: 1.1,
        minValue: 1500000,
        icon: '🌊'
      }
    ]
  },

  // Trading Configuration
  trading: {
    enabled: true,
    pairs: [
      'XERA/AED',
      'XERA/USD',
      'PROPX/AED',
      'PROPX/USD',
      'XERA/PROPX'
    ],
    orderTypes: [
      'MARKET',
      'LIMIT',
      'STOP_LOSS',
      'TAKE_PROFIT',
      'OCO',
      'TRAILING_STOP',
      'MARGIN_BUY',
      'MARGIN_SELL'
    ],
    fees: {
      trading: 0.1,
      withdrawal: 0.05,
      margin: 0.02
    },
    limits: {
      minOrder: 100,
      maxOrder: 1000000,
      dailyLimit: 5000000
    }
  },

  // Payment Configuration
  payments: {
    providers: {
      moonpay: {
        enabled: true,
        currencies: ['AED', 'USD', 'EUR', 'GBP']
      },
      ramp: {
        enabled: true,
        currencies: ['AED', 'USD', 'EUR']
      },
      stripe: {
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP']
      }
    },
    bankTransfer: {
      enabled: true,
      currencies: ['AED', 'USD'],
      swift: true,
      domestic: true
    }
  },

  // Security Configuration
  security: {
    twoFactor: {
      enabled: true,
      methods: ['SMS', 'EMAIL', 'TOTP']
    },
    biometric: {
      enabled: true,
      fallbackToPin: true
    },
    pinCode: {
      enabled: true,
      length: 6,
      maxAttempts: 5
    },
    session: {
      timeout: 30 * 60 * 1000, // 30 minutes
      extendOnActivity: true
    }
  },

  // Notification Configuration
  notifications: {
    push: {
      enabled: true,
      categories: [
        'investment',
        'trading',
        'dividend',
        'governance',
        'security',
        'general'
      ]
    },
    email: {
      enabled: true,
      frequency: 'daily'
    },
    sms: {
      enabled: true,
      emergencyOnly: true
    }
  },

  // Analytics Configuration
  analytics: {
    enabled: !__DEV__,
    providers: {
      firebase: {
        enabled: true,
        crashlytics: true
      },
      mixpanel: {
        enabled: true,
        projectId: 'aldar-nexvestxr'
      }
    }
  },

  // Deep Link Configuration
  deepLinking: {
    enabled: true,
    scheme: 'aldar-nexvestxr',
    prefixes: [
      'https://nexvestxr.aldar.com',
      'aldar-nexvestxr://'
    ],
    paths: {
      property: '/property/:id',
      trading: '/trading/:pair',
      portfolio: '/portfolio',
      governance: '/governance/:proposalId'
    }
  },

  // Social Media
  social: {
    twitter: '@AldarProperties',
    linkedin: 'aldar-properties',
    instagram: '@aldarproperties',
    youtube: 'AldarPropertiesOfficial',
    facebook: 'AldarProperties'
  },

  // Support Configuration
  support: {
    email: 'support@nexvestxr.aldar.com',
    phone: '+971-2-810-5555',
    whatsapp: '+971-50-123-4567',
    hours: 'Sunday-Thursday: 9AM-6PM GST',
    languages: ['en', 'ar'],
    channels: ['email', 'phone', 'chat', 'whatsapp']
  },

  // Legal Information
  legal: {
    terms: 'https://nexvestxr.aldar.com/terms',
    privacy: 'https://nexvestxr.aldar.com/privacy',
    cookies: 'https://nexvestxr.aldar.com/cookies',
    disclaimer: 'https://nexvestxr.aldar.com/disclaimer',
    jurisdiction: 'Abu Dhabi Global Market (ADGM)'
  },

  // Localization
  localization: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: 'en-AE',
    currencyFormat: {
      AED: { symbol: 'د.إ', position: 'before' },
      USD: { symbol: '$', position: 'before' },
      EUR: { symbol: '€', position: 'before' },
      GBP: { symbol: '£', position: 'before' }
    }
  }
};

export default AldarConfig;