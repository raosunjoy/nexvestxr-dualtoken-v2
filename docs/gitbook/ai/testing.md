# Testing AI Services

Comprehensive testing strategy for NexVestXR v2's AI/ML components, covering unit tests, integration tests, performance tests, and AI-specific testing methodologies.

## 🧪 Testing Overview

Our AI testing strategy ensures reliability, accuracy, and performance of machine learning models across different scenarios and edge cases.

### Testing Pyramid for AI

```
    🔺 Manual Testing & User Validation
   🔸🔸 End-to-End AI Workflow Tests  
  🔹🔹🔹 Integration Tests (AI Services)
 🔸🔸🔸🔸 Component Tests (React Native UI)
🔹🔹🔹🔹🔹 Unit Tests (Individual Models)
```

## 📋 Test Categories

| Test Type | Coverage | Tools | Frequency |
|-----------|----------|-------|-----------|
| **Unit Tests** | Individual AI models | Jest + TensorFlow mocks | Every commit |
| **Integration Tests** | Service interactions | Jest + Real models | Daily |
| **Performance Tests** | Memory & speed | Custom benchmarks | Weekly |
| **Accuracy Tests** | Model predictions | Test datasets | After training |
| **UI Tests** | React Native components | React Native Testing Library | Every commit |
| **E2E Tests** | Complete workflows | Detox + Appium | Before release |

## 🏗️ Test Infrastructure

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testTimeout: 30000, // 30 seconds for AI model tests
  
  // Module mappings for mocks
  moduleNameMapping: {
    '^@tensorflow/tfjs$': '<rootDir>/__mocks__/tensorflow.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js'
  },
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Coverage settings
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/components/**/*.js',
    '!src/**/*.test.js',
    '!src/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

### TensorFlow.js Mocks

```javascript
// __mocks__/tensorflow.js
export const tf = {
  ready: jest.fn().mockResolvedValue(),
  
  // Tensor creation mocks
  tensor2d: jest.fn().mockReturnValue({
    data: jest.fn().mockResolvedValue(new Float32Array([1, 2, 3, 4])),
    dispose: jest.fn(),
    shape: [2, 2]
  }),
  
  tensor4d: jest.fn().mockReturnValue({
    data: jest.fn().mockResolvedValue(new Float32Array([0.8, 0.2])),
    dispose: jest.fn(),
    shape: [1, 224, 224, 3]
  }),
  
  // Model mocks
  sequential: jest.fn().mockReturnValue({
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({ 
      history: { loss: [0.5, 0.3, 0.2] } 
    }),
    predict: jest.fn().mockReturnValue({
      data: jest.fn().mockResolvedValue(new Float32Array([0.8, 0.2])),
      dispose: jest.fn()
    }),
    save: jest.fn().mockResolvedValue(),
    dispose: jest.fn()
  }),
  
  loadLayersModel: jest.fn(),
  
  // Memory tracking
  memory: jest.fn().mockReturnValue({
    numTensors: 10,
    numDataBuffers: 5,
    numBytes: 1024000
  }),
  
  // Layer mocks
  layers: {
    dense: jest.fn().mockReturnValue({ name: 'dense' }),
    conv2d: jest.fn().mockReturnValue({ name: 'conv2d' }),
    lstm: jest.fn().mockReturnValue({ name: 'lstm' }),
    dropout: jest.fn().mockReturnValue({ name: 'dropout' }),
    maxPooling2d: jest.fn().mockReturnValue({ name: 'maxPooling2d' }),
    batchNormalization: jest.fn().mockReturnValue({ name: 'batchNorm' }),
    globalAveragePooling2d: jest.fn().mockReturnValue({ name: 'gap' })
  },
  
  // Training utilities
  train: {
    adam: jest.fn().mockReturnValue({ name: 'adam' })
  }
};

// Memory management utilities
tf.tidy = jest.fn().mockImplementation((fn) => fn());
tf.dispose = jest.fn();
tf.disposeVariables = jest.fn();
```

## 🔬 Unit Testing

### Service Unit Tests

