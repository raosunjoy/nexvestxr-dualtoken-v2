import { propertyImageAnalysisService } from '../PropertyImageAnalysisService';
import * as tf from '@tensorflow/tfjs';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs');

describe('PropertyImageAnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    propertyImageAnalysisService.isInitialized = false;
    propertyImageAnalysisService.models = {
      propertyClassifier: null,
      conditionAssessment: null,
      featureDetection: null,
      roomClassifier: null,
      priceEstimator: null
    };
    propertyImageAnalysisService.cache.clear();
    propertyImageAnalysisService.listeners = [];
  });

  describe('Service Initialization', () => {
    test('should initialize all computer vision models successfully', async () => {
      tf.ready.mockResolvedValue();
      
      const mockModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([0.8, 0.1, 0.05, 0.03, 0.02]))
        }),
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5, 0.3] } }),
        save: jest.fn().mockResolvedValue(),
        dispose: jest.fn()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.loadLayersModel.mockRejectedValue(new Error('Model not found'));
      tf.layers.conv2d.mockReturnValue({ name: 'conv2d' });
      tf.layers.maxPooling2d.mockReturnValue({ name: 'maxPooling2d' });
      tf.layers.batchNormalization.mockReturnValue({ name: 'batchNorm' });
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      tf.layers.globalAveragePooling2d.mockReturnValue({ name: 'gap' });
      tf.tensor4d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      await propertyImageAnalysisService.initialize();
      
      expect(tf.ready).toHaveBeenCalled();
      expect(propertyImageAnalysisService.isInitialized).toBe(true);
      expect(propertyImageAnalysisService.models.propertyClassifier).toBeDefined();
      expect(propertyImageAnalysisService.models.conditionAssessment).toBeDefined();
      expect(propertyImageAnalysisService.models.featureDetection).toBeDefined();
      expect(propertyImageAnalysisService.models.roomClassifier).toBeDefined();
      expect(propertyImageAnalysisService.models.priceEstimator).toBeDefined();
    });

    test('should load existing models when available', async () => {
      tf.ready.mockResolvedValue();
      
      const mockModel = {
        predict: jest.fn(),
        save: jest.fn(),
        dispose: jest.fn()
      };
      
      tf.loadLayersModel.mockResolvedValue(mockModel);
      
      await propertyImageAnalysisService.initialize();
      
      expect(tf.loadLayersModel).toHaveBeenCalledTimes(5); // All 5 models
      expect(propertyImageAnalysisService.isInitialized).toBe(true);
    });

    test('should handle initialization failure', async () => {
      tf.ready.mockRejectedValue(new Error('TensorFlow initialization failed'));
      
      const errorListener = jest.fn();
      propertyImageAnalysisService.addListener(errorListener);
      
      await propertyImageAnalysisService.initialize();
      
      expect(propertyImageAnalysisService.isInitialized).toBe(false);
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('Model Architecture Creation', () => {
    test('should create property classifier with correct CNN architecture', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.conv2d.mockReturnValue({ name: 'conv2d' });
      tf.layers.maxPooling2d.mockReturnValue({ name: 'maxPool' });
      tf.layers.batchNormalization.mockReturnValue({ name: 'batchNorm' });
      tf.layers.globalAveragePooling2d.mockReturnValue({ name: 'gap' });
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      
      const model = await propertyImageAnalysisService.createPropertyClassifierModel();
      
      expect(tf.sequential).toHaveBeenCalled();
      expect(mockModel.compile).toHaveBeenCalledWith({
        optimizer: expect.anything(),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      expect(model).toBe(mockModel);
    });

    test('should create condition assessment model with appropriate layers', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.conv2d.mockReturnValue({ name: 'conv2d' });
      tf.layers.maxPooling2d.mockReturnValue({ name: 'maxPool' });
      tf.layers.batchNormalization.mockReturnValue({ name: 'batchNorm' });
      tf.layers.globalAveragePooling2d.mockReturnValue({ name: 'gap' });
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      
      const model = await propertyImageAnalysisService.createConditionAssessmentModel();
      
      expect(mockModel.compile).toHaveBeenCalledWith({
        optimizer: expect.anything(),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    });

    test('should create feature detection model for multi-label classification', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.conv2d.mockReturnValue({ name: 'conv2d' });
      tf.layers.maxPooling2d.mockReturnValue({ name: 'maxPool' });
      tf.layers.batchNormalization.mockReturnValue({ name: 'batchNorm' });
      tf.layers.globalAveragePooling2d.mockReturnValue({ name: 'gap' });
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      
      const model = await propertyImageAnalysisService.createFeatureDetectionModel();
      
      expect(mockModel.compile).toHaveBeenCalledWith({
        optimizer: expect.anything(),
        loss: 'binaryCrossentropy',
        metrics: ['binaryAccuracy']
      });
    });

    test('should create price estimator regression model', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.conv2d.mockReturnValue({ name: 'conv2d' });
      tf.layers.maxPooling2d.mockReturnValue({ name: 'maxPool' });
      tf.layers.batchNormalization.mockReturnValue({ name: 'batchNorm' });
      tf.layers.globalAveragePooling2d.mockReturnValue({ name: 'gap' });
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      
      const model = await propertyImageAnalysisService.createPriceEstimatorModel();
      
      expect(mockModel.compile).toHaveBeenCalledWith({
        optimizer: expect.anything(),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });
    });
  });

  describe('Training Data Generation', () => {
    test('should generate realistic property image training data', () => {
      const trainingData = propertyImageAnalysisService.generatePropertyImageTrainingData();
      
      expect(trainingData.images).toHaveLength(1000);
      expect(trainingData.labels).toHaveLength(1000);
      
      // Check image structure: 224x224x3
      expect(trainingData.images[0]).toHaveLength(224);
      expect(trainingData.images[0][0]).toHaveLength(224);
      expect(trainingData.images[0][0][0]).toHaveLength(3);
      
      // Check label structure: one-hot encoded for 6 property types
      expect(trainingData.labels[0]).toHaveLength(6);
      expect(trainingData.labels[0].reduce((sum, val) => sum + val, 0)).toBe(1);
    });

    test('should generate condition assessment training data', () => {
      const trainingData = propertyImageAnalysisService.generateConditionTrainingData();
      
      expect(trainingData.images).toHaveLength(800);
      expect(trainingData.labels).toHaveLength(800);
      
      // Check label structure: one-hot encoded for 4 conditions
      expect(trainingData.labels[0]).toHaveLength(4);
      expect(trainingData.labels[0].reduce((sum, val) => sum + val, 0)).toBe(1);
    });

    test('should generate feature detection training data', () => {
      const trainingData = propertyImageAnalysisService.generateFeatureTrainingData();
      
      expect(trainingData.images).toHaveLength(1200);
      expect(trainingData.labels).toHaveLength(1200);
      
      // Check label structure: multi-label binary for 18 features
      expect(trainingData.labels[0]).toHaveLength(18);
      trainingData.labels[0].forEach(label => {
        expect([0, 1]).toContain(label);
      });
    });

    test('should generate room classification training data', () => {
      const trainingData = propertyImageAnalysisService.generateRoomTrainingData();
      
      expect(trainingData.images).toHaveLength(700);
      expect(trainingData.labels).toHaveLength(700);
      
      // Check label structure: one-hot encoded for 7 room types
      expect(trainingData.labels[0]).toHaveLength(7);
      expect(trainingData.labels[0].reduce((sum, val) => sum + val, 0)).toBe(1);
    });

    test('should generate price estimation training data', () => {
      const trainingData = propertyImageAnalysisService.generatePriceTrainingData();
      
      expect(trainingData.images).toHaveLength(900);
      expect(trainingData.prices).toHaveLength(900);
      
      // Check price structure: single normalized value
      expect(trainingData.prices[0]).toHaveLength(1);
      expect(trainingData.prices[0][0]).toBeGreaterThanOrEqual(0);
      expect(trainingData.prices[0][0]).toBeLessThanOrEqual(1);
    });
  });

  describe('Image Analysis', () => {
    beforeEach(() => {
      propertyImageAnalysisService.isInitialized = true;
      
      // Mock all models with realistic predictions
      propertyImageAnalysisService.models = {
        propertyClassifier: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.7, 0.2, 0.05, 0.03, 0.015, 0.005])),
            dispose: jest.fn()
          })
        },
        conditionAssessment: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.6, 0.3, 0.08, 0.02])),
            dispose: jest.fn()
          })
        },
        featureDetection: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array(Array(18).fill(0).map(() => Math.random()))),
            dispose: jest.fn()
          })
        },
        roomClassifier: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.5, 0.3, 0.1, 0.05, 0.03, 0.015, 0.005])),
            dispose: jest.fn()
          })
        },
        priceEstimator: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.6])), // Normalized price
            dispose: jest.fn()
          })
        }
      };
      
      tf.tensor4d.mockReturnValue({ dispose: jest.fn() });
    });

    test('should analyze property image comprehensively', async () => {
      const imageUri = 'file://test-image.jpg';
      
      const analysisListener = jest.fn();
      propertyImageAnalysisService.addListener(analysisListener);
      
      const analysis = await propertyImageAnalysisService.analyzePropertyImage(imageUri);
      
      expect(analysis).toHaveProperty('imageUri', imageUri);
      expect(analysis).toHaveProperty('timestamp');
      expect(analysis).toHaveProperty('propertyType');
      expect(analysis).toHaveProperty('condition');
      expect(analysis).toHaveProperty('features');
      expect(analysis).toHaveProperty('roomType');
      expect(analysis).toHaveProperty('priceEstimate');
      expect(analysis).toHaveProperty('confidence');
      expect(analysis).toHaveProperty('recommendations');
      
      expect(analysisListener).toHaveBeenCalledWith('analysis_started', { imageUri });
      expect(analysisListener).toHaveBeenCalledWith('analysis_completed', analysis);
    });

    test('should classify property type correctly', async () => {
      const imageUri = 'file://apartment.jpg';
      
      const analysis = await propertyImageAnalysisService.analyzePropertyImage(imageUri);
      
      expect(analysis.propertyType.type).toBe('apartment'); // Highest probability
      expect(analysis.propertyType.confidence).toBe(0.7);
      expect(analysis.propertyType.probabilities).toHaveProperty('apartment');
      expect(analysis.propertyType.probabilities).toHaveProperty('villa');
    });

    test('should assess condition with scoring', async () => {
      const imageUri = 'file://excellent-property.jpg';
      
      const analysis = await propertyImageAnalysisService.analyzePropertyImage(imageUri);
      
      expect(analysis.condition.condition).toBe('excellent');
      expect(analysis.condition.confidence).toBe(0.6);
      expect(analysis.condition.score).toBe(95);
      expect(analysis.condition.probabilities).toHaveProperty('excellent');
    });

    test('should detect multiple property features', async () => {
      const imageUri = 'file://luxury-villa.jpg';
      
      // Mock feature detection to return some features above threshold
      propertyImageAnalysisService.models.featureDetection.predict = jest.fn().mockReturnValue({
        data: jest.fn().mockResolvedValue(new Float32Array([
          0.8, 0.6, 0.7, 0.3, 0.9, 0.2, 0.5, 0.4, 0.1, 0.8,
          0.3, 0.6, 0.4, 0.2, 0.7, 0.1, 0.3, 0.5
        ])),
        dispose: jest.fn()
      });
      
      const analysis = await propertyImageAnalysisService.analyzePropertyImage(imageUri);
      
      expect(analysis.features.detected.length).toBeGreaterThan(0);
      expect(analysis.features.count).toBe(analysis.features.detected.length);
      expect(analysis.features.luxuryScore).toBeGreaterThanOrEqual(0);
      expect(analysis.features.valueImpact).toBeGreaterThanOrEqual(0);
      
      // Check feature structure
      if (analysis.features.detected.length > 0) {
        const feature = analysis.features.detected[0];
        expect(feature).toHaveProperty('feature');
        expect(feature).toHaveProperty('confidence');
        expect(feature).toHaveProperty('impact');
      }
    });

    test('should classify room type', async () => {
      const imageUri = 'file://living-room.jpg';
      
      const analysis = await propertyImageAnalysisService.analyzePropertyImage(imageUri);
      
      expect(analysis.roomType.roomType).toBe('living_room');
      expect(analysis.roomType.confidence).toBe(0.5);
      expect(analysis.roomType.probabilities).toHaveProperty('living_room');
      expect(analysis.roomType.probabilities).toHaveProperty('bedroom');
    });

    test('should estimate property price', async () => {
      const imageUri = 'file://expensive-property.jpg';
      
      const analysis = await propertyImageAnalysisService.analyzePropertyImage(imageUri);
      
      expect(analysis.priceEstimate.estimatedValue).toBe(3000000); // 0.6 * 5M
      expect(analysis.priceEstimate.currency).toBe('AED');
      expect(analysis.priceEstimate.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.priceEstimate.range.min).toBeLessThan(analysis.priceEstimate.estimatedValue);
      expect(analysis.priceEstimate.range.max).toBeGreaterThan(analysis.priceEstimate.estimatedValue);
    });

    test('should return cached analysis when available', async () => {
      const imageUri = 'file://cached-image.jpg';
      const cachedAnalysis = {
        imageUri,
        propertyType: { type: 'villa', confidence: 0.9 },
        cached: true
      };
      
      const cacheKey = propertyImageAnalysisService.generateImageCacheKey(imageUri, {});
      propertyImageAnalysisService.cache.set(cacheKey, {
        data: cachedAnalysis,
        timestamp: Date.now()
      });
      
      const result = await propertyImageAnalysisService.analyzePropertyImage(imageUri);
      
      expect(result).toEqual(cachedAnalysis);
      expect(propertyImageAnalysisService.models.propertyClassifier.predict).not.toHaveBeenCalled();
    });

    test('should handle analysis errors gracefully', async () => {
      propertyImageAnalysisService.isInitialized = false;
      
      const imageUri = 'file://test.jpg';
      const errorListener = jest.fn();
      propertyImageAnalysisService.addListener(errorListener);
      
      await expect(propertyImageAnalysisService.analyzePropertyImage(imageUri))
        .rejects.toThrow('Service not initialized');
      
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('Bulk Image Analysis', () => {
    beforeEach(() => {
      propertyImageAnalysisService.isInitialized = true;
      
      // Mock single image analysis
      propertyImageAnalysisService.analyzePropertyImage = jest.fn().mockImplementation((uri) => 
        Promise.resolve({
          imageUri: uri,
          propertyType: { type: 'apartment', confidence: 0.8 },
          condition: { condition: 'good', score: 80 },
          features: { detected: [{ feature: 'parking', confidence: 0.7 }], luxuryScore: 40 },
          priceEstimate: { estimatedValue: 2000000 },
          confidence: 0.75
        })
      );
    });

    test('should analyze multiple images in batches', async () => {
      const imageUris = ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg'];
      
      const bulkListener = jest.fn();
      propertyImageAnalysisService.addListener(bulkListener);
      
      const result = await propertyImageAnalysisService.analyzeBulkImages(imageUris, { batchSize: 2 });
      
      expect(result.results).toHaveLength(5);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalImages).toBe(5);
      expect(result.summary.averageValue).toBe(2000000);
      
      expect(bulkListener).toHaveBeenCalledWith('bulk_analysis_started', { count: 5 });
      expect(bulkListener).toHaveBeenCalledWith('bulk_analysis_completed', expect.any(Object));
    });

    test('should generate comprehensive bulk analysis summary', async () => {
      const imageUris = ['villa1.jpg', 'apartment1.jpg', 'villa2.jpg'];
      
      // Mock different property types
      propertyImageAnalysisService.analyzePropertyImage = jest.fn()
        .mockResolvedValueOnce({
          propertyType: { type: 'villa' },
          condition: { condition: 'excellent', score: 95 },
          features: { detected: [{ feature: 'swimming_pool' }], luxuryScore: 80 },
          priceEstimate: { estimatedValue: 4000000 },
          confidence: 0.9
        })
        .mockResolvedValueOnce({
          propertyType: { type: 'apartment' },
          condition: { condition: 'good', score: 75 },
          features: { detected: [{ feature: 'parking' }], luxuryScore: 20 },
          priceEstimate: { estimatedValue: 1500000 },
          confidence: 0.8
        })
        .mockResolvedValueOnce({
          propertyType: { type: 'villa' },
          condition: { condition: 'fair', score: 60 },
          features: { detected: [{ feature: 'garden' }], luxuryScore: 40 },
          priceEstimate: { estimatedValue: 3000000 },
          confidence: 0.7
        });
      
      const result = await propertyImageAnalysisService.analyzeBulkImages(imageUris);
      
      expect(result.summary.propertyTypeDistribution.villa).toBe(2);
      expect(result.summary.propertyTypeDistribution.apartment).toBe(1);
      expect(result.summary.conditionDistribution.excellent).toBe(1);
      expect(result.summary.conditionDistribution.good).toBe(1);
      expect(result.summary.conditionDistribution.fair).toBe(1);
      expect(result.summary.commonFeatures).toBeDefined();
      expect(result.summary.recommendations).toBeInstanceOf(Array);
    });

    test('should handle batch processing errors gracefully', async () => {
      const imageUris = ['good1.jpg', 'error.jpg', 'good2.jpg'];
      
      propertyImageAnalysisService.analyzePropertyImage = jest.fn()
        .mockResolvedValueOnce({ imageUri: 'good1.jpg', confidence: 0.8 })
        .mockRejectedValueOnce(new Error('Analysis failed'))
        .mockResolvedValueOnce({ imageUri: 'good2.jpg', confidence: 0.7 });
      
      const errorListener = jest.fn();
      propertyImageAnalysisService.addListener(errorListener);
      
      const result = await propertyImageAnalysisService.analyzeBulkImages(imageUris, { batchSize: 1 });
      
      // Should continue processing despite error
      expect(result.results).toHaveLength(2);
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('Utility Functions', () => {
    test('should calculate condition scores correctly', () => {
      expect(propertyImageAnalysisService.calculateConditionScore('excellent')).toBe(95);
      expect(propertyImageAnalysisService.calculateConditionScore('good')).toBe(80);
      expect(propertyImageAnalysisService.calculateConditionScore('fair')).toBe(60);
      expect(propertyImageAnalysisService.calculateConditionScore('poor')).toBe(35);
      expect(propertyImageAnalysisService.calculateConditionScore('unknown')).toBe(50);
    });

    test('should calculate feature impacts', () => {
      expect(propertyImageAnalysisService.getFeatureImpact('swimming_pool')).toBe(0.15);
      expect(propertyImageAnalysisService.getFeatureImpact('garden')).toBe(0.10);
      expect(propertyImageAnalysisService.getFeatureImpact('parking')).toBe(0.08);
      expect(propertyImageAnalysisService.getFeatureImpact('unknown_feature')).toBe(0.02);
    });

    test('should calculate luxury scores', () => {
      const luxuryFeatures = [
        { feature: 'swimming_pool', confidence: 0.8 },
        { feature: 'gym', confidence: 0.7 },
        { feature: 'marble_flooring', confidence: 0.6 }
      ];
      
      const score = propertyImageAnalysisService.calculateLuxuryScore(luxuryFeatures);
      expect(score).toBe(60); // 3 luxury features * 20
    });

    test('should calculate feature value impact', () => {
      const features = [
        { feature: 'swimming_pool', impact: 0.15 },
        { feature: 'garden', impact: 0.10 },
        { feature: 'parking', impact: 0.08 }
      ];
      
      const totalImpact = propertyImageAnalysisService.calculateFeatureValueImpact(features);
      expect(totalImpact).toBe(0.33);
    });

    test('should calculate overall confidence', () => {
      const propertyType = { confidence: 0.8 };
      const condition = { confidence: 0.7 };
      const features = { detected: [{ confidence: 0.6 }, { confidence: 0.8 }] };
      const roomType = { confidence: 0.9 };
      const priceEstimate = { confidence: 0.75 };
      
      const confidence = propertyImageAnalysisService.calculateOverallConfidence(
        propertyType, condition, features, roomType, priceEstimate
      );
      
      // (0.8*0.25) + (0.7*0.25) + (0.7*0.2) + (0.9*0.15) + (0.75*0.15)
      const expected = (0.8 * 0.25) + (0.7 * 0.25) + (0.7 * 0.2) + (0.9 * 0.15) + (0.75 * 0.15);
      expect(confidence).toBeCloseTo(expected);
    });

    test('should generate appropriate recommendations', () => {
      const excellentProperty = {
        type: 'villa',
        confidence: 0.9
      };
      const excellentCondition = {
        condition: 'excellent',
        score: 95
      };
      const luxuryFeatures = {
        luxuryScore: 80,
        valueImpact: 0.4
      };
      
      const recommendations = propertyImageAnalysisService.generateImageRecommendations(
        excellentProperty, excellentCondition, luxuryFeatures
      );
      
      expect(recommendations).toContain('Excellent property condition - ideal for premium pricing');
      expect(recommendations).toContain('High-end features detected - target luxury market');
      expect(recommendations).toContain('Property type clearly identified as villa');
      expect(recommendations).toContain('Multiple value-adding features detected');
    });
  });

  describe('Cache Management', () => {
    test('should generate consistent cache keys', () => {
      const uri1 = 'file://image.jpg';
      const uri2 = 'file://image.jpg';
      const uri3 = 'file://different.jpg';
      const options = { quality: 0.8 };
      
      const key1 = propertyImageAnalysisService.generateImageCacheKey(uri1, options);
      const key2 = propertyImageAnalysisService.generateImageCacheKey(uri2, options);
      const key3 = propertyImageAnalysisService.generateImageCacheKey(uri3, options);
      
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    test('should expire old cache entries', () => {
      const cacheKey = 'test-key';
      
      // Set expired cache entry
      propertyImageAnalysisService.cache.set(cacheKey, {
        data: { cached: true },
        timestamp: Date.now() - (2 * 3600000) // 2 hours ago
      });
      
      const result = propertyImageAnalysisService.getCachedResult(cacheKey);
      
      expect(result).toBeNull();
      expect(propertyImageAnalysisService.cache.has(cacheKey)).toBe(false);
    });

    test('should return valid cache entries', () => {
      const cacheKey = 'test-key';
      const cachedData = { analysis: 'result' };
      
      propertyImageAnalysisService.cache.set(cacheKey, {
        data: cachedData,
        timestamp: Date.now() - 1800000 // 30 minutes ago
      });
      
      const result = propertyImageAnalysisService.getCachedResult(cacheKey);
      
      expect(result).toEqual(cachedData);
    });
  });

  describe('Event Listeners', () => {
    test('should manage listeners correctly', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      propertyImageAnalysisService.addListener(listener1);
      propertyImageAnalysisService.addListener(listener2);
      
      expect(propertyImageAnalysisService.listeners).toHaveLength(2);
      
      propertyImageAnalysisService.removeListener(listener1);
      
      expect(propertyImageAnalysisService.listeners).toHaveLength(1);
      expect(propertyImageAnalysisService.listeners[0]).toBe(listener2);
    });

    test('should notify listeners of events', () => {
      const listener = jest.fn();
      propertyImageAnalysisService.addListener(listener);
      
      propertyImageAnalysisService.notifyListeners('test_event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledWith('test_event', { data: 'test' });
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();
      
      propertyImageAnalysisService.addListener(errorListener);
      propertyImageAnalysisService.addListener(goodListener);
      
      expect(() => {
        propertyImageAnalysisService.notifyListeners('test_event', {});
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Model Training', () => {
    test('should train property classifier with appropriate config', async () => {
      const mockModel = {
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5, 0.3, 0.2] } })
      };
      
      tf.tensor4d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      await propertyImageAnalysisService.trainPropertyClassifier();
      
      expect(mockModel.fit).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          epochs: 50,
          batchSize: 16,
          validationSplit: 0.2,
          shuffle: true
        })
      );
    });

    test('should notify training progress', async () => {
      const mockModel = {
        fit: jest.fn().mockImplementation((xs, ys, config) => {
          // Simulate training progress
          config.callbacks.onEpochEnd(0, { loss: 0.5, acc: 0.8 });
          return Promise.resolve({ history: { loss: [0.5] } });
        })
      };
      
      propertyImageAnalysisService.models.propertyClassifier = mockModel;
      
      const progressListener = jest.fn();
      propertyImageAnalysisService.addListener(progressListener);
      
      tf.tensor4d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      await propertyImageAnalysisService.trainPropertyClassifier();
      
      expect(progressListener).toHaveBeenCalledWith('training_progress', {
        model: 'propertyClassifier',
        epoch: 1,
        totalEpochs: 50,
        loss: 0.5,
        accuracy: 0.8
      });
    });
  });

  describe('Cleanup', () => {
    test('should dispose all resources correctly', () => {
      const mockModels = {
        propertyClassifier: { dispose: jest.fn() },
        conditionAssessment: { dispose: jest.fn() },
        featureDetection: { dispose: jest.fn() },
        roomClassifier: { dispose: jest.fn() },
        priceEstimator: { dispose: jest.fn() }
      };
      
      propertyImageAnalysisService.models = mockModels;
      propertyImageAnalysisService.cache.set('test', { data: {} });
      propertyImageAnalysisService.listeners = [jest.fn()];
      
      propertyImageAnalysisService.dispose();
      
      Object.values(mockModels).forEach(model => {
        expect(model.dispose).toHaveBeenCalled();
      });
      
      expect(propertyImageAnalysisService.cache.size).toBe(0);
      expect(propertyImageAnalysisService.listeners).toHaveLength(0);
      expect(propertyImageAnalysisService.isInitialized).toBe(false);
    });
  });

  describe('Image Preprocessing', () => {
    test('should reshape image data correctly', () => {
      const flatData = Array(224 * 224 * 3).fill(0).map((_, i) => i / (224 * 224 * 3));
      const reshaped = propertyImageAnalysisService.reshapeImageData(flatData);
      
      expect(reshaped).toHaveLength(224);
      expect(reshaped[0]).toHaveLength(224);
      expect(reshaped[0][0]).toHaveLength(3);
      
      // Check that data is properly reshaped
      expect(reshaped[0][0][0]).toBe(flatData[0]);
      expect(reshaped[0][0][1]).toBe(flatData[1]);
      expect(reshaped[0][0][2]).toBe(flatData[2]);
    });

    test('should preprocess images to correct tensor format', async () => {
      const mockTensor = { dispose: jest.fn() };
      tf.tensor4d.mockReturnValue(mockTensor);
      
      const imageUri = 'file://test.jpg';
      const tensor = await propertyImageAnalysisService.preprocessImage(imageUri);
      
      expect(tf.tensor4d).toHaveBeenCalledWith([expect.any(Array)]);
      expect(tensor).toBe(mockTensor);
    });
  });
});