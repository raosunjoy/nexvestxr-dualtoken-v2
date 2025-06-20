# TensorFlow.js Integration

This guide covers the integration of TensorFlow.js into NexVestXR v2 for advanced AI capabilities in the React Native mobile application.

## 📋 Overview

TensorFlow.js enables us to run machine learning models directly in React Native, providing:
- **Client-side AI processing** without server dependencies
- **Real-time predictions** with minimal latency
- **Privacy-first approach** - data never leaves the device
- **Offline capability** for AI features

## 🛠️ Installation & Setup

### Dependencies

```json
{
  "@tensorflow/tfjs": "^4.12.0",
  "@tensorflow/tfjs-react-native": "^0.8.0",
  "@tensorflow/tfjs-platform-react-native": "^0.2.2"
}
```

### Platform Configuration

```javascript
// Platform setup for React Native
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-platform-react-native';

// Initialize TensorFlow.js
import * as tf from '@tensorflow/tfjs';

// Configure for React Native
tf.ready().then(() => {
  console.log('TensorFlow.js is ready!');
});
```

### Metro Configuration

```javascript
// metro.config.js
module.exports = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'tflite'],
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx']
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
```

## 🏗️ Service Architecture

### Base AI Service Structure

```javascript
class BaseAIService {
  constructor() {
    this.isInitialized = false;
    this.models = {};
    this.cache = new Map();
    this.listeners = [];
  }

  async initialize() {
    try {
      await tf.ready();
      await this.loadModels();
      this.isInitialized = true;
      this.notifyListeners('initialized', { success: true });
    } catch (error) {
      this.notifyListeners('error', { error: error.message });
      throw error;
    }
  }

  async loadModels() {
    // Abstract method - implemented by subclasses
  }

  dispose() {
    Object.values(this.models).forEach(model => {
      if (model) model.dispose();
    });
    this.cache.clear();
    this.listeners = [];
  }
}
```

### Model Loading Strategies

#### 1. Local Storage Loading
```javascript
async loadModelFromStorage(modelName) {
  try {
    const model = await tf.loadLayersModel(`localstorage://${modelName}`);
    console.log(`Loaded ${modelName} from local storage`);
    return model;
  } catch (error) {
    console.log(`${modelName} not found locally, will create new`);
    return null;
  }
}
```

#### 2. Remote Model Loading
```javascript
async loadModelFromRemote(modelUrl) {
  try {
    const model = await tf.loadLayersModel(modelUrl);
    console.log(`Loaded model from ${modelUrl}`);
    return model;
  } catch (error) {
    console.error(`Failed to load model from ${modelUrl}:`, error);
    throw error;
  }
}
```

#### 3. Bundle Asset Loading
```javascript
async loadModelFromBundle(bundlePath) {
  try {
    const model = await tf.loadLayersModel(bundlePath);
    console.log(`Loaded model from bundle: ${bundlePath}`);
    return model;
  } catch (error) {
    console.error(`Failed to load bundled model:`, error);
    throw error;
  }
}
```

## 🧠 Model Creation Patterns

### Convolutional Neural Networks (CNN)

```javascript
createCNNModel(inputShape, numClasses) {
  const model = tf.sequential({
    layers: [
      // Convolutional layers
      tf.layers.conv2d({
        inputShape: inputShape,
        filters: 32,
        kernelSize: 3,
        activation: 'relu',
        name: 'conv1'
      }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.batchNormalization(),
      
      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu',
        name: 'conv2'
      }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.batchNormalization(),
      
      // Global pooling and dense layers
      tf.layers.globalAveragePooling2d(),
      tf.layers.dense({
        units: 128,
        activation: 'relu',
        name: 'dense1'
      }),
      tf.layers.dropout({ rate: 0.5 }),
      tf.layers.dense({
        units: numClasses,
        activation: 'softmax',
        name: 'output'
      })
    ]
  });

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}
```

### Recurrent Networks (LSTM)

```javascript
createLSTMModel(sequenceLength, features, outputSize) {
  const model = tf.sequential({
    layers: [
      tf.layers.lstm({
        inputShape: [sequenceLength, features],
        units: 64,
        returnSequences: true,
        name: 'lstm1'
      }),
      tf.layers.dropout({ rate: 0.2 }),
      
      tf.layers.lstm({
        units: 32,
        returnSequences: false,
        name: 'lstm2'
      }),
      tf.layers.dropout({ rate: 0.2 }),
      
      tf.layers.dense({
        units: outputSize,
        activation: 'linear',
        name: 'output'
      })
    ]
  });

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}
```

### Multi-Layer Perceptron (MLP)

```javascript
createMLPModel(inputSize, hiddenLayers, outputSize, outputActivation) {
  const layers = [
    tf.layers.dense({
      inputShape: [inputSize],
      units: hiddenLayers[0],
      activation: 'relu',
      name: 'input_dense'
    })
  ];

  // Add hidden layers
  hiddenLayers.slice(1).forEach((units, index) => {
    layers.push(
      tf.layers.dense({
        units: units,
        activation: 'relu',
        name: `hidden_${index + 1}`
      })
    );
    layers.push(tf.layers.dropout({ rate: 0.3 }));
  });

  // Output layer
  layers.push(
    tf.layers.dense({
      units: outputSize,
      activation: outputActivation,
      name: 'output'
    })
  );

  const model = tf.sequential({ layers });

  return model;
}
```

## 🔄 Data Processing Pipeline

### Input Preprocessing

```javascript
preprocessImageData(imageData, targetSize = [224, 224]) {
  return tf.tidy(() => {
    // Convert to tensor
    let tensor = tf.browser.fromPixels(imageData);
    
    // Resize if needed
    if (tensor.shape[0] !== targetSize[0] || tensor.shape[1] !== targetSize[1]) {
      tensor = tf.image.resizeBilinear(tensor, targetSize);
    }
    
    // Normalize to [0, 1]
    tensor = tensor.div(255.0);
    
    // Add batch dimension
    tensor = tensor.expandDims(0);
    
    return tensor;
  });
}