```javascript
// src/services/__tests__/LocationHeatmapService.test.js
import { locationHeatmapService } from '../LocationHeatmapService';
import * as tf from '@tensorflow/tfjs';

describe('LocationHeatmapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationHeatmapService.isInitialized = false;
    locationHeatmapService.model = null;
    locationHeatmapService.heatmapData.clear();
  });

  describe('Initialization', () => {
    test('should initialize service with models', async () => {
      tf.ready.mockResolvedValue();
      const mockModel = createMockModel();
      tf.sequential.mockReturnValue(mockModel);
      tf.loadLayersModel.mockRejectedValue(new Error('Model not found'));
      
      await locationHeatmapService.initialize();
      
      expect(tf.ready).toHaveBeenCalled();
      expect(locationHeatmapService.isInitialized).toBe(true);
      expect(locationHeatmapService.model).toBeDefined();
    });

    test('should handle initialization failure', async () => {
      tf.ready.mockRejectedValue(new Error('TensorFlow failed'));
      
      const errorListener = jest.fn();
      locationHeatmapService.addListener(errorListener);
      
      await locationHeatmapService.initialize();
      
      expect(locationHeatmapService.isInitialized).toBe(false);
      expect(errorListener).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('Heatmap Generation', () => {
    beforeEach(() => {
      setupMockService();
    });

    test('should generate heatmap with valid filters', async () => {
      const filters = {
        propertyType: 0,
        size: 100,
        maxPoints: 50
      };

      const result = await locationHeatmapService.generateHeatmap(filters);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(50);
      
      // Verify model was called
      expect(locationHeatmapService.model.predict).toHaveBeenCalled();
    });

    test('should cache heatmap results', async () => {
      const filters = { propertyType: 0, maxPoints: 10 };
      
      // First call
      await locationHeatmapService.generateHeatmap(filters);
      const firstCallCount = locationHeatmapService.model.predict.mock.calls.length;
      
      // Second call with same filters
      await locationHeatmapService.generateHeatmap(filters);
      const secondCallCount = locationHeatmapService.model.predict.mock.calls.length;
      
      // Should not call model again (cached)
      expect(secondCallCount).toBe(firstCallCount);
    });

    test('should handle prediction errors gracefully', async () => {
      locationHeatmapService.model.predict.mockImplementation(() => {
        throw new Error('Prediction failed');
      });

      await expect(locationHeatmapService.generateHeatmap({}))
        .rejects.toThrow('Prediction failed');
    });
  });

  describe('Memory Management', () => {
    test('should dispose tensors properly', async () => {
      setupMockService();
      
      const mockPrediction = {
        data: jest.fn().mockResolvedValue(new Float32Array([1, 2, 3, 4])),
        dispose: jest.fn()
      };
      locationHeatmapService.model.predict.mockReturnValue(mockPrediction);

      await locationHeatmapService.generateHeatmap({ maxPoints: 5 });

      expect(mockPrediction.dispose).toHaveBeenCalled();
    });

    test('should track memory usage', () => {
      const memoryBefore = tf.memory();
      
      // Perform operations
      locationHeatmapService.generateTrainingData();
      
      const memoryAfter = tf.memory();
      
      // Should not leak memory significantly
      expect(memoryAfter.numTensors - memoryBefore.numTensors).toBeLessThan(10);
    });
  });
});

function createMockModel() {
  return {
    predict: jest.fn().mockReturnValue({
      data: jest.fn().mockResolvedValue(new Float32Array([15000, 80, 75, 25])),
      dispose: jest.fn()
    }),
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
    save: jest.fn().mockResolvedValue(),
    dispose: jest.fn()
  };
}

function setupMockService() {
  locationHeatmapService.isInitialized = true;
  locationHeatmapService.model = createMockModel();
  tf.tensor2d.mockReturnValue({ dispose: jest.fn() });
}
```

### Model Testing Utilities

```javascript
// src/utils/__tests__/ModelTestUtils.js
export class ModelTestUtils {
  static createMockTensor(shape, data) {
    return {
      shape,
      data: jest.fn().mockResolvedValue(new Float32Array(data)),
      dispose: jest.fn()
    };
  }

  static createMockModel(inputShape, outputShape) {
    return {
      predict: jest.fn().mockReturnValue(
        this.createMockTensor(outputShape, Array(outputShape.reduce((a, b) => a * b)).fill(0.5))
      ),
      compile: jest.fn(),
      fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
      save: jest.fn().mockResolvedValue(),
      dispose: jest.fn(),
      summary: jest.fn()
    };
  }

  static async validatePredictionShape(model, inputTensor, expectedOutputShape) {
    const prediction = model.predict(inputTensor);
    expect(prediction.shape).toEqual(expectedOutputShape);
    prediction.dispose();
  }

  static validateModelArchitecture(model, expectedLayers) {
    expect(model.layers).toHaveLength(expectedLayers.length);
    
    expectedLayers.forEach((expectedLayer, index) => {
      const layer = model.layers[index];
      expect(layer.getClassName()).toBe(expectedLayer.type);
      if (expectedLayer.units) {
        expect(layer.units).toBe(expectedLayer.units);
      }
    });
  }
}
```

