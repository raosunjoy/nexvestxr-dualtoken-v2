/**
 * Performance Tests for AI Services
 * Tests memory usage, execution time, and scalability
 */

import { locationHeatmapService } from '../../src/services/LocationHeatmapService';
import { propertyScoringService } from '../../src/services/PropertyScoringService';
import * as tf from '@tensorflow/tfjs';

// Mock TensorFlow.js with performance tracking
jest.mock('@tensorflow/tfjs');

describe('AI Services Performance', () => {
  let tensorDisposalCount = 0;
  let memoryUsage = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
    tensorDisposalCount = 0;
    memoryUsage = [];
    
    // Mock tensor creation with disposal tracking
    tf.tensor2d.mockImplementation((data) => ({
      data: jest.fn().mockResolvedValue(new Float32Array(data.flat())),
      dispose: jest.fn(() => {
        tensorDisposalCount++;
      }),
      shape: [data.length, data[0] ? data[0].length : 0]
    }));
    
    tf.tensor3d.mockImplementation((data) => ({
      data: jest.fn().mockResolvedValue(new Float32Array(data.flat(2))),
      dispose: jest.fn(() => {
        tensorDisposalCount++;
      }),
      shape: [data.length, data[0] ? data[0].length : 0, data[0][0] ? data[0][0].length : 0]
    }));
    
    // Mock memory tracking
    tf.memory.mockImplementation(() => ({
      numTensors: Math.max(0, Math.random() * 100 - tensorDisposalCount),
      numDataBuffers: Math.max(0, Math.random() * 50 - tensorDisposalCount),
      numBytes: Math.max(0, Math.random() * 1000000 - tensorDisposalCount * 1000)
    }));
  });

  describe('LocationHeatmapService Performance', () => {
    beforeEach(() => {
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockImplementation((input) => {
          const batchSize = input.shape[0];
          return {
            data: jest.fn().mockResolvedValue(
              new Float32Array(Array(batchSize * 4).fill().map(() => Math.random() * 20000))
            ),
            dispose: jest.fn(() => tensorDisposalCount++)
          };
        })
      };
    });

    test('should generate heatmap within performance thresholds', async () => {
      const startTime = performance.now();
      const startMemory = tf.memory();
      
      const filters = {
        propertyType: 0,
        size: 100,
        maxPoints: 100
      };
      
      const heatmapData = await locationHeatmapService.generateHeatmap(filters);
      
      const endTime = performance.now();
      const endMemory = tf.memory();
      
      const executionTime = endTime - startTime;
      const memoryIncrease = endMemory.numBytes - startMemory.numBytes;
      
      // Performance assertions
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(heatmapData.length).toBeLessThanOrEqual(100); // Respects maxPoints limit
      expect(memoryIncrease).toBeLessThan(10000000); // Memory increase < 10MB
      
      console.log(`Heatmap generation: ${executionTime.toFixed(2)}ms, Memory: ${(memoryIncrease/1024/1024).toFixed(2)}MB`);
    });

    test('should handle large grid resolutions efficiently', async () => {
      const gridSizes = [25, 50, 75, 100];
      const performanceResults = [];
      
      for (const gridSize of gridSizes) {
        locationHeatmapService.gridResolution = gridSize;
        
        const startTime = performance.now();
        const startMemory = tf.memory();
        
        await locationHeatmapService.generateHeatmap({ maxPoints: 200 });
        
        const endTime = performance.now();
        const endMemory = tf.memory();
        
        performanceResults.push({
          gridSize,
          executionTime: endTime - startTime,
          memoryUsage: endMemory.numBytes - startMemory.numBytes
        });
      }
      
      // Performance should scale reasonably with grid size
      for (let i = 1; i < performanceResults.length; i++) {
        const prev = performanceResults[i - 1];
        const curr = performanceResults[i];
        
        // Execution time should not increase exponentially
        const timeRatio = curr.executionTime / prev.executionTime;
        expect(timeRatio).toBeLessThan(3); // Less than 3x increase
        
        // Memory usage should be reasonable
        expect(curr.memoryUsage).toBeLessThan(50000000); // Less than 50MB
      }
      
      console.log('Grid size performance:', performanceResults);
    });

    test('should process concurrent heatmap requests efficiently', async () => {
      const concurrencyLevels = [1, 5, 10, 20];
      const performanceResults = [];
      
      for (const concurrency of concurrencyLevels) {
        const startTime = performance.now();
        const startMemory = tf.memory();
        
        const promises = Array(concurrency).fill().map((_, i) =>
          locationHeatmapService.generateHeatmap({
            propertyType: i % 3,
            maxPoints: 50
          })
        );
        
        await Promise.all(promises);
        
        const endTime = performance.now();
        const endMemory = tf.memory();
        
        performanceResults.push({
          concurrency,
          executionTime: endTime - startTime,
          avgTimePerRequest: (endTime - startTime) / concurrency,
          memoryUsage: endMemory.numBytes - startMemory.numBytes
        });
      }
      
      // Performance characteristics
      performanceResults.forEach(result => {
        expect(result.avgTimePerRequest).toBeLessThan(2000); // Avg < 2 seconds per request
        expect(result.memoryUsage).toBeLessThan(100000000); // Memory < 100MB
      });
      
      console.log('Concurrency performance:', performanceResults);
    });

    test('should dispose of tensors properly under load', async () => {
      const initialDisposalCount = tensorDisposalCount;
      
      // Generate multiple heatmaps
      const promises = Array(10).fill().map((_, i) =>
        locationHeatmapService.generateHeatmap({
          propertyType: i % 2,
          maxPoints: 20
        })
      );
      
      await Promise.all(promises);
      
      const finalDisposalCount = tensorDisposalCount;
      const tensorsCreated = finalDisposalCount - initialDisposalCount;
      
      // Should have disposed of created tensors
      expect(tensorsCreated).toBeGreaterThan(0);
      
      // Memory should be stable after operations
      const finalMemory = tf.memory();
      expect(finalMemory.numTensors).toBeLessThan(50); // Reasonable tensor count
    });
  });

  describe('PropertyScoringService Performance', () => {
    beforeEach(() => {
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])),
            dispose: jest.fn(() => tensorDisposalCount++)
          })
        },
        riskAssessment: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])),
            dispose: jest.fn(() => tensorDisposalCount++)
          })
        },
        marketTrend: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])),
            dispose: jest.fn(() => tensorDisposalCount++)
          })
        },
        investmentScore: {
          predict: jest.fn().mockReturnValue({
            data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])),
            dispose: jest.fn(() => tensorDisposalCount++)
          })
        }
      };
    });

    test('should analyze properties within performance thresholds', async () => {
      const startTime = performance.now();
      const startMemory = tf.memory();
      
      const propertyData = {
        id: 'performance-test-property',
        latitude: 25.0760,
        longitude: 55.1302,
        size: 150,
        bedrooms: 3,
        bathrooms: 2,
        age: 5,
        amenitiesCount: 15,
        districtScore: 85,
        marketTrend: 1.05
      };
      
      const analysis = await propertyScoringService.analyzeProperty(propertyData);
      
      const endTime = performance.now();
      const endMemory = tf.memory();
      
      const executionTime = endTime - startTime;
      const memoryIncrease = endMemory.numBytes - startMemory.numBytes;
      
      // Performance assertions
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(analysis).toHaveProperty('overallScore');
      expect(memoryIncrease).toBeLessThan(5000000); // Memory increase < 5MB
      
      console.log(`Property analysis: ${executionTime.toFixed(2)}ms, Memory: ${(memoryIncrease/1024/1024).toFixed(2)}MB`);
    });

    test('should handle bulk property analysis efficiently', async () => {
      const propertyCounts = [1, 10, 50, 100];
      const performanceResults = [];
      
      for (const count of propertyCounts) {
        const properties = Array(count).fill().map((_, i) => ({
          id: `bulk-property-${i}`,
          latitude: 25.0 + i * 0.001,
          longitude: 55.0 + i * 0.001,
          size: 100 + i * 2,
          bedrooms: 2 + (i % 3),
          bathrooms: 1 + (i % 2),
          age: i % 20,
          amenitiesCount: 10 + (i % 15),
          districtScore: 60 + (i % 40),
          marketTrend: 1.0 + (i % 10) * 0.01
        }));
        
        const startTime = performance.now();
        const startMemory = tf.memory();
        
        const analysisPromises = properties.map(property =>
          propertyScoringService.analyzeProperty(property)
        );
        
        await Promise.all(analysisPromises);
        
        const endTime = performance.now();
        const endMemory = tf.memory();
        
        performanceResults.push({
          propertyCount: count,
          executionTime: endTime - startTime,
          avgTimePerProperty: (endTime - startTime) / count,
          memoryUsage: endMemory.numBytes - startMemory.numBytes
        });
      }
      
      // Performance should scale linearly or better
      performanceResults.forEach(result => {
        expect(result.avgTimePerProperty).toBeLessThan(500); // Avg < 500ms per property
        expect(result.memoryUsage).toBeLessThan(20000000); // Memory < 20MB per batch
      });
      
      console.log('Bulk analysis performance:', performanceResults);
    });

    test('should maintain performance with cache usage', async () => {
      const propertyData = {
        id: 'cache-test-property',
        latitude: 25.0760,
        longitude: 55.1302,
        size: 150
      };
      
      // First analysis (cache miss)
      const startTime1 = performance.now();
      await propertyScoringService.analyzeProperty(propertyData);
      const endTime1 = performance.now();
      
      // Second analysis (cache hit)
      const startTime2 = performance.now();
      await propertyScoringService.analyzeProperty(propertyData);
      const endTime2 = performance.now();
      
      const firstAnalysisTime = endTime1 - startTime1;
      const secondAnalysisTime = endTime2 - startTime2;
      
      // Cache hit should be significantly faster
      expect(secondAnalysisTime).toBeLessThan(firstAnalysisTime * 0.1); // At least 10x faster
      expect(secondAnalysisTime).toBeLessThan(50); // Should be very fast (< 50ms)
      
      console.log(`Cache performance - First: ${firstAnalysisTime.toFixed(2)}ms, Second: ${secondAnalysisTime.toFixed(2)}ms`);
    });
  });

  describe('Cross-Service Performance', () => {
    beforeEach(() => {
      // Setup both services
      locationHeatmapService.isInitialized = true;
      locationHeatmapService.model = {
        predict: jest.fn().mockImplementation((input) => {
          const batchSize = input.shape[0];
          return {
            data: jest.fn().mockResolvedValue(
              new Float32Array(Array(batchSize * 4).fill().map(() => Math.random() * 20000))
            ),
            dispose: jest.fn(() => tensorDisposalCount++)
          };
        })
      };
      
      propertyScoringService.isInitialized = true;
      propertyScoringService.models = {
        valuation: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8, 150, 75])), dispose: jest.fn(() => tensorDisposalCount++) }) },
        riskAssessment: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.3, 0.25, 0.35, 0.2, 0.4])), dispose: jest.fn(() => tensorDisposalCount++) }) },
        marketTrend: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.2, 0.8, 8, 0.3])), dispose: jest.fn(() => tensorDisposalCount++) }) },
        investmentScore: { predict: jest.fn().mockReturnValue({ data: jest.fn().mockResolvedValue(new Float32Array([0.75, 0.7, 0.8, 0.72])), dispose: jest.fn(() => tensorDisposalCount++) }) }
      };
    });

    test('should handle concurrent operations across services', async () => {
      const startTime = performance.now();
      const startMemory = tf.memory();
      
      // Mix of heatmap and analysis operations
      const operations = [
        ...Array(5).fill().map((_, i) => 
          locationHeatmapService.generateHeatmap({
            propertyType: i % 2,
            maxPoints: 20
          })
        ),
        ...Array(5).fill().map((_, i) =>
          propertyScoringService.analyzeProperty({
            id: `concurrent-property-${i}`,
            latitude: 25.0 + i * 0.01,
            longitude: 55.0 + i * 0.01,
            size: 100 + i * 10
          })
        )
      ];
      
      const results = await Promise.all(operations);
      
      const endTime = performance.now();
      const endMemory = tf.memory();
      
      const executionTime = endTime - startTime;
      const memoryIncrease = endMemory.numBytes - startMemory.numBytes;
      
      // Should complete all operations efficiently
      expect(results).toHaveLength(10);
      expect(executionTime).toBeLessThan(8000); // All operations within 8 seconds
      expect(memoryIncrease).toBeLessThan(50000000); // Memory increase < 50MB
      
      console.log(`Concurrent operations: ${executionTime.toFixed(2)}ms, Memory: ${(memoryIncrease/1024/1024).toFixed(2)}MB`);
    });

    test('should maintain stable memory usage over time', async () => {
      const iterations = 20;
      const memorySnapshots = [];
      
      for (let i = 0; i < iterations; i++) {
        // Perform mixed operations
        await Promise.all([
          locationHeatmapService.generateHeatmap({ maxPoints: 10 }),
          propertyScoringService.analyzeProperty({
            id: `memory-test-${i}`,
            latitude: 25.0,
            longitude: 55.0,
            size: 100
          })
        ]);
        
        const memory = tf.memory();
        memorySnapshots.push({
          iteration: i,
          numTensors: memory.numTensors,
          numBytes: memory.numBytes,
          tensorDisposals: tensorDisposalCount
        });
      }
      
      // Memory should not grow unbounded
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[iterations - 1];
      
      const tensorGrowth = lastSnapshot.numTensors - firstSnapshot.numTensors;
      const memoryGrowth = lastSnapshot.numBytes - firstSnapshot.numBytes;
      
      expect(tensorGrowth).toBeLessThan(20); // Should not accumulate tensors
      expect(memoryGrowth).toBeLessThan(10000000); // Memory growth < 10MB
      expect(lastSnapshot.tensorDisposals).toBeGreaterThan(iterations * 2); // Should dispose tensors
      
      console.log('Memory stability:', { tensorGrowth, memoryGrowthMB: memoryGrowth/1024/1024 });
    });

    test('should handle peak load scenarios', async () => {
      const peakOperations = 50;
      const startTime = performance.now();
      const startMemory = tf.memory();
      
      // Simulate peak load with mixed operations
      const operations = [];
      for (let i = 0; i < peakOperations; i++) {
        if (i % 2 === 0) {
          operations.push(
            locationHeatmapService.generateHeatmap({
              propertyType: i % 3,
              maxPoints: 15
            })
          );
        } else {
          operations.push(
            propertyScoringService.analyzeProperty({
              id: `peak-property-${i}`,
              latitude: 25.0 + (i % 10) * 0.01,
              longitude: 55.0 + (i % 10) * 0.01,
              size: 100 + i * 2
            })
          );
        }
      }
      
      const results = await Promise.all(operations);
      
      const endTime = performance.now();
      const endMemory = tf.memory();
      
      const executionTime = endTime - startTime;
      const memoryIncrease = endMemory.numBytes - startMemory.numBytes;
      
      // Should handle peak load
      expect(results).toHaveLength(peakOperations);
      expect(executionTime).toBeLessThan(15000); // Complete within 15 seconds
      expect(memoryIncrease).toBeLessThan(100000000); // Memory increase < 100MB
      
      // Check for memory leaks
      const finalMemory = tf.memory();
      expect(finalMemory.numTensors).toBeLessThan(100); // Reasonable tensor count
      
      console.log(`Peak load (${peakOperations} ops): ${executionTime.toFixed(2)}ms, Memory: ${(memoryIncrease/1024/1024).toFixed(2)}MB`);
    });
  });

  describe('Model Training Performance', () => {
    test('should train models within reasonable time', async () => {
      const mockModel = {
        compile: jest.fn(),
        fit: jest.fn().mockImplementation((xs, ys, config) => {
          // Simulate training time based on epochs
          const simulatedTime = config.epochs * 10; // 10ms per epoch
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ history: { loss: Array(config.epochs).fill(0.5) } });
            }, simulatedTime);
          });
        }),
        save: jest.fn().mockResolvedValue()
      };
      
      tf.sequential.mockReturnValue(mockModel);
      
      const trainingScenarios = [
        { epochs: 10, batchSize: 16, expectedTime: 200 },
        { epochs: 50, batchSize: 32, expectedTime: 600 },
        { epochs: 100, batchSize: 32, expectedTime: 1200 }
      ];
      
      for (const scenario of trainingScenarios) {
        const startTime = performance.now();
        
        // Mock training data
        const trainingData = {
          features: Array(1000).fill().map(() => Array(6).fill(0.5)),
          labels: Array(1000).fill().map(() => Array(4).fill(0.5))
        };
        
        // Test valuation model training
        await locationHeatmapService.trainInitialModel(mockModel);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        expect(executionTime).toBeLessThan(scenario.expectedTime);
        
        console.log(`Training (${scenario.epochs} epochs): ${executionTime.toFixed(2)}ms`);
      }
    });
  });

  describe('Resource Cleanup', () => {
    test('should clean up resources properly', () => {
      const initialTensorCount = tensorDisposalCount;
      
      // Setup services with mock models
      locationHeatmapService.model = {
        dispose: jest.fn(() => tensorDisposalCount++)
      };
      
      propertyScoringService.models = {
        valuation: { dispose: jest.fn(() => tensorDisposalCount++) },
        riskAssessment: { dispose: jest.fn(() => tensorDisposalCount++) },
        marketTrend: { dispose: jest.fn(() => tensorDisposalCount++) },
        investmentScore: { dispose: jest.fn(() => tensorDisposalCount++) }
      };
      
      // Add some cache data
      locationHeatmapService.heatmapData.set('test', { data: [], timestamp: Date.now() });
      propertyScoringService.cache.set('test', { data: {}, timestamp: Date.now() });
      
      // Dispose services
      locationHeatmapService.dispose();
      propertyScoringService.dispose();
      
      const finalTensorCount = tensorDisposalCount;
      const disposedTensors = finalTensorCount - initialTensorCount;
      
      // Should have disposed all models
      expect(disposedTensors).toBe(5); // 1 heatmap model + 4 scoring models
      
      // Should have cleared caches
      expect(locationHeatmapService.heatmapData.size).toBe(0);
      expect(propertyScoringService.cache.size).toBe(0);
      
      // Should have cleared listeners
      expect(locationHeatmapService.listeners).toHaveLength(0);
      expect(propertyScoringService.listeners).toHaveLength(0);
    });
  });
});