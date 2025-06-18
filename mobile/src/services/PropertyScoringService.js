import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-platform-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './ApiService';
import config from '../config';

class PropertyScoringService {
  constructor() {
    this.models = {
      valuation: null,
      riskAssessment: null,
      marketTrend: null,
      investmentScore: null
    };
    this.isInitialized = false;
    this.modelVersions = {
      valuation: '1.2.0',
      riskAssessment: '1.1.0',
      marketTrend: '1.0.0',
      investmentScore: '1.3.0'
    };
    this.listeners = [];
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
    
    this.initialize();
  }

  // Initialize all TensorFlow models
  async initialize() {
    try {
      console.log('Initializing PropertyScoringService...');
      
      await tf.ready();
      console.log('TensorFlow ready for property scoring');
      
      // Load all models in parallel
      await Promise.all([
        this.loadValuationModel(),
        this.loadRiskAssessmentModel(),
        this.loadMarketTrendModel(),
        this.loadInvestmentScoreModel()
      ]);
      
      this.isInitialized = true;
      this.notifyListeners('initialized', { success: true });
      console.log('PropertyScoringService initialized successfully');
      
    } catch (error) {
      console.error('PropertyScoringService initialization error:', error);
      this.notifyListeners('error', { error: error.message });
    }
  }

  // Load or create valuation model
  async loadValuationModel() {
    try {
      try {
        this.models.valuation = await tf.loadLayersModel('localstorage://valuation_model');
        console.log('Loaded existing valuation model');
      } catch {
        console.log('Creating new valuation model...');
        this.models.valuation = await this.createValuationModel();
      }
    } catch (error) {
      console.error('Valuation model error:', error);
      throw error;
    }
  }