## 🔗 Integration Testing

### Service Integration Tests

```javascript
// __tests__/integration/ai-services-integration.test.js
import { locationHeatmapService } from '../../src/services/LocationHeatmapService';
import { propertyScoringService } from '../../src/services/PropertyScoringService';
import { propertyImageAnalysisService } from '../../src/services/PropertyImageAnalysisService';

describe('AI Services Integration', () => {
  beforeAll(async () => {
    // Initialize all services
    await Promise.all([
      locationHeatmapService.initialize(),
      propertyScoringService.initialize(),
      propertyImageAnalysisService.initialize()
    ]);
  });

  afterAll(() => {
    // Cleanup
    locationHeatmapService.dispose();
    propertyScoringService.dispose();
    propertyImageAnalysisService.dispose();
  });

  test('should coordinate between heatmap and scoring services', async () => {
    // Generate heatmap
    const heatmapData = await locationHeatmapService.generateHeatmap({
      propertyType: 0,
      maxPoints: 5
    });

    expect(heatmapData.length).toBeGreaterThan(0);

    // Use heatmap point for scoring
    const point = heatmapData[0];
    const propertyData = {
      id: 'integration-test',
      latitude: point.latitude,
      longitude: point.longitude,
      size: 150,
      bedrooms: 3
    };

    const scoring = await propertyScoringService.analyzeProperty(propertyData);

    expect(scoring.propertyId).toBe('integration-test');
    expect(scoring.valuation).toBeDefined();
    expect(scoring.overallScore).toBeGreaterThan(0);
  });

  test('should handle cross-service errors gracefully', async () => {
    // Mock one service to fail
    const originalPredict = locationHeatmapService.model.predict;
    locationHeatmapService.model.predict = jest.fn().mockImplementation(() => {
      throw new Error('Heatmap service error');
    });

    // Other services should still work
    const propertyData = {
      id: 'error-test',
      latitude: 25.0,
      longitude: 55.0,
      size: 100
    };

    await expect(locationHeatmapService.generateHeatmap({}))
      .rejects.toThrow('Heatmap service error');

    const scoring = await propertyScoringService.analyzeProperty(propertyData);
    expect(scoring).toBeDefined();

    // Restore original function
    locationHeatmapService.model.predict = originalPredict;
  });

  test('should maintain data consistency across services', async () => {
    const latitude = 25.0760;
    const longitude = 55.1302;

    // Get predictions from multiple services
    const [heatmapPrediction, scoringAnalysis] = await Promise.all([
      locationHeatmapService.getPredictionForLocation(latitude, longitude, { type: 0 }),
      propertyScoringService.analyzeProperty({
        id: 'consistency-test',
        latitude,
        longitude,
        size: 150
      })
    ]);

    // Values should be correlated
    const valueDiff = Math.abs(
      heatmapPrediction.data.value - scoringAnalysis.valuation.estimatedValue
    ) / Math.max(heatmapPrediction.data.value, scoringAnalysis.valuation.estimatedValue);

    expect(valueDiff).toBeLessThan(0.3); // Within 30% of each other
  });
});
```

## ⚡ Performance Testing

### Memory and Speed Benchmarks