preprocessNumericalData(data, scaleFactors) {
  return tf.tidy(() => {
    let tensor = tf.tensor2d([data]);
    
    // Apply scaling
    if (scaleFactors) {
      const scales = tf.tensor2d([scaleFactors]);
      tensor = tensor.mul(scales);
    }
    
    return tensor;
  });
}
```

### Output Processing

```javascript
processClassificationOutput(prediction, classNames) {
  return tf.tidy(() => {
    const probabilities = prediction.dataSync();
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    
    return {
      predictedClass: classNames[maxIndex],
      confidence: probabilities[maxIndex],
      probabilities: classNames.reduce((acc, name, index) => {
        acc[name] = probabilities[index];
        return acc;
      }, {})
    };
  });
}

processRegressionOutput(prediction, denormalizeFunc) {
  return tf.tidy(() => {
    const value = prediction.dataSync()[0];
    
    return {
      value: denormalizeFunc ? denormalizeFunc(value) : value,
      confidence: Math.min(1.0, Math.max(0.0, 1.0 - Math.abs(value - 0.5) * 2))
    };
  });
}
```

## 💾 Model Persistence

### Saving Models

```javascript
async saveModel(model, modelName) {
  try {
    const saveResult = await model.save(`localstorage://${modelName}`);
    console.log(`Model ${modelName} saved successfully:`, saveResult);
    return saveResult;
  } catch (error) {
    console.error(`Failed to save model ${modelName}:`, error);
    throw error;
  }
}

async saveAllModels() {
  const savePromises = Object.entries(this.models).map(([name, model]) => {
    if (model) {
      return this.saveModel(model, name);
    }
  });
  
  await Promise.all(savePromises);
  console.log('All models saved successfully');
}
```

### Model Versioning

```javascript
class ModelVersionManager {
  constructor() {
    this.versions = new Map();
  }

  async saveModelWithVersion(model, modelName, version) {
    const versionedName = `${modelName}_v${version}`;
    await model.save(`localstorage://${versionedName}`);
    
    this.versions.set(modelName, version);
    localStorage.setItem('model_versions', JSON.stringify(Object.fromEntries(this.versions)));
  }

