import { locationHeatmapService } from '../LocationHeatmapService';
import * as tf from '@tensorflow/tfjs';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs');

describe('LocationHeatmapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    locationHeatmapService.isInitialized = false;
    locationHeatmapService.model = null;
    locationHeatmapService.heatmapData.clear();
    locationHeatmapService.listeners = [];
  });

  describe('Service Initialization', () => {
    test('should initialize successfully with TensorFlow ready', async () => {
      tf.ready.mockResolvedValue();
      
      const mockModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      
      await locationHeatmapService.initialize();
      
      expect(tf.ready).toHaveBeenCalled();
      expect(locationHeatmapService.isInitialized).toBe(true);
    });

    test('should handle initialization failure gracefully', async () => {
      tf.ready.mockRejectedValue(new Error('TensorFlow initialization failed'));
      
      const errorListener = jest.fn();
      locationHeatmapService.addListener(errorListener);
      
      await locationHeatmapService.initialize();
      
      expect(locationHeatmapService.isInitialized).toBe(false);
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('Model Creation and Training', () => {
    test('should create a new TensorFlow model with correct architecture', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5, 0.3] } }),
        save: jest.fn().mockResolvedValue(),
        predict: jest.fn()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.layers.dense.mockReturnValue({ name: 'dense' });
      tf.layers.dropout.mockReturnValue({ name: 'dropout' });
      tf.tensor2d.mockReturnValue({
        dispose: jest.fn()
      });
      
      await locationHeatmapService.createModel();
      
      expect(tf.sequential).toHaveBeenCalled();
      expect(mockModel.compile).toHaveBeenCalledWith({
        optimizer: expect.anything(),
        loss: 'meanSquaredError',
        metrics: ['mae', 'mse']
      });
      expect(mockModel.fit).toHaveBeenCalled();
      expect(mockModel.save).toHaveBeenCalled();
    });

    test('should generate training data with UAE property patterns', () => {
      const trainingData = locationHeatmapService.generateUAETrainingData();
      
      expect(trainingData.features).toHaveLength(1000);
      expect(trainingData.labels).toHaveLength(1000);
      
      // Check feature structure: [lat, lng, property_type, size, age, amenities_score]
      expect(trainingData.features[0]).toHaveLength(6);
      
      // Check label structure: [value, demand_score, investment_score, risk_score]
      expect(trainingData.labels[0]).toHaveLength(4);
      
      // Verify UAE coordinate bounds
      trainingData.features.forEach(feature => {
        const [lat, lng] = feature;
        expect(lat).toBeGreaterThanOrEqual(22.6);
        expect(lat).toBeLessThanOrEqual(26.1);
        expect(lng).toBeGreaterThanOrEqual(51.5);
        expect(lng).toBeLessThanOrEqual(56.4);
      });
    });
  });

  describe('Heatmap Generation', () => {
    beforeEach(() => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        })
      };
    });

    test('should generate heatmap data for UAE region', async () => {
      const filters = {
        propertyType: 0,
        size: 100,
        maxPoints: 50
      };
      
      tf.tensor2d.mockReturnValue({
        dispose: jest.fn()
      });
      
      const heatmapData = await locationHeatmapService.generateHeatmap(filters);
      
      expect(heatmapData).toBeDefined();
      expect(Array.isArray(heatmapData)).toBe(true);
      expect(heatmapData.length).toBeLessThanOrEqual(50);
      
      if (heatmapData.length > 0) {
        const point = heatmapData[0];
        expect(point).toHaveProperty('latitude');
        expect(point).toHaveProperty('longitude');
        expect(point).toHaveProperty('value');
        expect(point).toHaveProperty('demand');
        expect(point).toHaveProperty('investment');
        expect(point).toHaveProperty('risk');
        expect(point).toHaveProperty('intensity');
      }
    });

    test('should return cached data when available', async () => {
      const filters = { propertyType: 0 };
      const cachedData = [
        { latitude: 25.0, longitude: 55.0, value: 12000, intensity: 0.8 }
      ];
      
      // Set cache
      const cacheKey = locationHeatmapService.generateCacheKey(filters);
      locationHeatmapService.heatmapData.set(cacheKey, {
        data: cachedData,
        timestamp: Date.now()
      });
      
      const result = await locationHeatmapService.generateHeatmap(filters);
      
      expect(result).toEqual(cachedData);
      expect(locationHeatmapService.model.predict).not.toHaveBeenCalled();
    });

    test('should apply filters correctly', () => {
      const points = [
        { latitude: 25.0, longitude: 55.0, value: 10000, demand: 70, investment: 80, risk: 30, intensity: 0.5 },
        { latitude: 25.1, longitude: 55.1, value: 20000, demand: 90, investment: 95, risk: 15, intensity: 0.9 },
        { latitude: 25.2, longitude: 55.2, value: 5000, demand: 40, investment: 30, risk: 70, intensity: 0.2 }
      ];
      
      const filters = {
        minValue: 8000,
        maxValue: 18000,
        minDemand: 60,
        maxRisk: 40,
        maxPoints: 5
      };
      
      const filtered = locationHeatmapService.applyHeatmapFilters(points, filters);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].value).toBe(10000);
    });
  });

  describe('Location Predictions', () => {
    beforeEach(() => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        })
      };
    });

    test('should provide prediction for specific location', async () => {
      tf.tensor2d.mockReturnValue({
        dispose: jest.fn()
      });
      
      const prediction = await locationHeatmapService.getPredictionForLocation(
        25.0760, 55.1302, // Dubai Marina coordinates
        { type: 0, size: 150, age: 3, amenitiesScore: 85 }
      );
      
      expect(prediction.success).toBe(true);
      expect(prediction.data).toHaveProperty('latitude', 25.0760);
      expect(prediction.data).toHaveProperty('longitude', 55.1302);
      expect(prediction.data).toHaveProperty('value');
      expect(prediction.data).toHaveProperty('demand');
      expect(prediction.data).toHaveProperty('investment');
      expect(prediction.data).toHaveProperty('risk');
      expect(prediction.data).toHaveProperty('confidence');
      expect(prediction.data).toHaveProperty('recommendation');
    });

    test('should calculate confidence based on location', () => {
      // Test prime area location (Dubai Marina)
      const primeConfidence = locationHeatmapService.calculateConfidence(25.0760, 55.1302);
      expect(primeConfidence).toBeGreaterThan(0.8);
      
      // Test non-prime area location
      const standardConfidence = locationHeatmapService.calculateConfidence(25.5, 55.5);
      expect(standardConfidence).toBeLessThan(0.9);
    });

    test('should generate appropriate recommendations', () => {
      const excellentResult = [25000, 90, 85, 15]; // High investment, low risk
      const recommendation1 = locationHeatmapService.generateRecommendation(excellentResult);
      expect(recommendation1).toBe('Excellent investment opportunity');
      
      const poorResult = [8000, 30, 25, 80]; // Low investment, high risk
      const recommendation2 = locationHeatmapService.generateRecommendation(poorResult);
      expect(recommendation2).toBe('High risk investment');
    });
  });

  describe('Model Updates', () => {
    beforeEach(() => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.3] } }),
        save: jest.fn().mockResolvedValue()
      };
    });

    test('should update model with new property data', async () => {
      const newData = [
        {
          latitude: 25.0760,
          longitude: 55.1302,
          type: 0,
          size: 120,
          age: 2,
          amenitiesScore: 90,
          pricePerSqm: 16000,
          demandScore: 85,
          investmentScore: 88,
          riskScore: 20
        }
      ];
      
      tf.tensor2d.mockReturnValue({
        dispose: jest.fn()
      });
      
      const updateListener = jest.fn();
      locationHeatmapService.addListener(updateListener);
      
      await locationHeatmapService.updateModelWithNewData(newData);
      
      expect(locationHeatmapService.model.fit).toHaveBeenCalled();
      expect(locationHeatmapService.model.save).toHaveBeenCalled();
      expect(updateListener).toHaveBeenCalledWith('model_updated', { dataPoints: 1 });
      expect(locationHeatmapService.heatmapData.size).toBe(0); // Cache cleared
    });
  });

  describe('Utility Functions', () => {
    test('should calculate distance between coordinates correctly', () => {
      // Distance between Dubai Marina and Downtown Dubai (approximately 15-20km)
      const distance = locationHeatmapService.calculateDistance(
        25.0760, 55.1302, // Dubai Marina
        25.2048, 55.2708  // Downtown Dubai
      );
      
      expect(distance).toBeGreaterThan(10);
      expect(distance).toBeLessThan(30);
    });

    test('should convert degrees to radians correctly', () => {
      expect(locationHeatmapService.toRadians(180)).toBeCloseTo(Math.PI);
      expect(locationHeatmapService.toRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(locationHeatmapService.toRadians(0)).toBe(0);
    });

    test('should normalize intensity values correctly', () => {
      const minValue = 2000;
      const maxValue = 25000;
      
      expect(locationHeatmapService.normalizeIntensity(minValue, {})).toBe(0);
      expect(locationHeatmapService.normalizeIntensity(maxValue, {})).toBe(1);
      expect(locationHeatmapService.normalizeIntensity(13500, {})).toBeCloseTo(0.5);
    });

    test('should generate grid points covering UAE', () => {
      const gridPoints = locationHeatmapService.generateGridPoints();
      
      expect(gridPoints.length).toBe((50 + 1) * (50 + 1)); // 51x51 grid
      
      // Check bounds
      const latitudes = gridPoints.map(p => p.lat);
      const longitudes = gridPoints.map(p => p.lng);
      
      expect(Math.min(...latitudes)).toBeCloseTo(22.633);
      expect(Math.max(...latitudes)).toBeCloseTo(26.084);
      expect(Math.min(...longitudes)).toBeCloseTo(51.583);
      expect(Math.max(...longitudes)).toBeCloseTo(56.396);
    });

    test('should chunk arrays correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const chunks = locationHeatmapService.chunkArray(array, 3);
      
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    });
  });

  describe('Event Listeners', () => {
    test('should add and remove listeners correctly', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      locationHeatmapService.addListener(listener1);
      locationHeatmapService.addListener(listener2);
      
      expect(locationHeatmapService.listeners).toHaveLength(2);
      
      locationHeatmapService.removeListener(listener1);
      
      expect(locationHeatmapService.listeners).toHaveLength(1);
      expect(locationHeatmapService.listeners[0]).toBe(listener2);
    });

    test('should notify listeners of events', () => {
      const listener = jest.fn();
      locationHeatmapService.addListener(listener);
      
      locationHeatmapService.notifyListeners('test_event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledWith('test_event', { data: 'test' });
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();
      
      locationHeatmapService.addListener(errorListener);
      locationHeatmapService.addListener(goodListener);
      
      expect(() => {
        locationHeatmapService.notifyListeners('test_event', {});
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    test('should generate consistent cache keys', () => {
      const filters1 = { propertyType: 0, size: 100 };
      const filters2 = { propertyType: 0, size: 100 };
      const filters3 = { propertyType: 1, size: 100 };
      
      const key1 = locationHeatmapService.generateCacheKey(filters1);
      const key2 = locationHeatmapService.generateCacheKey(filters2);
      const key3 = locationHeatmapService.generateCacheKey(filters3);
      
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    test('should expire old cache entries', async () => {
      const filters = { propertyType: 0 };
      const cacheKey = locationHeatmapService.generateCacheKey(filters);
      
      // Set old cache entry
      locationHeatmapService.heatmapData.set(cacheKey, {
        data: [],
        timestamp: Date.now() - (35 * 60 * 1000) // 35 minutes ago (expired)
      });
      
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        })
      };
      
      tf.tensor2d.mockReturnValue({
        dispose: jest.fn()
      });
      
      await locationHeatmapService.generateHeatmap(filters);
      
      // Should have generated new data, not used cache
      expect(locationHeatmapService.model.predict).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle uninitialized service gracefully', async () => {
      locationHeatmapService.isInitialized = false;
      
      await expect(locationHeatmapService.generateHeatmap({}))
        .rejects.toThrow('Service not initialized');
    });

    test('should handle model prediction errors', async () => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockImplementation(() => {
          throw new Error('Prediction failed');
        })
      };
      
      const errorListener = jest.fn();
      locationHeatmapService.addListener(errorListener);
      
      await expect(locationHeatmapService.generateHeatmap({}))
        .rejects.toThrow();
      
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });

    test('should handle location prediction errors', async () => {
      locationHeatmapService.isInitialized = false;
      
      const result = await locationHeatmapService.getPredictionForLocation(25.0, 55.0);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Model not initialized');
    });
  });

  describe('Performance', () => {
    test('should process large datasets efficiently', async () => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array(Array(400).fill(15000))) // 100 points * 4 outputs
        })
      };
      
      tf.tensor2d.mockReturnValue({
        dispose: jest.fn()
      });
      
      const startTime = Date.now();
      
      const filters = { maxPoints: 100 };
      await locationHeatmapService.generateHeatmap(filters);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds in test environment)
      expect(duration).toBeLessThan(5000);
    });

    test('should dispose of tensors properly', async () => {
      locationHeatmapService.isInitialized = true;
      
      const mockTensor = {
        dispose: jest.fn()
      };
      
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25])),
          dispose: jest.fn()
        })
      };
      
      tf.tensor2d.mockReturnValue(mockTensor);
      
      await locationHeatmapService.generateHeatmap({ maxPoints: 1 });
      
      // Should dispose of prediction tensor
      expect(locationHeatmapService.model.predict().dispose).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should dispose resources correctly', () => {
      const mockModel = {
        dispose: jest.fn()
      };
      
      locationHeatmapService.model = mockModel;
      locationHeatmapService.heatmapData.set('test', { data: [], timestamp: Date.now() });
      locationHeatmapService.listeners = [jest.fn()];
      
      locationHeatmapService.dispose();
      
      expect(mockModel.dispose).toHaveBeenCalled();
      expect(locationHeatmapService.heatmapData.size).toBe(0);
      expect(locationHeatmapService.listeners).toHaveLength(0);
    });
  });
});