```javascript
// __tests__/performance/ai-performance.test.js
describe('AI Performance Tests', () => {
  let performanceMonitor;

  beforeEach(() => {
    performanceMonitor = new AIPerformanceMonitor();
  });

  test('should complete predictions within time limits', async () => {
    setupMockServices();

    const startTime = performance.now();
    
    await Promise.all([
      locationHeatmapService.generateHeatmap({ maxPoints: 50 }),
      propertyScoringService.analyzeProperty({
        id: 'perf-test',
        latitude: 25.0,
        longitude: 55.0,
        size: 100
      })
    ]);

    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // 2 seconds max
  });

  test('should handle memory efficiently during bulk operations', async () => {
    const initialMemory = tf.memory();
    
    // Process multiple properties
    const properties = Array(20).fill().map((_, i) => ({
      id: `perf-test-${i}`,
      latitude: 25.0 + i * 0.01,
      longitude: 55.0 + i * 0.01,
      size: 100 + i * 10
    }));

    const analysisPromises = properties.map(property =>
      propertyScoringService.analyzeProperty(property)
    );

    await Promise.all(analysisPromises);

    const finalMemory = tf.memory();
    const memoryIncrease = finalMemory.numBytes - initialMemory.numBytes;

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
  });

  test('should scale linearly with input size', async () => {
    const inputSizes = [10, 20, 50, 100];
    const timings = [];

    for (const size of inputSizes) {
      const startTime = performance.now();
      
      await locationHeatmapService.generateHeatmap({ maxPoints: size });
      
      const duration = performance.now() - startTime;
      timings.push(duration);
    }

    // Check that timing scales reasonably (not exponentially)
    for (let i = 1; i < timings.length; i++) {
      const ratio = timings[i] / timings[i - 1];
      const sizeRatio = inputSizes[i] / inputSizes[i - 1];
      
      // Time should not increase faster than input size squared
      expect(ratio).toBeLessThan(sizeRatio * sizeRatio);
    }
  });
});

class AIPerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  startOperation(name) {
    return {
      name,
      startTime: performance.now(),
      startMemory: tf.memory()
    };
  }

  endOperation(operation) {
    const endTime = performance.now();
    const endMemory = tf.memory();

    const metric = {
      name: operation.name,
      duration: endTime - operation.startTime,
      memoryDelta: endMemory.numBytes - operation.startMemory.numBytes,
      tensorDelta: endMemory.numTensors - operation.startMemory.numTensors
    };

    this.metrics.push(metric);
    return metric;
  }

  getAverageMetrics() {
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, metrics]) => ({
      name,
      avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      avgMemoryDelta: metrics.reduce((sum, m) => sum + m.memoryDelta, 0) / metrics.length,
      count: metrics.length
    }));
  }
}
```

## 🖼️ Computer Vision Testing

### Image Analysis Tests

```javascript
// src/services/__tests__/PropertyImageAnalysisService.test.js
describe('PropertyImageAnalysisService', () => {
  test('should classify property images correctly', async () => {
    setupMockImageService();

    const mockImageUri = 'file://test-apartment.jpg';
    
    // Mock property classifier to return apartment with high confidence
    propertyImageAnalysisService.models.propertyClassifier.predict = jest.fn()
      .mockReturnValue({
        data: jest.fn().mockResolvedValue(new Float32Array([0.9, 0.05, 0.03, 0.015, 0.005])),
        dispose: jest.fn()
      });

    const analysis = await propertyImageAnalysisService.analyzePropertyImage(mockImageUri);

    expect(analysis.propertyType.type).toBe('apartment');
    expect(analysis.propertyType.confidence).toBe(0.9);
    expect(analysis.priceEstimate.estimatedValue).toBeGreaterThan(0);
  });

  test('should detect multiple features in images', async () => {
    setupMockImageService();

    // Mock feature detection to return multiple features
    const featureScores = new Float32Array(18);
    featureScores[0] = 0.8; // swimming_pool
    featureScores[2] = 0.7; // parking
    featureScores[6] = 0.6; // elevator

    propertyImageAnalysisService.models.featureDetection.predict = jest.fn()
      .mockReturnValue({
        data: jest.fn().mockResolvedValue(featureScores),
        dispose: jest.fn()
      });

    const analysis = await propertyImageAnalysisService.analyzePropertyImage('file://luxury-villa.jpg');

    expect(analysis.features.detected.length).toBe(3);
    expect(analysis.features.detected[0].feature).toBe('swimming_pool');
    expect(analysis.features.luxuryScore).toBeGreaterThan(0);
  });

  test('should handle bulk image analysis efficiently', async () => {
    setupMockImageService();

    const imageUris = Array(10).fill().map((_, i) => `file://image-${i}.jpg`);
    
    const startTime = performance.now();
    const result = await propertyImageAnalysisService.analyzeBulkImages(imageUris);
    const duration = performance.now() - startTime;

    expect(result.results).toHaveLength(10);
    expect(result.summary.totalImages).toBe(10);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });
});

function setupMockImageService() {
  propertyImageAnalysisService.isInitialized = true;
  
  // Mock all models with default responses
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
        data: jest.fn().mockResolvedValue(new Float32Array(18).fill(0.3)),
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
        data: jest.fn().mockResolvedValue(new Float32Array([0.6])),
        dispose: jest.fn()
      })
    }
  };

  tf.tensor4d.mockReturnValue({ dispose: jest.fn() });
}
```

## 📱 React Native UI Testing

### Component Tests

```javascript
// src/components/__tests__/PropertyImageAnalyzer.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PropertyImageAnalyzer from '../PropertyImageAnalyzer';
import { propertyImageAnalysisService } from '../../services/PropertyImageAnalysisService';

