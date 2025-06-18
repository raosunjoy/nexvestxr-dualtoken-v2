import { jest } from '@jest/globals';

// Mock TensorFlow.js
const mockTensorFlow = {
  ready: jest.fn(() => Promise.resolve()),
  
  // Mock tensor operations
  tensor: jest.fn((data) => ({
    data: jest.fn(() => Promise.resolve(new Float32Array(data.flat()))),
    dispose: jest.fn(),
    shape: data.length ? [data.length, data[0].length || 1] : [0],
  })),
  
  tensor1d: jest.fn((data) => ({
    data: jest.fn(() => Promise.resolve(new Float32Array(data))),
    dispose: jest.fn(),
    shape: [data.length],
  })),
  
  tensor2d: jest.fn((data, shape) => ({
    data: jest.fn(() => Promise.resolve(new Float32Array(data.flat()))),
    dispose: jest.fn(),
    shape: shape || [data.length, data[0].length],
    predict: jest.fn(() => mockTensorFlow.tensor2d([[0.8, 0.2, 0.6, 0.4]])),
  })),
  
  tensor3d: jest.fn((data, shape) => ({
    data: jest.fn(() => Promise.resolve(new Float32Array(data.flat(2)))),
    dispose: jest.fn(),
    shape: shape || [data.length, data[0].length, data[0][0].length],
  })),
  
  // Mock model operations
  sequential: jest.fn((config) => ({
    add: jest.fn(),
    compile: jest.fn(),
    fit: jest.fn(() => Promise.resolve({
      history: {
        loss: [0.5, 0.3, 0.2],
        val_loss: [0.6, 0.4, 0.3],
      }
    })),
    predict: jest.fn((input) => {
      // Return mock prediction based on input shape
      const batchSize = input.shape[0];
      const outputSize = 4; // Default output size
      return mockTensorFlow.tensor2d(
        Array(batchSize).fill().map(() => 
          Array(outputSize).fill().map(() => Math.random())
        )
      );
    }),
    save: jest.fn(() => Promise.resolve()),
    dispose: jest.fn(),
    summary: jest.fn(),
    getWeights: jest.fn(() => []),
    setWeights: jest.fn(),
  })),
  
  loadLayersModel: jest.fn((path) => Promise.resolve({
    predict: jest.fn((input) => {
      const batchSize = input.shape[0];
      const outputSize = 4;
      return mockTensorFlow.tensor2d(
        Array(batchSize).fill().map(() => 
          Array(outputSize).fill().map(() => Math.random())
        )
      );
    }),
    save: jest.fn(() => Promise.resolve()),
    dispose: jest.fn(),
    summary: jest.fn(),
  })),
  
  // Mock layers
  layers: {
    dense: jest.fn((config) => ({
      name: config.name || 'dense',
      units: config.units,
      activation: config.activation,
    })),
    
    lstm: jest.fn((config) => ({
      name: config.name || 'lstm',
      units: config.units,
      returnSequences: config.returnSequences,
    })),
    
    dropout: jest.fn((config) => ({
      name: 'dropout',
      rate: config.rate,
    })),
    
    batchNormalization: jest.fn(() => ({
      name: 'batchNormalization',
    })),
  },
  
  // Mock training
  train: {
    adam: jest.fn((learningRate) => ({
      minimize: jest.fn(),
      learningRate,
    })),
  },
  
  // Mock regularizers
  regularizers: {
    l2: jest.fn((config) => ({
      l2: config.l2,
    })),
  },
  
  // Mock losses
  losses: {
    meanSquaredError: jest.fn(),
    binaryCrossentropy: jest.fn(),
  },
  
  // Mock metrics
  metrics: {
    mae: jest.fn(),
    mse: jest.fn(),
    accuracy: jest.fn(),
  },
  
  // Mock data operations
  util: {
    shuffle: jest.fn((data) => data),
    createShuffledIndices: jest.fn((n) => Array.from({length: n}, (_, i) => i)),
  },
  
  // Mock browser operations
  browser: {
    fromPixels: jest.fn(() => mockTensorFlow.tensor3d([[[1, 2, 3]]])),
    toPixels: jest.fn(() => Promise.resolve()),
  },
  
  // Mock node operations (for testing)
  node: {
    decodeImage: jest.fn(() => mockTensorFlow.tensor3d([[[1, 2, 3]]])),
  },
  
  // Memory management
  memory: jest.fn(() => ({
    numTensors: 0,
    numDataBuffers: 0,
    numBytes: 0,
  })),
  
  dispose: jest.fn(),
  tidy: jest.fn((fn) => fn()),
  
  // Environment
  env: jest.fn(() => ({
    get: jest.fn(() => 'cpu'),
    set: jest.fn(),
  })),
};

// Mock platform-specific imports
export const mockPlatformTensorFlow = {
  '@tensorflow/tfjs': mockTensorFlow,
  '@tensorflow/tfjs-react-native': {
    platform: jest.fn(),
    decodeJpeg: jest.fn(),
    bundleResourceIO: jest.fn(),
  },
  '@tensorflow/tfjs-platform-react-native': {
    Platform: jest.fn(),
  },
};

// Export default mock
export default mockTensorFlow;