  async loadLatestModel(modelName) {
    const versions = JSON.parse(localStorage.getItem('model_versions') || '{}');
    const latestVersion = versions[modelName] || 1;
    
    try {
      const versionedName = `${modelName}_v${latestVersion}`;
      return await tf.loadLayersModel(`localstorage://${versionedName}`);
    } catch (error) {
      console.warn(`Failed to load ${modelName} v${latestVersion}, trying v1`);
      return await tf.loadLayersModel(`localstorage://${modelName}_v1`);
    }
  }
}
```

## 🚀 Performance Optimization

### Memory Management

```javascript
class TensorFlowMemoryManager {
  constructor() {
    this.memorySnapshots = [];
    this.warningThreshold = 100; // MB
  }

  checkMemoryUsage() {
    const memory = tf.memory();
    
    if (memory.numBytes > this.warningThreshold * 1024 * 1024) {
      console.warn('High memory usage detected:', memory);
      this.triggerCleanup();
    }
    
    return memory;
  }

  triggerCleanup() {
    // Force garbage collection
    tf.disposeVariables();
    
    // Clean up any orphaned tensors
    const numTensors = tf.memory().numTensors;
    if (numTensors > 50) {
      console.warn(`${numTensors} tensors still in memory after cleanup`);
    }
  }

  wrapWithMemoryTracking(func) {
    return (...args) => {
      const beforeMemory = tf.memory();
      
      try {
        const result = func.apply(this, args);
        
        // If result is a promise, track memory after resolution
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            this.logMemoryDelta(beforeMemory);
          });
        } else {
          this.logMemoryDelta(beforeMemory);
          return result;
        }
      } catch (error) {
        this.logMemoryDelta(beforeMemory);
        throw error;
      }
    };
  }

  logMemoryDelta(beforeMemory) {
    const afterMemory = tf.memory();
    const byteDelta = afterMemory.numBytes - beforeMemory.numBytes;
    const tensorDelta = afterMemory.numTensors - beforeMemory.numTensors;
    
    if (byteDelta > 1024 * 1024) { // > 1MB
      console.log(`Memory delta: +${(byteDelta / 1024 / 1024).toFixed(2)}MB, +${tensorDelta} tensors`);
    }
  }
}
```

### Batch Processing

```javascript
class BatchProcessor {
  constructor(batchSize = 16) {
    this.batchSize = batchSize;
  }

  async processBatch(items, processingFunc) {
    const results = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      const batchPromises = batch.map(item => processingFunc(item));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }

  async processBatchWithTensors(items, createTensorFunc, modelPredictFunc) {
    const results = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      const batchTensor = tf.tidy(() => {
        const tensors = batch.map(createTensorFunc);
        return tf.stack(tensors);
      });
      
      try {
        const predictions = await modelPredictFunc(batchTensor);
        const batchResults = await this.processPredictions(predictions, batch);
        results.push(...batchResults);
      } finally {
        batchTensor.dispose();
      }
    }
    
    return results;
  }
}
```

## 🧪 Testing Strategy

### Unit Testing with Mocks

```javascript
// __mocks__/@tensorflow/tfjs.js
export const tf = {
  ready: jest.fn().mockResolvedValue(),
  tensor2d: jest.fn().mockReturnValue({
    data: jest.fn().mockResolvedValue(new Float32Array([1, 2, 3, 4])),
    dispose: jest.fn()
  }),
  tensor4d: jest.fn().mockReturnValue({
    data: jest.fn().mockResolvedValue(new Float32Array([0.8, 0.2])),
    dispose: jest.fn()
  }),
  sequential: jest.fn().mockReturnValue({
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({ history: { loss: [0.5] } }),
    predict: jest.fn().mockReturnValue({
      data: jest.fn().mockResolvedValue(new Float32Array([0.8, 0.2])),
      dispose: jest.fn()
    }),
    save: jest.fn().mockResolvedValue(),
    dispose: jest.fn()
  }),
  loadLayersModel: jest.fn(),
  memory: jest.fn().mockReturnValue({
    numTensors: 10,
    numDataBuffers: 5,
    numBytes: 1024000
  }),
  layers: {
    dense: jest.fn().mockReturnValue({ name: 'dense' }),
    conv2d: jest.fn().mockReturnValue({ name: 'conv2d' }),
    lstm: jest.fn().mockReturnValue({ name: 'lstm' }),
    dropout: jest.fn().mockReturnValue({ name: 'dropout' })
  }
};
```

### Integration Testing

```javascript
describe('TensorFlow.js Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize TensorFlow.js successfully', async () => {
    const service = new LocationHeatmapService();
    
    tf.ready.mockResolvedValue();
    tf.loadLayersModel.mockRejectedValue(new Error('Model not found'));
    
    await service.initialize();
    
    expect(tf.ready).toHaveBeenCalled();
    expect(service.isInitialized).toBe(true);
  });

  test('should handle model prediction with proper tensor management', async () => {
    const service = new PropertyScoringService();
    service.isInitialized = true;
    
    const mockPrediction = {
      data: jest.fn().mockResolvedValue(new Float32Array([15000, 0.8])),
      dispose: jest.fn()
    };
    
    service.models.valuation = {
      predict: jest.fn().mockReturnValue(mockPrediction)
    };
    
    const result = await service.getPropertyValuation({
      latitude: 25.0,
      longitude: 55.0,
      size: 100
    });
    
    expect(result.estimatedValue).toBe(15000);
    expect(mockPrediction.dispose).toHaveBeenCalled();
  });
});
```

## 🔧 Debugging & Monitoring

### Debug Utilities

```javascript
class TensorFlowDebugger {
  static enableDebugMode() {
    tf.ENV.set('DEBUG', true);
    
    // Override tensor creation to log
    const originalTensor2d = tf.tensor2d;
    tf.tensor2d = function(...args) {
      console.log('Creating tensor2d:', args[0]?.length || 'unknown shape');
      return originalTensor2d.apply(this, args);
    };
  }