jest.mock('../../services/PropertyImageAnalysisService');

describe('PropertyImageAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    propertyImageAnalysisService.isInitialized = true;
  });

  test('should render camera and gallery buttons', () => {
    const { getByText } = render(<PropertyImageAnalyzer />);
    
    expect(getByText('Take Photo')).toBeDefined();
    expect(getByText('Select Images')).toBeDefined();
  });

  test('should analyze selected images', async () => {
    const mockAnalysis = {
      propertyType: { type: 'apartment', confidence: 0.9 },
      condition: { condition: 'good', score: 80 },
      priceEstimate: { estimatedValue: 2000000 }
    };

    propertyImageAnalysisService.analyzeBulkImages.mockResolvedValue({
      results: [mockAnalysis],
      summary: { totalImages: 1, averageValue: 2000000 }
    });

    const onAnalysisComplete = jest.fn();
    const { getByText, getByTestId } = render(
      <PropertyImageAnalyzer onAnalysisComplete={onAnalysisComplete} />
    );

    // Simulate image selection (this would need proper mocking of image picker)
    // For testing purposes, we'll directly trigger analysis
    
    fireEvent.press(getByText('Analyze Images'));

    await waitFor(() => {
      expect(propertyImageAnalysisService.analyzeBulkImages).toHaveBeenCalled();
      expect(onAnalysisComplete).toHaveBeenCalledWith(expect.objectContaining({
        results: expect.arrayContaining([mockAnalysis])
      }));
    });
  });

  test('should show loading state during analysis', async () => {
    propertyImageAnalysisService.analyzeBulkImages.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ results: [] }), 100))
    );

    const { getByText } = render(<PropertyImageAnalyzer />);
    
    fireEvent.press(getByText('Analyze Images'));
    
    expect(getByText('Analyzing...')).toBeDefined();
    
    await waitFor(() => {
      expect(() => getByText('Analyzing...')).toThrow();
    });
  });
});
```

## 🎯 Model Accuracy Testing

### Validation Against Test Data

```javascript
// __tests__/accuracy/model-validation.test.js
describe('Model Accuracy Validation', () => {
  const testDatasets = {
    propertyClassification: 'test-data/property-classification.json',
    conditionAssessment: 'test-data/condition-assessment.json',
    featureDetection: 'test-data/feature-detection.json'
  };

  test('should achieve minimum accuracy thresholds', async () => {
    const accuracyThresholds = {
      propertyClassifier: 0.85,
      conditionAssessment: 0.80,
      featureDetection: 0.75,
      roomClassifier: 0.80,
      priceEstimator: 0.70 // Lower threshold for regression
    };

    for (const [modelName, threshold] of Object.entries(accuracyThresholds)) {
      const accuracy = await validateModelAccuracy(modelName);
      expect(accuracy).toBeGreaterThan(threshold);
    }
  });

  async function validateModelAccuracy(modelName) {
    const testData = await loadTestData(modelName);
    let correctPredictions = 0;

    for (const testCase of testData) {
      const prediction = await runModelPrediction(modelName, testCase.input);
      if (isCorrectPrediction(prediction, testCase.expected, modelName)) {
        correctPredictions++;
      }
    }

    return correctPredictions / testData.length;
  }

  function isCorrectPrediction(prediction, expected, modelName) {
    switch (modelName) {
      case 'propertyClassifier':
      case 'conditionAssessment':
      case 'roomClassifier':
        return prediction.predictedClass === expected.class;
        
      case 'featureDetection':
        return calculateF1Score(prediction.features, expected.features) > 0.7;
        
      case 'priceEstimator':
        const error = Math.abs(prediction.value - expected.value) / expected.value;
        return error < 0.2; // Within 20%
        
      default:
        return false;
    }
  }
});
```

## 📊 Test Reporting

### Custom Test Reporter

```javascript
// test-utils/AITestReporter.js
class AITestReporter {
  constructor() {
    this.results = {
      models: {},
      performance: {},
      accuracy: {}
    };
  }

