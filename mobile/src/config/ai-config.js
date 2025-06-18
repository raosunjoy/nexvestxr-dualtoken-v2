// AI Configuration for NexVestXR Mobile App
export const aiConfig = {
  // TensorFlow Configuration
  tensorflow: {
    // Platform initialization
    platform: {
      backend: 'rn',
      debug: __DEV__,
      polyfillGlobals: true
    },
    
    // Model configurations
    models: {
      heatmap: {
        version: '1.0.0',
        inputShape: [6], // [lat, lng, property_type, size, age, amenities_score]
        outputShape: [4], // [value, demand_score, investment_score, risk_score]
        gridResolution: 50,
        cachePath: 'heatmap_model',
        updateInterval: 24 * 60 * 60 * 1000, // 24 hours
      },
      
      valuation: {
        version: '1.2.0',
        inputShape: [9], // [lat, lng, size, bedrooms, bathrooms, age, amenities_count, district_score, market_trend]
        outputShape: [4], // [estimated_value, confidence, price_per_sqm, market_position]
        cachePath: 'valuation_model',
        accuracy: 0.94,
        trainingEpochs: 100,
      },
      
      riskAssessment: {
        version: '1.1.0',
        inputShape: [6], // [property_age, location_stability, market_volatility, developer_rating, legal_status, financial_leverage]
        outputShape: [5], // [overall_risk, liquidity_risk, market_risk, credit_risk, operational_risk]
        cachePath: 'risk_model',
        accuracy: 0.91,
        trainingEpochs: 80,
      },
      
      marketTrend: {
        version: '1.0.0',
        inputShape: [12, 3], // Time series: 12 months, 3 features [price, volume, economic_indicators]
        outputShape: [4], // [trend_direction, strength, duration_forecast, volatility]
        cachePath: 'trend_model',
        accuracy: 0.87,
        trainingEpochs: 60,
        sequenceLength: 12,
      },
      
      investmentScore: {
        version: '1.3.0',
        inputShape: [7], // [valuation_score, risk_score, market_trend, roi_potential, liquidity, growth_potential, yield_rate]
        outputShape: [4], // [overall_score, short_term_potential, long_term_potential, risk_adjusted_return]
        cachePath: 'investment_model',
        accuracy: 0.92,
        trainingEpochs: 120,
      }
    },
    
    // Training configurations
    training: {
      defaultBatchSize: 32,
      defaultValidationSplit: 0.2,
      defaultShuffle: true,
      optimizers: {
        adam: {
          learningRate: 0.001,
          beta1: 0.9,
          beta2: 0.999,
          epsilon: 1e-7
        }
      },
      regularization: {
        l2: 0.001,
        dropout: {
          light: 0.2,
          medium: 0.3,
          heavy: 0.4
        }
      }
    }
  },
  
  // UAE Real Estate Market Configuration
  uaeMarket: {
    // Geographic bounds
    bounds: {
      north: 26.084,
      south: 22.633,
      east: 56.396,
      west: 51.583
    },
    
    // Prime locations with market multipliers
    primeLocations: [
      { 
        name: 'Dubai Marina', 
        center: [25.0760, 55.1302], 
        radius: 0.02, 
        multiplier: 1.8,
        averagePrice: 15000, // AED per sqm
        growthRate: 0.08 // 8% annual
      },
      { 
        name: 'Downtown Dubai', 
        center: [25.2048, 55.2708], 
        radius: 0.015, 
        multiplier: 2.2,
        averagePrice: 20000,
        growthRate: 0.12
      },
      { 
        name: 'Abu Dhabi Central', 
        center: [24.4539, 54.3773], 
        radius: 0.02, 
        multiplier: 1.9,
        averagePrice: 16000,
        growthRate: 0.07
      },
      { 
        name: 'DIFC', 
        center: [25.1972, 55.2744], 
        radius: 0.01, 
        multiplier: 2.0,
        averagePrice: 18000,
        growthRate: 0.10
      },
      { 
        name: 'JBR', 
        center: [25.1127, 55.1390], 
        radius: 0.015, 
        multiplier: 1.7,
        averagePrice: 14000,
        growthRate: 0.06
      },
      { 
        name: 'Saadiyat Island', 
        center: [24.4219, 54.4319], 
        radius: 0.02, 
        multiplier: 2.1,
        averagePrice: 19000,
        growthRate: 0.11
      },
      { 
        name: 'Palm Jumeirah', 
        center: [25.0657, 55.1713], 
        radius: 0.015, 
        multiplier: 2.5,
        averagePrice: 25000,
        growthRate: 0.15
      },
      { 
        name: 'Business Bay', 
        center: [25.0343, 55.1413], 
        radius: 0.02, 
        multiplier: 1.6,
        averagePrice: 13000,
        growthRate: 0.05
      },
      { 
        name: 'Al Reem Island', 
        center: [24.3700, 54.4217], 
        radius: 0.02, 
        multiplier: 1.8,
        averagePrice: 15000,
        growthRate: 0.08
      },
      { 
        name: 'Jumeirah Lakes Towers', 
        center: [25.0925, 55.1562], 
        radius: 0.02, 
        multiplier: 1.5,
        averagePrice: 12000,
        growthRate: 0.04
      }
    ],
    
    // Property value ranges
    valueRanges: {
      minimum: 2000, // AED per sqm
      maximum: 30000, // AED per sqm
      average: 12000,
      luxury: 20000
    },
    
    // Market parameters
    marketParameters: {
      volatility: 0.15, // 15% annual volatility
      growthTrend: 0.08, // 8% annual growth
      liquidityFactor: 0.7, // 70% liquidity score
      seasonality: {
        peak: [10, 11, 12, 1, 2, 3], // Oct to Mar
        low: [6, 7, 8] // Jun to Aug
      }
    }
  },
  
  // Heatmap Configuration
  heatmap: {
    // Grid and rendering
    defaultGridResolution: 50,
    maxGridResolution: 100,
    minGridResolution: 25,
    
    // Visual configuration
    gradient: {
      colors: ['#0000FF', '#00FF00', '#FFFF00', '#FF6600', '#FF0000'],
      startPoints: [0.2, 0.4, 0.6, 0.8, 1.0],
      colorMapSize: 256
    },
    
    // Performance settings
    maxPoints: 1000,
    batchSize: 100,
    renderRadius: 20,
    opacity: 0.7,
    
    // Cache settings
    cacheTimeout: 30 * 60 * 1000, // 30 minutes
    maxCacheSize: 50
  },
  
  // Property Scoring Configuration
  propertyScoring: {
    // Weight configurations for overall score
    weights: {
      valuation: 0.25,
      risk: 0.25,
      trend: 0.25,
      investment: 0.25
    },
    
    // Risk grading thresholds
    riskGrades: {
      'A': { max: 0.2, color: '#4CAF50' },
      'B': { max: 0.4, color: '#8BC34A' },
      'C': { max: 0.6, color: '#FFC107' },
      'D': { max: 0.8, color: '#FF9800' },
      'F': { max: 1.0, color: '#F44336' }
    },
    
    // Investment grading thresholds
    investmentGrades: {
      'Excellent': { min: 0.8, color: '#4CAF50' },
      'Good': { min: 0.6, color: '#8BC34A' },
      'Fair': { min: 0.4, color: '#FFC107' },
      'Poor': { min: 0.2, color: '#FF9800' },
      'High Risk': { min: 0.0, color: '#F44336' }
    },
    
    // Confidence calculation parameters
    confidence: {
      baseConfidence: 0.7,
      primeLocationBonus: 0.2,
      standardLocationBonus: 0.1,
      dataQualityFactor: 0.15,
      maxConfidence: 0.95
    }
  },
  
  // Performance Configuration
  performance: {
    // Memory management
    memoryThresholds: {
      warning: 0.8, // 80% memory usage
      critical: 0.9, // 90% memory usage
      cleanup: 0.95 // 95% memory usage - force cleanup
    },
    
    // Batch processing
    batchSizes: {
      heatmapGeneration: 100,
      modelTraining: 32,
      prediction: 50
    },
    
    // Timeouts
    timeouts: {
      modelInitialization: 30000, // 30 seconds
      prediction: 5000, // 5 seconds
      heatmapGeneration: 60000, // 60 seconds
      modelTraining: 300000 // 5 minutes
    }
  },
  
  // Cache Configuration
  cache: {
    // Storage keys
    keys: {
      heatmapData: 'ai_heatmap_cache',
      modelVersions: 'ai_model_versions',
      userPreferences: 'ai_user_preferences',
      analysisHistory: 'ai_analysis_history'
    },
    
    // Cache sizes
    maxSizes: {
      heatmap: 50, // Max 50 heatmap results
      analysis: 100, // Max 100 analysis results
      predictions: 200 // Max 200 predictions
    },
    
    // Expiration times
    expiration: {
      heatmap: 30 * 60 * 1000, // 30 minutes
      analysis: 60 * 60 * 1000, // 1 hour
      predictions: 15 * 60 * 1000, // 15 minutes
      models: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  
  // Error Handling
  errorHandling: {
    // Retry configurations
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    backoffMultiplier: 2,
    
    // Fallback configurations
    fallbackConfidence: 0.5,
    fallbackValues: {
      propertyValue: 10000, // AED per sqm
      riskScore: 0.5,
      investmentScore: 0.5,
      trendDirection: 0.0
    }
  },
  
  // Development Configuration
  development: {
    enableDebugLogs: __DEV__,
    enablePerformanceMonitoring: __DEV__,
    enableModelVisualization: __DEV__,
    mockDataEnabled: false,
    
    // Testing parameters
    testingParameters: {
      generateSyntheticData: true,
      syntheticDataSize: 1000,
      enableQuickTraining: true,
      reducedEpochs: 10
    }
  }
};

export default aiConfig;