  // Create advanced valuation model with multiple outputs
  async createValuationModel() {
    const model = tf.sequential({
      layers: [
        // Input: [lat, lng, size, bedrooms, bathrooms, age, amenities_count, district_score, market_trend]
        tf.layers.dense({
          inputShape: [9],
          units: 128,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
          name: 'valuation_input'
        }),
        
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
          name: 'valuation_hidden1'
        }),
        
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.4 }),
        
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'valuation_hidden2'
        }),
        
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          name: 'valuation_hidden3'
        }),
        
        tf.layers.dropout({ rate: 0.2 }),
        
        // Multiple outputs: [estimated_value, confidence, price_per_sqm, market_position]
        tf.layers.dense({
          units: 4,
          activation: 'linear',
          name: 'valuation_output'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mse']
    });

    // Train with UAE property data
    await this.trainValuationModel(model);
    await model.save('localstorage://valuation_model');
    
    return model;
  }

  // Load or create risk assessment model
  async loadRiskAssessmentModel() {
    try {
      try {
        this.models.riskAssessment = await tf.loadLayersModel('localstorage://risk_model');
        console.log('Loaded existing risk assessment model');
      } catch {
        console.log('Creating new risk assessment model...');
        this.models.riskAssessment = await this.createRiskAssessmentModel();
      }
    } catch (error) {
      console.error('Risk assessment model error:', error);
      throw error;
    }
  }

  // Create risk assessment model
  async createRiskAssessmentModel() {
    const model = tf.sequential({
      layers: [
        // Input: [property_age, location_stability, market_volatility, developer_rating, legal_status, financial_leverage]
        tf.layers.dense({
          inputShape: [6],
          units: 64,
          activation: 'relu',
          name: 'risk_input'
        }),
        
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'risk_hidden1'
        }),
        
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          name: 'risk_hidden2'
        }),
        
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          name: 'risk_hidden3'
        }),
        
        // Output: [overall_risk, liquidity_risk, market_risk, credit_risk, operational_risk]
        tf.layers.dense({
          units: 5,
          activation: 'sigmoid', // Risk scores between 0-1
          name: 'risk_output'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    await this.trainRiskModel(model);
    await model.save('localstorage://risk_model');
    
    return model;
  }

  // Load or create market trend model
  async loadMarketTrendModel() {
    try {
      try {
        this.models.marketTrend = await tf.loadLayersModel('localstorage://trend_model');
        console.log('Loaded existing market trend model');
      } catch {
        console.log('Creating new market trend model...');
        this.models.marketTrend = await this.createMarketTrendModel();
      }
    } catch (error) {
      console.error('Market trend model error:', error);
      throw error;
    }
  }

  // Create LSTM-based market trend model
  async createMarketTrendModel() {
    const model = tf.sequential({
      layers: [
        // Input: Time series data [price_history, volume_history, economic_indicators]
        tf.layers.lstm({
          inputShape: [12, 3], // 12 months, 3 features
          units: 64,
          returnSequences: true,
          name: 'trend_lstm1'
        }),
        
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.lstm({
          units: 32,
          returnSequences: false,
          name: 'trend_lstm2'
        }),
        
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          name: 'trend_dense'
        }),
        
        // Output: [trend_direction, strength, duration_forecast, volatility]
        tf.layers.dense({
          units: 4,
          activation: 'linear',
          name: 'trend_output'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    await this.trainTrendModel(model);
    await model.save('localstorage://trend_model');
    
    return model;
  }

  // Load or create investment score model
  async loadInvestmentScoreModel() {
    try {
      try {
        this.models.investmentScore = await tf.loadLayersModel('localstorage://investment_model');
        console.log('Loaded existing investment score model');
      } catch {
        console.log('Creating new investment score model...');
        this.models.investmentScore = await this.createInvestmentScoreModel();
      }
    } catch (error) {
      console.error('Investment score model error:', error);
      throw error;
    }
  }

  // Create comprehensive investment scoring model
  async createInvestmentScoreModel() {
    const model = tf.sequential({
      layers: [
        // Input: [valuation_score, risk_score, market_trend, roi_potential, liquidity, growth_potential, yield_rate]
        tf.layers.dense({
          inputShape: [7],
          units: 128,
          activation: 'relu',
          name: 'investment_input'
        }),
        
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          name: 'investment_hidden1'
        }),
        
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.4 }),
        
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'investment_hidden2'
        }),
        
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          name: 'investment_hidden3'
        }),
        
        // Output: [overall_score, short_term_potential, long_term_potential, risk_adjusted_return]
        tf.layers.dense({
          units: 4,
          activation: 'sigmoid', // Normalized scores 0-1
          name: 'investment_output'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae', 'accuracy']
    });

    await this.trainInvestmentModel(model);
    await model.save('localstorage://investment_model');
    
    return model;
  }

  // Comprehensive property analysis
  async analyzeProperty(propertyData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      const cacheKey = this.generateCacheKey(propertyData);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      this.notifyListeners('analysis_started', { propertyId: propertyData.id });

      // Run all analyses in parallel
      const [valuation, risk, trend, investment] = await Promise.all([
        this.getPropertyValuation(propertyData),
        this.assessPropertyRisk(propertyData),
        this.analyzeMarketTrend(propertyData),
        this.calculateInvestmentScore(propertyData)
      ]);

      // Compile comprehensive analysis
      const analysis = {
        propertyId: propertyData.id,
        timestamp: new Date().toISOString(),
        valuation,
        risk,
        trend,
        investment,
        overallScore: this.calculateOverallScore(valuation, risk, trend, investment),
        recommendations: this.generateRecommendations(valuation, risk, trend, investment),
        confidence: this.calculateAnalysisConfidence(valuation, risk, trend, investment)
      };

      // Cache result
      this.cache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      this.notifyListeners('analysis_completed', analysis);
      return analysis;

    } catch (error) {
      console.error('Property analysis error:', error);
      this.notifyListeners('error', { error: error.message });
      throw error;
    }
  }

  // Get property valuation using TensorFlow model
  async getPropertyValuation(propertyData) {
    const features = [
      propertyData.latitude || 25.0,
      propertyData.longitude || 55.0,
      propertyData.size || 100,
      propertyData.bedrooms || 2,
      propertyData.bathrooms || 2,
      propertyData.age || 5,
      propertyData.amenitiesCount || 10,
      propertyData.districtScore || 70,
      propertyData.marketTrend || 1.05
    ];

    const prediction = await this.models.valuation.predict(tf.tensor2d([features]));
    const result = await prediction.data();
    prediction.dispose();

    return {
      estimatedValue: result[0],
      confidence: result[1],
      pricePerSqm: result[2],
      marketPosition: result[3], // percentile in market
      analysis: this.interpretValuation(result, propertyData)
    };
  }

  // Assess property risk using TensorFlow model
  async assessPropertyRisk(propertyData) {
    const features = [
      propertyData.age || 5,
      propertyData.locationStability || 0.8,
      propertyData.marketVolatility || 0.3,
      propertyData.developerRating || 4.0,
      propertyData.legalStatus || 1.0,
      propertyData.financialLeverage || 0.5
    ];

    const prediction = await this.models.riskAssessment.predict(tf.tensor2d([features]));
    const result = await prediction.data();
    prediction.dispose();

    return {
      overallRisk: result[0],
      liquidityRisk: result[1],
      marketRisk: result[2],
      creditRisk: result[3],
      operationalRisk: result[4],
      riskGrade: this.calculateRiskGrade(result[0]),
      analysis: this.interpretRisk(result, propertyData)
    };
  }

  // Analyze market trend using LSTM model
  async analyzeMarketTrend(propertyData) {
    // Generate time series data for the property's area
    const timeSeriesData = this.generateTimeSeriesData(propertyData);
    
    const prediction = await this.models.marketTrend.predict(tf.tensor3d([timeSeriesData]));
    const result = await prediction.data();
    prediction.dispose();

    return {
      trendDirection: result[0], // -1 to 1 (bearish to bullish)
      strength: result[1], // 0 to 1
      durationForecast: result[2], // months
      volatility: result[3], // 0 to 1
      analysis: this.interpretTrend(result, propertyData)
    };
  }

  // Calculate investment score
  async calculateInvestmentScore(propertyData) {
    // Use results from other models
    const valuation = await this.getPropertyValuation(propertyData);
    const risk = await this.assessPropertyRisk(propertyData);
    const trend = await this.analyzeMarketTrend(propertyData);

    const features = [
      valuation.confidence,
      1 - risk.overallRisk, // Convert risk to score
      trend.trendDirection * 0.5 + 0.5, // Normalize to 0-1
      propertyData.roiPotential || 0.12,
      propertyData.liquidity || 0.7,
      propertyData.growthPotential || 0.8,
      propertyData.yieldRate || 0.08
    ];

    const prediction = await this.models.investmentScore.predict(tf.tensor2d([features]));
    const result = await prediction.data();
    prediction.dispose();

    return {
      overallScore: result[0],
      shortTermPotential: result[1],
      longTermPotential: result[2],
      riskAdjustedReturn: result[3],
      grade: this.calculateInvestmentGrade(result[0]),
      analysis: this.interpretInvestment(result, propertyData)
    };
  }

  // Training methods
  async trainValuationModel(model) {
    const trainingData = this.generateValuationTrainingData();
    const xs = tf.tensor2d(trainingData.features);
    const ys = tf.tensor2d(trainingData.labels);

    await model.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            console.log(`Valuation model epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
          }
        }
      }
    });

    xs.dispose();
    ys.dispose();
  }

  async trainRiskModel(model) {
    const trainingData = this.generateRiskTrainingData();
    const xs = tf.tensor2d(trainingData.features);
    const ys = tf.tensor2d(trainingData.labels);

    await model.fit(xs, ys, {
      epochs: 80,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true
    });

    xs.dispose();
    ys.dispose();
  }

  async trainTrendModel(model) {
    const trainingData = this.generateTrendTrainingData();
    const xs = tf.tensor3d(trainingData.features);
    const ys = tf.tensor2d(trainingData.labels);

    await model.fit(xs, ys, {
      epochs: 60,
      batchSize: 16,
      validationSplit: 0.2,
      shuffle: true
    });

    xs.dispose();
    ys.dispose();
  }

  async trainInvestmentModel(model) {
    const trainingData = this.generateInvestmentTrainingData();
    const xs = tf.tensor2d(trainingData.features);
    const ys = tf.tensor2d(trainingData.labels);

    await model.fit(xs, ys, {
      epochs: 120,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true
    });

    xs.dispose();
    ys.dispose();
  }

  // Training data generation methods
  generateValuationTrainingData() {
    const features = [];
    const labels = [];

    // UAE property data patterns
    for (let i = 0; i < 2000; i++) {
      const lat = 24.0 + Math.random() * 2.0;
      const lng = 54.0 + Math.random() * 2.0;
      const size = 50 + Math.random() * 500;
      const bedrooms = 1 + Math.floor(Math.random() * 5);
      const bathrooms = 1 + Math.floor(Math.random() * 4);
      const age = Math.random() * 20;
      const amenities = Math.floor(Math.random() * 20);
      const district = 50 + Math.random() * 50;
      const trend = 0.95 + Math.random() * 0.15;

      const baseValue = 5000 + size * 8 + bedrooms * 50000 + bathrooms * 30000;
      const ageDiscount = 1 - (age * 0.02);
      const districtMultiplier = district / 100;
      const estimatedValue = baseValue * ageDiscount * districtMultiplier * trend;

      features.push([lat, lng, size, bedrooms, bathrooms, age, amenities, district, trend]);
      labels.push([
        estimatedValue,
        0.7 + Math.random() * 0.3, // confidence
        estimatedValue / size, // price per sqm
        Math.random() * 100 // market position
      ]);
    }

    return { features, labels };
  }

  generateRiskTrainingData() {
    const features = [];
    const labels = [];

    for (let i = 0; i < 1500; i++) {
      const age = Math.random() * 20;
      const stability = Math.random();
      const volatility = Math.random();
      const developerRating = 1 + Math.random() * 4;
      const legalStatus = Math.random() > 0.1 ? 1 : 0;
      const leverage = Math.random();

      const overallRisk = (age * 0.02 + volatility * 0.4 + leverage * 0.3 + (1 - stability) * 0.3) / 4;
      const liquidityRisk = volatility * 0.6 + leverage * 0.4;
      const marketRisk = volatility * 0.8 + (age * 0.01);
      const creditRisk = leverage * 0.7 + (1 - legalStatus) * 0.3;
      const operationalRisk = age * 0.03 + (5 - developerRating) * 0.2;

      features.push([age, stability, volatility, developerRating, legalStatus, leverage]);
      labels.push([overallRisk, liquidityRisk, marketRisk, creditRisk, operationalRisk]);
    }

    return { features, labels };
  }

  generateTrendTrainingData() {
    const features = [];
    const labels = [];

    for (let i = 0; i < 1000; i++) {
      const timeSeriesData = [];
      let basePrice = 5000 + Math.random() * 10000;
      let trend = -0.1 + Math.random() * 0.2; // -10% to +10% monthly

      for (let month = 0; month < 12; month++) {
        const noise = (Math.random() - 0.5) * 0.1;
        const price = basePrice * (1 + trend + noise);
        const volume = 50 + Math.random() * 200;
        const economic = 0.5 + Math.random() * 0.5;

        timeSeriesData.push([price / 10000, volume / 250, economic]);
        basePrice = price;
      }

      const trendDirection = trend;
      const strength = Math.abs(trend) * 5;
      const duration = 3 + Math.random() * 9; // 3-12 months
      const volatility = Math.random() * 0.5;

      features.push(timeSeriesData);
      labels.push([trendDirection, strength, duration, volatility]);
    }

    return { features, labels };
  }

  generateInvestmentTrainingData() {
    const features = [];
    const labels = [];

    for (let i = 0; i < 1800; i++) {
      const valuationScore = Math.random();
      const riskScore = Math.random();
      const trendScore = Math.random();
      const roi = 0.05 + Math.random() * 0.15;
      const liquidity = Math.random();
      const growth = Math.random();
      const yield_ = 0.03 + Math.random() * 0.12;

      const overallScore = (valuationScore * 0.25 + (1-riskScore) * 0.2 + trendScore * 0.2 + 
                           roi * 5 * 0.15 + liquidity * 0.1 + growth * 0.1);
      const shortTerm = overallScore * (0.8 + Math.random() * 0.4);
      const longTerm = overallScore * (0.9 + Math.random() * 0.2);
      const riskAdjusted = overallScore * (1 - riskScore * 0.3);

      features.push([valuationScore, riskScore, trendScore, roi, liquidity, growth, yield_]);
      labels.push([overallScore, shortTerm, longTerm, riskAdjusted]);
    }

    return { features, labels };
  }

  // Utility methods
  generateTimeSeriesData(propertyData) {
    // Generate mock time series data based on property location and type
    const data = [];
    for (let i = 0; i < 12; i++) {
      data.push([
        Math.random(), // normalized price
        Math.random(), // normalized volume
        Math.random()  // economic indicator
      ]);
    }
    return data;
  }

  calculateOverallScore(valuation, risk, trend, investment) {
    return (
      valuation.confidence * 0.25 +
      (1 - risk.overallRisk) * 0.25 +
      (trend.trendDirection * 0.5 + 0.5) * 0.25 +
      investment.overallScore * 0.25
    );
  }

  calculateRiskGrade(riskScore) {
    if (riskScore < 0.2) return 'A';
    if (riskScore < 0.4) return 'B';
    if (riskScore < 0.6) return 'C';
    if (riskScore < 0.8) return 'D';
    return 'F';
  }

  calculateInvestmentGrade(score) {
    if (score > 0.8) return 'Excellent';
    if (score > 0.6) return 'Good';
    if (score > 0.4) return 'Fair';
    if (score > 0.2) return 'Poor';
    return 'High Risk';
  }

  calculateAnalysisConfidence(valuation, risk, trend, investment) {
    return (valuation.confidence + (1-risk.overallRisk) + trend.strength + investment.overallScore) / 4;
  }

  // Interpretation methods
  interpretValuation(result, propertyData) {
    return {
      summary: `Property valued at AED ${Math.round(result[0]).toLocaleString()}`,
      factors: ['Location premium', 'Size efficiency', 'Market conditions'],
      comparison: 'Above market average'
    };
  }

  interpretRisk(result, propertyData) {
    return {
      summary: `${this.calculateRiskGrade(result[0])} risk rating`,
      mainRisks: ['Market volatility', 'Liquidity constraints'],
      mitigation: 'Diversification recommended'
    };
  }

  interpretTrend(result, propertyData) {
    const direction = result[0] > 0 ? 'positive' : 'negative';
    return {
      summary: `${direction.charAt(0).toUpperCase() + direction.slice(1)} market trend`,
      outlook: '12-month forecast available',
      confidence: Math.round(result[1] * 100) + '%'
    };
  }

  interpretInvestment(result, propertyData) {
    return {
      summary: `${this.calculateInvestmentGrade(result[0])} investment opportunity`,
      timeframe: 'Long-term potential higher than short-term',
      recommendation: 'Consider for diversified portfolio'
    };
  }

  generateRecommendations(valuation, risk, trend, investment) {
    const recommendations = [];
    
    if (investment.overallScore > 0.7) {
      recommendations.push('Strong buy recommendation');
    } else if (investment.overallScore > 0.5) {
      recommendations.push('Consider for investment');
    } else {
      recommendations.push('High risk - proceed with caution');
    }
    
    if (risk.overallRisk > 0.6) {
      recommendations.push('Implement risk mitigation strategies');
    }
    
    if (trend.trendDirection > 0.5) {
      recommendations.push('Market timing favorable');
    }
    
    return recommendations;
  }

  generateCacheKey(propertyData) {
    return `${propertyData.id}_${propertyData.latitude}_${propertyData.longitude}_${propertyData.size}`;
  }

  // Event listener management
  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Cleanup
  dispose() {
    Object.values(this.models).forEach(model => {
      if (model) model.dispose();
    });
    this.cache.clear();
    this.listeners = [];
  }
}

// Create and export singleton instance
export const propertyScoringService = new PropertyScoringService();
export default propertyScoringService;