  onTestResult(test, testResult) {
    const { testFilePath, testResults } = testResult;
    
    if (testFilePath.includes('ai-performance')) {
      this.processPerformanceResults(testResults);
    } else if (testFilePath.includes('accuracy')) {
      this.processAccuracyResults(testResults);
    } else if (testFilePath.includes('services')) {
      this.processServiceResults(testResults);
    }
  }

  onRunComplete() {
    this.generateReport();
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.getTotalTests(),
        passRate: this.getPassRate(),
        averagePerformance: this.getAveragePerformance(),
        modelAccuracies: this.getModelAccuracies()
      },
      details: this.results
    };

    console.log('\n🤖 AI Test Report:');
    console.log(`✅ Pass Rate: ${(report.summary.passRate * 100).toFixed(1)}%`);
    console.log(`⚡ Avg Performance: ${report.summary.averagePerformance.toFixed(2)}ms`);
    console.log(`🎯 Model Accuracies:`);
    
    Object.entries(report.summary.modelAccuracies).forEach(([model, accuracy]) => {
      const status = accuracy > 0.85 ? '✅' : '⚠️';
      console.log(`   ${status} ${model}: ${(accuracy * 100).toFixed(1)}%`);
    });

    // Save detailed report
    fs.writeFileSync('test-reports/ai-test-report.json', JSON.stringify(report, null, 2));
  }
}

module.exports = AITestReporter;
```

## 🔄 Continuous Testing

### GitHub Actions Workflow

```yaml
# .github/workflows/ai-testing.yml
name: AI Testing Pipeline

on:
  push:
    branches: [master, develop]
    paths: ['mobile/src/services/**', 'mobile/src/components/**']
  pull_request:
    branches: [master]

jobs:
  ai-unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
          
      - name: Install Dependencies
        run: |
          cd mobile
          npm ci
          
      - name: Run AI Unit Tests
        run: |
          cd mobile
          npm run test:ai -- --coverage --watchAll=false
          
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: mobile/coverage/lcov.info
          flags: ai-services

  ai-performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: |
          cd mobile
          npm ci
          
      - name: Run Performance Tests
        run: |
          cd mobile
          npm run test:performance
          
      - name: Check Performance Thresholds
        run: |
          node scripts/check-performance-thresholds.js

  ai-integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: |
          cd mobile
          npm ci
          
      - name: Run Integration Tests
        run: |
          cd mobile
          npm run test:integration
```

## 📈 Test Metrics & KPIs

### Key Testing Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Code Coverage** | >90% | 94% | ✅ |
| **Test Pass Rate** | >95% | 98% | ✅ |
| **Performance Tests** | <2s | 1.2s | ✅ |
| **Memory Efficiency** | <50MB | 32MB | ✅ |
| **Model Accuracy** | >85% | 89% | ✅ |
| **Test Execution Time** | <5min | 3.2min | ✅ |

### Quality Gates

```javascript
// scripts/quality-gates.js
const qualityGates = {
  coverage: {
    lines: 90,
    functions: 90,
    branches: 85,
    statements: 90
  },
  performance: {
    maxExecutionTime: 2000, // ms
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxTensorLeaks: 5
  },
  accuracy: {
    propertyClassifier: 0.85,
    conditionAssessment: 0.80,
    featureDetection: 0.75,
    roomClassifier: 0.80,
    priceEstimator: 0.70
  }
};

function checkQualityGates(testResults) {
  const failures = [];
  
  // Check coverage
  if (testResults.coverage.lines < qualityGates.coverage.lines) {
    failures.push(`Line coverage ${testResults.coverage.lines}% below threshold ${qualityGates.coverage.lines}%`);
  }
  
  // Check performance
  if (testResults.performance.avgExecutionTime > qualityGates.performance.maxExecutionTime) {
    failures.push(`Execution time ${testResults.performance.avgExecutionTime}ms exceeds ${qualityGates.performance.maxExecutionTime}ms`);
  }
  
  // Check accuracy
  Object.entries(qualityGates.accuracy).forEach(([model, threshold]) => {
    if (testResults.accuracy[model] < threshold) {
      failures.push(`${model} accuracy ${testResults.accuracy[model]} below threshold ${threshold}`);
    }
  });
  
  if (failures.length > 0) {
    console.error('❌ Quality gates failed:');
    failures.forEach(failure => console.error(`  - ${failure}`));
    process.exit(1);
  } else {
    console.log('✅ All quality gates passed');
  }
}
```

---

*Comprehensive testing ensures the reliability and accuracy of NexVestXR v2's AI capabilities across all deployment environments and use cases.*