  static logModelSummary(model, modelName) {
    console.log(`\n=== ${modelName} Model Summary ===`);
    console.log(`Layers: ${model.layers.length}`);
    console.log(`Trainable parameters: ${model.countParams()}`);
    
    model.layers.forEach((layer, index) => {
      console.log(`Layer ${index}: ${layer.name} (${layer.getClassName()})`);
    });
  }

  static async validateModelIO(model, sampleInput) {
    console.log('Input shape:', sampleInput.shape);
    
    const prediction = model.predict(sampleInput);
    console.log('Output shape:', prediction.shape);
    
    const outputData = await prediction.data();
    console.log('Output range:', Math.min(...outputData), 'to', Math.max(...outputData));
    
    prediction.dispose();
  }
}
```

### Performance Monitoring

```javascript
class AIPerformanceMonitor {
  constructor() {
    this.metrics = {
      predictions: 0,
      totalTime: 0,
      memoryPeaks: [],
      errors: 0
    };
  }

  startTracking(operationName) {
    return {
      operationName,
      startTime: performance.now(),
      startMemory: tf.memory()
    };
  }

  endTracking(tracker) {
    const endTime = performance.now();
    const endMemory = tf.memory();
    
    const duration = endTime - tracker.startTime;
    const memoryDelta = endMemory.numBytes - tracker.startMemory.numBytes;
    
    this.metrics.predictions++;
    this.metrics.totalTime += duration;
    
    if (memoryDelta > 0) {
      this.metrics.memoryPeaks.push(memoryDelta);
    }
    
    console.log(`${tracker.operationName}: ${duration.toFixed(2)}ms, Memory: ${(memoryDelta / 1024).toFixed(2)}KB`);
    
    return { duration, memoryDelta };
  }

  getAveragePerformance() {
    return {
      avgPredictionTime: this.metrics.totalTime / this.metrics.predictions,
      totalPredictions: this.metrics.predictions,
      avgMemoryIncrease: this.metrics.memoryPeaks.reduce((sum, peak) => sum + peak, 0) / this.metrics.memoryPeaks.length,
      errorRate: this.metrics.errors / this.metrics.predictions
    };
  }
}
```

## 🔗 Next Steps

- **Service Implementation**: Learn about specific AI services
- **Model Training**: Understand our training pipeline
- **Performance Optimization**: Advanced optimization techniques
- **Testing**: Comprehensive testing strategies

## 📚 External Resources

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [React Native TensorFlow.js](https://github.com/tensorflow/tfjs/tree/master/tfjs-react-native)
- [Model Optimization Guide](https://www.tensorflow.org/js/guide/optimize)
- [Performance Best Practices](https://www.tensorflow.org/js/guide/performance)

---

*This integration enables powerful AI capabilities directly in mobile devices, providing real-time property analysis without compromising user privacy.*