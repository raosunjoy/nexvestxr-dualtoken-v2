/**
 * Integration Tests for AI Services
 * Tests the interaction between LocationHeatmapService and PropertyScoringService
 */

import { locationHeatmapService } from '../../src/services/LocationHeatmapService';
import { propertyScoringService } from '../../src/services/PropertyScoringService';
import * as tf from '@tensorflow/tfjs';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs');

describe('AI Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset services
    locationHeatmapService.isInitialized = false;
    locationHeatmapService.model = null;
    locationHeatmapService.heatmapData.clear();
    
    propertyScoringService.isInitialized = false;
    propertyScoringService.models = {
      valuation: null,
      riskAssessment: null,
      marketTrend: null,
      investmentScore: null
    };
    propertyScoringService.cache.clear();
  });

  describe('Service Initialization Flow', () => {
    test('should initialize both services successfully', async () => {
      // Mock TensorFlow initialization
      tf.ready.mockResolvedValue();
      
      const mockModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 75, 25]))
        }),
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      tf.loadLayersModel.mockRejectedValue(new Error('Model not found'));
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      // Initialize both services
      await Promise.all([
        locationHeatmapService.initialize(),
        propertyScoringService.initialize()
      ]);
      
      expect(locationHeatmapService.isInitialized).toBe(true);
      expect(propertyScoringService.isInitialized).toBe(true);
    });

    test('should handle partial initialization failure', async () => {
      tf.ready.mockResolvedValue();
      
      // Mock heatmap service success
      const mockHeatmapModel = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 75, 25]))
        }),
        compile: jest.fn(),
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValueOnce(mockHeatmapModel);
      tf.loadLayersModel.mockRejectedValue(new Error('Model not found'));
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      // Mock scoring service failure on second call
      tf.sequential.mockImplementationOnce(() => {
        throw new Error('Model creation failed');
      });
      
      const heatmapPromise = locationHeatmapService.initialize();
      const scoringPromise = propertyScoringService.initialize();
      
      await heatmapPromise;
      await scoringPromise;
      
      expect(locationHeatmapService.isInitialized).toBe(true);
      expect(propertyScoringService.isInitialized).toBe(false);
    });
  });

  describe('Cross-Service Data Flow', () => {
    beforeEach(async () => {
      // Set up both services as initialized
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        })
      };
      
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.85, 150, 75]))
          })
        },
        riskAssessment: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4]))
          })
        },
        marketTrend: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3]))
          })
        },
        investmentScore: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72]))
          })
        }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
    });

    test('should use heatmap data for detailed property analysis', async () => {
      // Generate heatmap data
      const heatmapData = await locationHeatmapService.generateHeatmap({
        propertyType: 0,
        maxPoints: 10
      });
      
      expect(heatmapData).toBeDefined();
      expect(Array.isArray(heatmapData)).toBe(true);
      
      if (heatmapData.length > 0) {
        const selectedPoint = heatmapData[0];
        
        // Use heatmap point for detailed analysis
        const propertyData = {
          id: `property-${selectedPoint.latitude}-${selectedPoint.longitude}`,
          latitude: selectedPoint.latitude,
          longitude: selectedPoint.longitude,
          size: 150,
          bedrooms: 3,
          bathrooms: 2,
          age: 5,
          amenitiesCount: 15,
          districtScore: 85,
          marketTrend: 1.05
        };
        
        const analysis = await propertyScoringService.analyzeProperty(propertyData);
        
        expect(analysis).toHaveProperty('propertyId');
        expect(analysis).toHaveProperty('valuation');
        expect(analysis).toHaveProperty('risk');
        expect(analysis).toHaveProperty('investment');
        expect(analysis).toHaveProperty('overallScore');
        
        // Verify models were called with correct data
        expect(propertyScoringService.models.valuation.predict).toHaveBeenCalled();
        expect(propertyScoringService.models.riskAssessment.predict).toHaveBeenCalled();
        expect(propertyScoringService.models.marketTrend.predict).toHaveBeenCalled();
        expect(propertyScoringService.models.investmentScore.predict).toHaveBeenCalled();
      }
    });

    test('should correlate heatmap and scoring predictions', async () => {
      const latitude = 25.0760;
      const longitude = 55.1302;
      
      // Get heatmap prediction
      const heatmapPrediction = await locationHeatmapService.getPredictionForLocation(
        latitude, longitude, { type: 0, size: 150, age: 5 }
      );
      
      // Get detailed scoring analysis
      const propertyData = {
        id: 'test-property',
        latitude,
        longitude,
        size: 150,
        bedrooms: 3,
        bathrooms: 2,
        age: 5
      };
      
      const scoringAnalysis = await propertyScoringService.analyzeProperty(propertyData);
      
      expect(heatmapPrediction.success).toBe(true);
      expect(scoringAnalysis).toBeDefined();
      
      // Values should be correlated (within reasonable range)
      const heatmapValue = heatmapPrediction.data.value;
      const scoringValue = scoringAnalysis.valuation.estimatedValue;
      
      // Allow for some variance between models
      const variance = Math.abs(heatmapValue - scoringValue) / Math.max(heatmapValue, scoringValue);
      expect(variance).toBeLessThan(0.5); // Within 50% of each other
    });
  });

  describe('Performance Integration', () => {
    beforeEach(() => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array(Array(400).fill(15000))) // 100 points * 4 outputs
        })
      };
      
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])) }) },
        riskAssessment: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])) }) },
        marketTrend: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])) }) },
        investmentScore: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])) }) }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
    });

    test('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Generate concurrent requests
      const heatmapPromises = Array(5).fill().map((_, i) =>
        locationHeatmapService.generateHeatmap({
          propertyType: i % 3,
          maxPoints: 20
        })
      );
      
      const analysisPromises = Array(5).fill().map((_, i) =>
        propertyScoringService.analyzeProperty({
          id: `property-${i}`,
          latitude: 25.0 + i * 0.01,
          longitude: 55.0 + i * 0.01,
          size: 100 + i * 10
        })
      );
      
      const [heatmapResults, analysisResults] = await Promise.all([
        Promise.all(heatmapPromises),
        Promise.all(analysisPromises)
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(heatmapResults).toHaveLength(5);
      expect(analysisResults).toHaveLength(5);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should manage memory efficiently during bulk operations', async () => {
      const disposeSpies = [];
      
      tf.tensor2d.mockImplementation(() => {
        const tensor = { dispose: jest.fn() };
        disposeSpies.push(tensor.dispose);
        return tensor;
      });
      
      tf.tensor3d.mockImplementation(() => {
        const tensor = { dispose: jest.fn() };
        disposeSpies.push(tensor.dispose);
        return tensor;
      });
      
      // Perform bulk operations
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(
          locationHeatmapService.generateHeatmap({ maxPoints: 10 }),
          propertyScoringService.analyzeProperty({
            id: `property-${i}`,
            latitude: 25.0,
            longitude: 55.0,
            size: 100
          })
        );
      }
      
      await Promise.all(operations);
      
      // All tensors should be properly disposed
      disposeSpies.forEach(disposeSpy => {
        expect(disposeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Error Propagation', () => {
    test('should handle heatmap service errors in analysis workflow', async () => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockImplementation(() => {
          throw new Error('Heatmap prediction failed');
        })
      };
      
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])) }) },
        riskAssessment: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])) }) },
        marketTrend: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])) }) },
        investmentScore: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])) }) }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      // Heatmap should fail
      await expect(locationHeatmapService.generateHeatmap({}))
        .rejects.toThrow('Heatmap prediction failed');
      
      // But property scoring should still work independently
      const analysis = await propertyScoringService.analyzeProperty({
        id: 'test-property',
        latitude: 25.0,
        longitude: 55.0,
        size: 100
      });
      
      expect(analysis).toBeDefined();
      expect(analysis.valuation).toBeDefined();
    });

    test('should handle scoring service errors in heatmap workflow', async () => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        })
      };
      
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: {
          predict: jest.fn().mockImplementation(() => {
            throw new Error('Valuation failed');
          })
        }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      
      // Heatmap should work
      const heatmapData = await locationHeatmapService.generateHeatmap({ maxPoints: 5 });
      expect(heatmapData).toBeDefined();
      
      // But property analysis should fail
      await expect(propertyScoringService.analyzeProperty({
        id: 'test-property',
        latitude: 25.0,
        longitude: 55.0
      })).rejects.toThrow();
    });
  });

  describe('Cache Interaction', () => {
    beforeEach(() => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        })
      };
      
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])) }) },
        riskAssessment: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])) }) },
        marketTrend: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])) }) },
        investmentScore: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])) }) }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
    });

    test('should cache results from both services independently', async () => {
      const filters = { propertyType: 0, maxPoints: 5 };
      const propertyData = {
        id: 'test-property',
        latitude: 25.0,
        longitude: 55.0,
        size: 100
      };
      
      // First calls should compute results
      const heatmapResult1 = await locationHeatmapService.generateHeatmap(filters);
      const analysisResult1 = await propertyScoringService.analyzeProperty(propertyData);
      
      // Clear model call counts
      jest.clearAllMocks();
      
      // Second calls should use cache
      const heatmapResult2 = await locationHeatmapService.generateHeatmap(filters);
      const analysisResult2 = await propertyScoringService.analyzeProperty(propertyData);
      
      // Should return same results
      expect(heatmapResult2).toEqual(heatmapResult1);
      expect(analysisResult2).toEqual(analysisResult1);
      
      // Models should not be called again
      expect(locationHeatmapService.model.predict).not.toHaveBeenCalled();
      expect(propertyScoringService.models.valuation.predict).not.toHaveBeenCalled();
    });

    test('should invalidate related cache when models are updated', async () => {
      const newData = [{
        latitude: 25.0,
        longitude: 55.0,
        pricePerSqm: 16000,
        demandScore: 85
      }];
      
      // Generate initial cached data
      await locationHeatmapService.generateHeatmap({ maxPoints: 5 });
      await propertyScoringService.analyzeProperty({
        id: 'test-property',
        latitude: 25.0,
        longitude: 55.0
      });
      
      expect(locationHeatmapService.heatmapData.size).toBeGreaterThan(0);
      expect(propertyScoringService.cache.size).toBeGreaterThan(0);
      
      // Update heatmap model
      locationHeatmapService.model = {
        fit: jest.fn().mockResolvedValue({ history: { loss: [0.3] } }),
        save: jest.fn().mockResolvedValue(),
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([16000, 85, 80, 20]))
        })
      };
      
      await locationHeatmapService.updateModelWithNewData(newData);
      
      // Heatmap cache should be cleared
      expect(locationHeatmapService.heatmapData.size).toBe(0);
      
      // Property scoring cache should be independent
      expect(propertyScoringService.cache.size).toBeGreaterThan(0);
    });
  });

  describe('Event Coordination', () => {
    test('should coordinate events between services', async () => {
      const heatmapListener = jest.fn();
      const scoringListener = jest.fn();
      
      locationHeatmapService.addListener(heatmapListener);
      propertyScoringService.addListener(scoringListener);
      
      locationHeatmapService.isInitialized = true;
      propertyScoringService.isInitialized = true;
      
      // Setup models
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25]))
        })
      };
      
      propertyScoringService.models = {
        valuation: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])) }) },
        riskAssessment: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])) }) },
        marketTrend: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])) }) },
        investmentScore: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])) }) }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      // Trigger operations
      await locationHeatmapService.generateHeatmap({ maxPoints: 5 });
      await propertyScoringService.analyzeProperty({
        id: 'test-property',
        latitude: 25.0,
        longitude: 55.0
      });
      
      // Both services should have fired events
      expect(heatmapListener).toHaveBeenCalledWith('heatmap_generation_started', expect.any(Object));
      expect(heatmapListener).toHaveBeenCalledWith('heatmap_generation_completed', expect.any(Object));
      
      expect(scoringListener).toHaveBeenCalledWith('analysis_started', expect.any(Object));
      expect(scoringListener).toHaveBeenCalledWith('analysis_completed', expect.any(Object));
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across services', async () => {
      locationHeatmapService.isInitialized = true;
      propertyScoringService.isInitialized = true;
      
      // Use consistent mock data
      const mockValue = 15000;
      const mockDemand = 80;
      const mockRisk = 0.25;
      
      locationHeatmapService.model = {
        predict: jest.fn().mockReturnValue({
          data: jest.fn().mockResolvedValue(new Float32Array([mockValue, mockDemand, 75, mockRisk * 100]))
        })
      };
      
      propertyScoringService.models = {
        valuation: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([mockValue, 0.85, mockValue/100, 75]))
          })
        },
        riskAssessment: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([mockRisk, 0.2, 0.3, 0.15, 0.35]))
          })
        },
        marketTrend: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3]))
          })
        },
        investmentScore: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72]))
          })
        }
      };
      
      tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
      tf.tensor3d.mockReturnValue({ dispose: jest.fn() });
      
      const latitude = 25.0760;
      const longitude = 55.1302;
      
      // Get predictions from both services
      const heatmapPrediction = await locationHeatmapService.getPredictionForLocation(
        latitude, longitude, { type: 0, size: 150 }
      );
      
      const scoringAnalysis = await propertyScoringService.analyzeProperty({
        id: 'test-property',
        latitude,
        longitude,
        size: 150
      });
      
      // Values should be consistent
      expect(heatmapPrediction.data.value).toBe(mockValue);
      expect(scoringAnalysis.valuation.estimatedValue).toBe(mockValue);
      
      expect(heatmapPrediction.data.risk / 100).toBeCloseTo(mockRisk, 1);
      expect(scoringAnalysis.risk.overallRisk).toBe(mockRisk);
    });
  });
});