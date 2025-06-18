import { propertyScoringService } from '../PropertyScoringService';
import * as tf from '@tensorflow/tfjs';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs');

describe('PropertyScoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    propertyScoringService.isInitialized = false;
    propertyScoringService.models = {
      valuation: null,
      riskAssessment: null,
      marketTrend: null,
      investmentScore: null
    };
    propertyScoringService.cache.clear();
    propertyScoringService.listeners = [];
  });

  describe('Service Initialization', () => {
    test('should initialize all models successfully', async () => {
      tf.ready.mockResolvedValue();
      
      const mockModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 12000, 75]))
        }),
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5, 0.3] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.loadLayersModel.mockRejectedValue(new Error('Model not found')); // Force creation
      
      await propertyScoringService.initialize();
      
      expect(tf.ready).toHaveBeenCalled();
      expect(propertyScoringService.isInitialized).toBe(true);
      expect(propertyScoringService.models.valuation).toBeDefined();
      expect(propertyScoringService.models.riskAssessment).toBeDefined();
      expect(propertyScoringService.models.marketTrend).toBeDefined();
      expect(propertyScoringService.models.investmentScore).toBeDefined();
    });

    test('should load existing models when available', async () => {
      tf.ready.mockResolvedValue();
      
      const mockModel = {
        predict: jest.fn(),
        save: jest.fn(),
        dispose: jest.fn()
      };
      
      tf.loadLayersModel.mockResolvedValue(mockModel);
      
      await propertyScoringService.initialize();
      
      expect(tf.loadLayersModel).toHaveBeenCalledTimes(4); // All 4 models
      expect(propertyScoringService.isInitialized).toBe(true);
    });

    test('should handle initialization failure', async () => {
      tf.ready.mockRejectedValue(new Error('TensorFlow initialization failed'));
      
      const errorListener = jest.fn();
      propertyScoringService.addListener(errorListener);
      
      await propertyScoringService.initialize();
      
      expect(propertyScoringService.isInitialized).toBe(false);
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('Model Creation', () => {
    test('should create valuation model with correct architecture', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      tf.layers.batchNormalization.mockReturnValue({ name: 'batchNorm' });
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      const model = await propertyScoringService.createValuationModel();
      
      expect(tf.sequential).toHaveBeenCalled();
      expect(mockModel.compile).toHaveBeenCalledWith({
        optimizer: expect.anything(),
        loss: 'meanSquaredError',
        metrics: ['mae', 'mse']
      });
      expect(model).toBe(mockModel);
    });

    test('should create risk assessment model with sigmoid activation', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      const model = await propertyScoringService.createRiskAssessmentModel();
      
      expect(mockModel.compile).toHaveBeenCalledWith({
        optimizer: expect.anything(),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
    });

    test('should create LSTM market trend model', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.lstm.mockReturnValue({ name: 'lstm' });
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      const model = await propertyScoringService.createMarketTrendModel();
      
      expect(tf.layers.lstm).toHaveBeenCalledWith({
        inputShape: [12, 3],
        units: 64,
        returnSequences: true,
        name: 'trend_lstm1'
      });
    });
  });

  describe('Training Data Generation', () => {
    test('should generate realistic valuation training data', () => {
      const trainingData = propertyScoringService.generateValuationTrainingData();
      
      expect(trainingData.features).toHaveLength(2000);
      expect(trainingData.labels).toHaveLength(2000);
      
      // Check feature structure: [lat, lng, size, bedrooms, bathrooms, age, amenities, district, trend]
      expect(trainingData.features[0]).toHaveLength(9);
      
      // Check label structure: [estimated_value, confidence, price_per_sqm, market_position]
      expect(trainingData.labels[0]).toHaveLength(4);
      
      // Validate data ranges
      trainingData.features.forEach(feature => {
        const [lat, lng, size, bedrooms, bathrooms, age, amenities, district, trend] = feature;
        
        expect(lat).toBeGreaterThanOrEqual(24.0);
        expect(lat).toBeLessThanOrEqual(26.0);
        expect(lng).toBeGreaterThanOrEqual(54.0);
        expect(lng).toBeLessThanOrEqual(56.0);
        expect(size).toBeGreaterThanOrEqual(50);
        expect(size).toBeLessThanOrEqual(550);
        expect(bedrooms).toBeGreaterThanOrEqual(1);
        expect(bedrooms).toBeLessThanOrEqual(5);
        expect(age).toBeGreaterThanOrEqual(0);
        expect(age).toBeLessThanOrEqual(20);
      });
    });

    test('should generate risk training data with realistic patterns', () => {
      const trainingData = propertyScoringService.generateRiskTrainingData();
      
      expect(trainingData.features).toHaveLength(1500);
      expect(trainingData.labels).toHaveLength(1500);
      
      // Check feature structure: [age, stability, volatility, developerRating, legalStatus, leverage]
      expect(trainingData.features[0]).toHaveLength(6);
      
      // Check label structure: [overall, liquidity, market, credit, operational]
      expect(trainingData.labels[0]).toHaveLength(5);
      
      // Validate risk scores are between 0 and 1
      trainingData.labels.forEach(label => {
        label.forEach(risk => {
          expect(risk).toBeGreaterThanOrEqual(0);
          expect(risk).toBeLessThanOrEqual(1);
        });
      });
    });

    test('should generate time series data for trend model', () => {
      const trainingData = propertyScoringService.generateTrendTrainingData();
      
      expect(trainingData.features).toHaveLength(1000);
      expect(trainingData.labels).toHaveLength(1000);
      
      // Check time series structure: 12 months x 3 features
      expect(trainingData.features[0]).toHaveLength(12);
      expect(trainingData.features[0][0]).toHaveLength(3);
      
      // Check label structure: [direction, strength, duration, volatility]
      expect(trainingData.labels[0]).toHaveLength(4);
    });

    test('should generate investment scoring training data', () => {
      const trainingData = propertyScoringService.generateInvestmentTrainingData();
      
      expect(trainingData.features).toHaveLength(1800);
      expect(trainingData.labels).toHaveLength(1800);
      
      // Check feature structure: [valuation, risk, trend, roi, liquidity, growth, yield]
      expect(trainingData.features[0]).toHaveLength(7);
      
      // Check label structure: [overall, short_term, long_term, risk_adjusted]
      expect(trainingData.labels[0]).toHaveLength(4);
    });
  });

  describe('Property Analysis', () => {
    beforeEach(() => {
      propertyScoringService.isInitialized = true;
      
      // Mock all models
      const mockValuationModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.85, 150, 75]))
        })
      };
      
      const mockRiskModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4]))
        })
      };
      
      const mockTrendModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3]))
        })
      };
      
      const mockInvestmentModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72]))
        })
      };
      
      propertyScoringService.models = {
        valuation: mockValuationModel,
        riskAssessment: mockRiskModel,
        marketTrend: mockTrendModel,
        investmentScore: mockInvestmentModel
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
    });

    test('should analyze property comprehensively', async () => {
      const propertyData = {
        id: 'test-property-1',
        latitude: 25.0760,
        longitude: 55.1302,
        size: 150,
        bedrooms: 3,
        bathrooms: 2,
        age: 5,
        amenitiesCount: 15,
        districtScore: 85,
        marketTrend: 1.08
      };
      
      const analysisListener = jest.fn();
      propertyScoringService.addListener(analysisListener);
      
      const analysis = await propertyScoringService.analyzeProperty(propertyData);
      
      expect(analysis).toHaveProperty('propertyId', 'test-property-1');
      expect(analysis).toHaveProperty('timestamp');
      expect(analysis).toHaveProperty('valuation');
      expect(analysis).toHaveProperty('risk');
      expect(analysis).toHaveProperty('trend');
      expect(analysis).toHaveProperty('investment');
      expect(analysis).toHaveProperty('overallScore');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis).toHaveProperty('confidence');
      
      expect(analysisListener).toHaveBeenCalledWith('analysis_started', { propertyId: 'test-property-1' });
      expect(analysisListener).toHaveBeenCalledWith('analysis_completed', analysis);
    });

    test('should return cached analysis when available', async () => {
      const propertyData = {
        id: 'test-property-1',
        latitude: 25.0760,
        longitude: 55.1302,
        size: 150
      };
      
      const cachedAnalysis = {
        propertyId: 'test-property-1',
        overallScore: 0.8,
        cached: true
      };
      
      const cacheKey = propertyScoringService.generateCacheKey(propertyData);
      propertyScoringService.cache.set(cacheKey, {
        data: cachedAnalysis,
        timestamp: Date.now()
      });
      
      const result = await propertyScoringService.analyzeProperty(propertyData);
      
      expect(result).toEqual(cachedAnalysis);
      expect(propertyScoringService.models.valuation.predict).not.toHaveBeenCalled();
    });

    test('should handle analysis errors gracefully', async () => {
      propertyScoringService.isInitialized = false;
      
      const propertyData = { id: 'test' };
      
      const errorListener = jest.fn();
      propertyScoringService.addListener(errorListener);
      
      await expect(propertyScoringService.analyzeProperty(propertyData))
        .rejects.toThrow('Service not initialized');
      
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('Individual Scoring Functions', () => {
    beforeEach(() => {
      propertyScoringService.models.valuation = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.85, 150, 75]))
        })
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
    });

    test('should calculate property valuation', async () => {
      const propertyData = {
        latitude: 25.0760,
        longitude: 55.1302,
        size: 150,
        bedrooms: 3,
        bathrooms: 2,
        age: 5,
        amenitiesCount: 15,
        districtScore: 85,
        marketTrend: 1.08
      };
      
      const valuation = await propertyScoringService.getPropertyValuation(propertyData);
      
      expect(valuation).toHaveProperty('estimatedValue', 15000);
      expect(valuation).toHaveProperty('confidence', 0.85);
      expect(valuation).toHaveProperty('pricePerSqm', 150);
      expect(valuation).toHaveProperty('marketPosition', 75);
      expect(valuation).toHaveProperty('analysis');
      expect(valuation.analysis).toHaveProperty('summary');
      expect(valuation.analysis).toHaveProperty('factors');
      expect(valuation.analysis).toHaveProperty('comparison');
    });

    test('should assess property risk', async () => {
      propertyScoringService.models.riskAssessment = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4]))
        })
      };
      
      const propertyData = {
        age: 5,
        locationStability: 0.8,
        marketVolatility: 0.3,
        developerRating: 4.2,
        legalStatus: 1.0,
        financialLeverage: 0.4
      };
      
      const risk = await propertyScoringService.assessPropertyRisk(propertyData);
      
      expect(risk).toHaveProperty('overallRisk', 0.3);
      expect(risk).toHaveProperty('liquidityRisk', 0.25);
      expect(risk).toHaveProperty('marketRisk', 0.35);
      expect(risk).toHaveProperty('creditRisk', 0.2);
      expect(risk).toHaveProperty('operationalRisk', 0.4);
      expect(risk).toHaveProperty('riskGrade');
      expect(risk).toHaveProperty('analysis');
    });

    test('should analyze market trend', async () => {
      propertyScoringService.models.marketTrend = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3]))
        })
      };
      
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      const propertyData = { id: 'test' };
      
      const trend = await propertyScoringService.analyzeMarketTrend(propertyData);
      
      expect(trend).toHaveProperty('trendDirection', 0.2);
      expect(trend).toHaveProperty('strength', 0.8);
      expect(trend).toHaveProperty('durationForecast', 8);
      expect(trend).toHaveProperty('volatility', 0.3);
      expect(trend).toHaveProperty('analysis');
    });

    test('should calculate investment score', async () => {
      // Mock other models first
      propertyScoringService.models.riskAssessment = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4]))
        })
      };
      
      propertyScoringService.models.marketTrend = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3]))
        })
      };
      
      propertyScoringService.models.investmentScore = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72]))
        })
      };
      
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      const propertyData = {
        roiPotential: 0.12,
        liquidity: 0.7,
        growthPotential: 0.8,
        yieldRate: 0.08
      };
      
      const investment = await propertyScoringService.calculateInvestmentScore(propertyData);
      
      expect(investment).toHaveProperty('overallScore', 0.75);
      expect(investment).toHaveProperty('shortTermPotential', 0.7);
      expect(investment).toHaveProperty('longTermPotential', 0.8);
      expect(investment).toHaveProperty('riskAdjustedReturn', 0.72);
      expect(investment).toHaveProperty('grade');
      expect(investment).toHaveProperty('analysis');
    });
  });

  describe('Scoring Utilities', () => {
    test('should calculate overall score correctly', () => {
      const valuation = { confidence: 0.8 };
      const risk = { overallRisk: 0.3 };
      const trend = { trendDirection: 0.2 };
      const investment = { overallScore: 0.75 };
      
      const overallScore = propertyScoringService.calculateOverallScore(valuation, risk, trend, investment);
      
      // (0.8 * 0.25) + ((1-0.3) * 0.25) + ((0.2*0.5+0.5) * 0.25) + (0.75 * 0.25)
      const expected = (0.8 * 0.25) + (0.7 * 0.25) + (0.6 * 0.25) + (0.75 * 0.25);
      expect(overallScore).toBeCloseTo(expected);
    });

    test('should assign risk grades correctly', () => {
      expect(propertyScoringService.calculateRiskGrade(0.1)).toBe('A');
      expect(propertyScoringService.calculateRiskGrade(0.3)).toBe('B');
      expect(propertyScoringService.calculateRiskGrade(0.5)).toBe('C');
      expect(propertyScoringService.calculateRiskGrade(0.7)).toBe('D');
      expect(propertyScoringService.calculateRiskGrade(0.9)).toBe('F');
    });

    test('should assign investment grades correctly', () => {
      expect(propertyScoringService.calculateInvestmentGrade(0.85)).toBe('Excellent');
      expect(propertyScoringService.calculateInvestmentGrade(0.65)).toBe('Good');
      expect(propertyScoringService.calculateInvestmentGrade(0.45)).toBe('Fair');
      expect(propertyScoringService.calculateInvestmentGrade(0.25)).toBe('Poor');
      expect(propertyScoringService.calculateInvestmentGrade(0.15)).toBe('High Risk');
    });

    test('should calculate analysis confidence', () => {
      const valuation = { confidence: 0.8 };
      const risk = { overallRisk: 0.2 };
      const trend = { strength: 0.7 };
      const investment = { overallScore: 0.75 };
      
      const confidence = propertyScoringService.calculateAnalysisConfidence(valuation, risk, trend, investment);
      
      // (0.8 + (1-0.2) + 0.7 + 0.75) / 4
      const expected = (0.8 + 0.8 + 0.7 + 0.75) / 4;
      expect(confidence).toBeCloseTo(expected);
    });

    test('should generate appropriate recommendations', () => {
      const excellentCase = {
        confidence: 0.9,
        overallRisk: 0.1,
        trendDirection: 0.8,
        overallScore: 0.85
      };
      
      const recommendations = propertyScoringService.generateRecommendations(
        { confidence: excellentCase.confidence },
        { overallRisk: excellentCase.overallRisk },
        { trendDirection: excellentCase.trendDirection },
        { overallScore: excellentCase.overallScore }
      );
      
      expect(recommendations).toContain('Strong buy recommendation');
      expect(recommendations).toContain('Market timing favorable');
    });
  });

  describe('Time Series Data Generation', () => {
    test('should generate realistic time series data', () => {
      const propertyData = {
        latitude: 25.0760,
        longitude: 55.1302,
        type: 'apartment'
      };
      
      const timeSeriesData = propertyScoringService.generateTimeSeriesData(propertyData);
      
      expect(timeSeriesData).toHaveLength(12); // 12 months
      expect(timeSeriesData[0]).toHaveLength(3); // 3 features per month
      
      // All values should be normalized between 0 and 1
      timeSeriesData.forEach(month => {
        month.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('Cache Management', () => {
    test('should generate consistent cache keys', () => {
      const property1 = { id: 'test', latitude: 25.0, longitude: 55.0, size: 100 };
      const property2 = { id: 'test', latitude: 25.0, longitude: 55.0, size: 100 };
      const property3 = { id: 'test', latitude: 25.0, longitude: 55.0, size: 150 };
      
      const key1 = propertyScoringService.generateCacheKey(property1);
      const key2 = propertyScoringService.generateCacheKey(property2);
      const key3 = propertyScoringService.generateCacheKey(property3);
      
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    test('should expire old cache entries', async () => {
      const propertyData = { id: 'test', latitude: 25.0, longitude: 55.0, size: 100 };
      const cacheKey = propertyScoringService.generateCacheKey(propertyData);
      
      // Set expired cache entry
      propertyScoringService.cache.set(cacheKey, {
        data: { cached: true },
        timestamp: Date.now() - (70 * 60 * 1000) // 70 minutes ago (expired)
      });
      
      // Set up service
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])) }) },
        riskAssessment: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])) }) },
        marketTrend: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])) }) },
        investmentScore: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])) }) }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      const result = await propertyScoringService.analyzeProperty(propertyData);
      
      // Should have generated new analysis, not used cache
      expect(result.cached).toBeUndefined();
      expect(propertyScoringService.models.valuation.predict).toHaveBeenCalled();
    });
  });

  describe('Event Listeners', () => {
    test('should manage listeners correctly', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      propertyScoringService.addListener(listener1);
      propertyScoringService.addListener(listener2);
      
      expect(propertyScoringService.listeners).toHaveLength(2);
      
      propertyScoringService.removeListener(listener1);
      
      expect(propertyScoringService.listeners).toHaveLength(1);
      expect(propertyScoringService.listeners[0]).toBe(listener2);
    });

    test('should notify listeners of events', () => {
      const listener = jest.fn();
      propertyScoringService.addListener(listener);
      
      propertyScoringService.notifyListeners('test_event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledWith('test_event', { data: 'test' });
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();
      
      propertyScoringService.addListener(errorListener);
      propertyScoringService.addListener(goodListener);
      
      expect(() => {
        propertyScoringService.notifyListeners('test_event', {});
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Model Training', () => {
    test('should train valuation model successfully', async () => {
      const mockModel = {
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5, 0.3, 0.2] } })
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      await propertyScoringService.trainValuationModel(mockModel);
      
      expect(mockModel.fit).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          epochs: 100,
          batchSize: 32,
          validationSplit: 0.2,
          shuffle: true
        })
      );
    });

    test('should train all models with appropriate configurations', async () => {
      const mockModel = {
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } })
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      await propertyScoringService.trainValuationModel(mockModel);
      await propertyScoringService.trainRiskModel(mockModel);
      await propertyScoringService.trainTrendModel(mockModel);
      await propertyScoringService.trainInvestmentModel(mockModel);
      
      expect(mockModel.fit).toHaveBeenCalledTimes(4);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should dispose of tensors properly', async () => {
      propertyScoringService.isInitialized = true;
      
      const mockPrediction = {
        data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])),
        dispose: jest.fn()
      };
      
      propertyScoringService.models.valuation = {
        predict: jest.fn().mockReturnValue(mockPrediction)
      };
      
      const mockTensor = { dispose: jest.fn() };
      tf.tensor2d.mockReturnValue(mockTensor);
      
      await propertyScoringService.getPropertyValuation({});
      
      expect(mockPrediction.dispose).toHaveBeenCalled();
    });

    test('should handle large property datasets efficiently', async () => {
      propertyScoringService.isInitialized = true;
      
      // Mock fast responses
      const mockModels = {
        valuation: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])) }) },
        riskAssessment: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])) }) },
        marketTrend: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])) }) },
        investmentScore: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])) }) }
      };
      
      propertyScoringService.models = mockModels;
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      const startTime = Date.now();
      
      // Analyze multiple properties
      const promises = Array(10).fill().map((_, i) => 
        propertyScoringService.analyzeProperty({
          id: `property-${i}`,
          latitude: 25.0 + i * 0.01,
          longitude: 55.0 + i * 0.01,
          size: 100 + i * 10
        })
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    test('should handle uninitialized service errors', async () => {
      propertyScoringService.isInitialized = false;
      
      await expect(propertyScoringService.analyzeProperty({}))
        .rejects.toThrow('Service not initialized');
    });

    test('should handle model prediction errors', async () => {
      propertyScoringService.isInitialized = true;
      propertyScoringService.models.valuation = {
        predict: jest.fn().mockImplementation(() => {
          throw new Error('Prediction failed');
        })
      };
      
      await expect(propertyScoringService.getPropertyValuation({}))
        .rejects.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should dispose all resources correctly', () => {
      const mockModels = {
        valuation: { dispose: jest.fn() },
        riskAssessment: { dispose: jest.fn() },
        marketTrend: { dispose: jest.fn() },
        investmentScore: { dispose: jest.fn() }
      };
      
      propertyScoringService.models = mockModels;
      propertyScoringService.cache.set('test', { data: {} });
      propertyScoringService.listeners = [jest.fn()];
      
      propertyScoringService.dispose();
      
      Object.values(mockModels).forEach(model => {
        expect(model.dispose).toHaveBeenCalled();
      });
      
      expect(propertyScoringService.cache.size).toBe(0);
      expect(propertyScoringService.listeners).toHaveLength(0);
    });
  });
});