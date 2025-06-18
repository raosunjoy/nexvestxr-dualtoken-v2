/**
 * Property Image Analysis Service
 * Computer vision service for analyzing property images using TensorFlow.js
 * Provides property type classification, condition assessment, and feature detection
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

class PropertyImageAnalysisService {
  constructor() {
    this.isInitialized = false;
    this.models = {
      propertyClassifier: null,    // Apartment, villa, office, retail
      conditionAssessment: null,   // New, good, fair, poor
      featureDetection: null,      // Pool, garden, parking, etc.
      roomClassifier: null,        // Bedroom, bathroom, kitchen, living
      priceEstimator: null         // Price estimation from images
    };
    this.listeners = [];
    this.cache = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
    
    // UAE property specific features
    this.propertyTypes = ['apartment', 'villa', 'townhouse', 'office', 'retail', 'warehouse'];
    this.conditions = ['excellent', 'good', 'fair', 'poor'];
    this.features = [
      'swimming_pool', 'garden', 'parking', 'balcony', 'gym', 'security',
      'elevator', 'central_ac', 'kitchen_modern', 'bathroom_modern',
      'marble_flooring', 'wooden_flooring', 'ceramic_tiles', 'granite_counters',
      'built_in_wardrobes', 'maid_room', 'driver_room', 'study_room'
    ];
    this.roomTypes = ['living_room', 'bedroom', 'kitchen', 'bathroom', 'dining', 'balcony', 'study'];
  }

  async initialize() {
    try {
      this.notifyListeners('initialization_started', {});
      
      await tf.ready();
      console.log('TensorFlow.js ready for image analysis');
      
      // Try to load existing models
      await this.loadModels();
      
      // If models don't exist, create and train them
      if (!this.allModelsLoaded()) {
        await this.createAndTrainModels();
      }
      
      this.isInitialized = true;
      this.notifyListeners('initialized', { success: true });
      console.log('PropertyImageAnalysisService initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize PropertyImageAnalysisService:', error);
      this.notifyListeners('error', { error: error.message });
      throw error;
    }
  }

  async loadModels() {
    const modelPaths = {
      propertyClassifier: 'localstorage://property-classifier-model',
      conditionAssessment: 'localstorage://condition-assessment-model',
      featureDetection: 'localstorage://feature-detection-model',
      roomClassifier: 'localstorage://room-classifier-model',
      priceEstimator: 'localstorage://price-estimator-model'
    };

    for (const [modelName, path] of Object.entries(modelPaths)) {
      try {
        const model = await tf.loadLayersModel(path);
        this.models[modelName] = model;
        console.log(`Loaded ${modelName} from storage`);
      } catch (error) {
        console.log(`${modelName} not found, will create new model`);
      }
    }
  }

  allModelsLoaded() {
    return Object.values(this.models).every(model => model !== null);
  }

  async createAndTrainModels() {
    this.notifyListeners('training_started', {});
    
    // Create property classifier model
    this.models.propertyClassifier = await this.createPropertyClassifierModel();
    await this.trainPropertyClassifier();
    
    // Create condition assessment model
    this.models.conditionAssessment = await this.createConditionAssessmentModel();
    await this.trainConditionAssessment();
    
    // Create feature detection model
    this.models.featureDetection = await this.createFeatureDetectionModel();
    await this.trainFeatureDetection();
    
    // Create room classifier model
    this.models.roomClassifier = await this.createRoomClassifierModel();
    await this.trainRoomClassifier();
    
    // Create price estimator model
    this.models.priceEstimator = await this.createPriceEstimatorModel();
    await this.trainPriceEstimator();
    
    // Save all models
    await this.saveModels();
    
    this.notifyListeners('training_completed', {});
  }

  async createPropertyClassifierModel() {
    const model = tf.sequential({
      layers: [
        // Convolutional layers for feature extraction
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
          name: 'conv1'
        }),
        tf.layers.maxPooling2d({ poolSize: 2, name: 'pool1' }),
        tf.layers.batchNormalization({ name: 'bn1' }),
        
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu',
          name: 'conv2'
        }),
        tf.layers.maxPooling2d({ poolSize: 2, name: 'pool2' }),
        tf.layers.batchNormalization({ name: 'bn2' }),
        
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu',
          name: 'conv3'
        }),
        tf.layers.maxPooling2d({ poolSize: 2, name: 'pool3' }),
        tf.layers.batchNormalization({ name: 'bn3' }),
        
        tf.layers.conv2d({
          filters: 256,
          kernelSize: 3,
          activation: 'relu',
          name: 'conv4'
        }),
        tf.layers.globalAveragePooling2d({ name: 'gap' }),
        
        // Dense layers for classification
        tf.layers.dense({
          units: 512,
          activation: 'relu',
          name: 'dense1'
        }),
        tf.layers.dropout({ rate: 0.5, name: 'dropout1' }),
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          name: 'dense2'
        }),
        tf.layers.dropout({ rate: 0.3, name: 'dropout2' }),
        tf.layers.dense({
          units: this.propertyTypes.length,
          activation: 'softmax',
          name: 'property_output'
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

  async createConditionAssessmentModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 5,
          activation: 'relu',
          name: 'cond_conv1'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 5,
          activation: 'relu',
          name: 'cond_conv2'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu',
          name: 'cond_conv3'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.globalAveragePooling2d(),
        
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          name: 'cond_dense1'
        }),
        tf.layers.dropout({ rate: 0.4 }),
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'cond_dense2'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: this.conditions.length,
          activation: 'softmax',
          name: 'condition_output'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async createFeatureDetectionModel() {
    // Multi-label classification for property features
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 64,
          kernelSize: 3,
          activation: 'relu',
          name: 'feat_conv1'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu',
          name: 'feat_conv2'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 256,
          kernelSize: 3,
          activation: 'relu',
          name: 'feat_conv3'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 512,
          kernelSize: 3,
          activation: 'relu',
          name: 'feat_conv4'
        }),
        tf.layers.globalAveragePooling2d(),
        
        tf.layers.dense({
          units: 1024,
          activation: 'relu',
          name: 'feat_dense1'
        }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({
          units: 512,
          activation: 'relu',
          name: 'feat_dense2'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: this.features.length,
          activation: 'sigmoid', // Multi-label classification
          name: 'features_output'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['binaryAccuracy']
    });

    return model;
  }

  async createRoomClassifierModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
          name: 'room_conv1'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu',
          name: 'room_conv2'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu',
          name: 'room_conv3'
        }),
        tf.layers.globalAveragePooling2d(),
        
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          name: 'room_dense1'
        }),
        tf.layers.dropout({ rate: 0.4 }),
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'room_dense2'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: this.roomTypes.length,
          activation: 'softmax',
          name: 'room_output'
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

  async createPriceEstimatorModel() {
    // Regression model for price estimation from images
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 64,
          kernelSize: 3,
          activation: 'relu',
          name: 'price_conv1'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu',
          name: 'price_conv2'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.batchNormalization(),
        
        tf.layers.conv2d({
          filters: 256,
          kernelSize: 3,
          activation: 'relu',
          name: 'price_conv3'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.globalAveragePooling2d(),
        
        tf.layers.dense({
          units: 512,
          activation: 'relu',
          name: 'price_dense1'
        }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          name: 'price_dense2'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'price_dense3'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear', // Regression output
          name: 'price_output'
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

  async trainPropertyClassifier() {
    const trainingData = this.generatePropertyImageTrainingData();
    
    const xs = tf.tensor4d(trainingData.images);
    const ys = tf.tensor2d(trainingData.labels);
    
    try {
      await this.models.propertyClassifier.fit(xs, ys, {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.notifyListeners('training_progress', {
              model: 'propertyClassifier',
              epoch: epoch + 1,
              totalEpochs: 50,
              loss: logs.loss,
              accuracy: logs.acc
            });
          }
        }
      });
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  async trainConditionAssessment() {
    const trainingData = this.generateConditionTrainingData();
    
    const xs = tf.tensor4d(trainingData.images);
    const ys = tf.tensor2d(trainingData.labels);
    
    try {
      await this.models.conditionAssessment.fit(xs, ys, {
        epochs: 40,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.notifyListeners('training_progress', {
              model: 'conditionAssessment',
              epoch: epoch + 1,
              totalEpochs: 40,
              loss: logs.loss,
              accuracy: logs.acc
            });
          }
        }
      });
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  async trainFeatureDetection() {
    const trainingData = this.generateFeatureTrainingData();
    
    const xs = tf.tensor4d(trainingData.images);
    const ys = tf.tensor2d(trainingData.labels);
    
    try {
      await this.models.featureDetection.fit(xs, ys, {
        epochs: 45,
        batchSize: 12,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.notifyListeners('training_progress', {
              model: 'featureDetection',
              epoch: epoch + 1,
              totalEpochs: 45,
              loss: logs.loss,
              accuracy: logs.binaryAccuracy
            });
          }
        }
      });
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  async trainRoomClassifier() {
    const trainingData = this.generateRoomTrainingData();
    
    const xs = tf.tensor4d(trainingData.images);
    const ys = tf.tensor2d(trainingData.labels);
    
    try {
      await this.models.roomClassifier.fit(xs, ys, {
        epochs: 35,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.notifyListeners('training_progress', {
              model: 'roomClassifier',
              epoch: epoch + 1,
              totalEpochs: 35,
              loss: logs.loss,
              accuracy: logs.acc
            });
          }
        }
      });
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  async trainPriceEstimator() {
    const trainingData = this.generatePriceTrainingData();
    
    const xs = tf.tensor4d(trainingData.images);
    const ys = tf.tensor2d(trainingData.prices);
    
    try {
      await this.models.priceEstimator.fit(xs, ys, {
        epochs: 60,
        batchSize: 8,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.notifyListeners('training_progress', {
              model: 'priceEstimator',
              epoch: epoch + 1,
              totalEpochs: 60,
              loss: logs.loss,
              mae: logs.mae
            });
          }
        }
      });
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  generatePropertyImageTrainingData() {
    // Generate synthetic training data representing different property types
    const imageCount = 1000;
    const images = [];
    const labels = [];
    
    for (let i = 0; i < imageCount; i++) {
      // Generate synthetic image data (224x224x3)
      const image = Array(224 * 224 * 3).fill(0).map(() => Math.random());
      images.push(this.reshapeImageData(image));
      
      // Generate property type label
      const propertyTypeIndex = Math.floor(Math.random() * this.propertyTypes.length);
      const label = Array(this.propertyTypes.length).fill(0);
      label[propertyTypeIndex] = 1;
      labels.push(label);
    }
    
    return { images, labels };
  }

  generateConditionTrainingData() {
    const imageCount = 800;
    const images = [];
    const labels = [];
    
    for (let i = 0; i < imageCount; i++) {
      const image = Array(224 * 224 * 3).fill(0).map(() => Math.random());
      images.push(this.reshapeImageData(image));
      
      const conditionIndex = Math.floor(Math.random() * this.conditions.length);
      const label = Array(this.conditions.length).fill(0);
      label[conditionIndex] = 1;
      labels.push(label);
    }
    
    return { images, labels };
  }

  generateFeatureTrainingData() {
    const imageCount = 1200;
    const images = [];
    const labels = [];
    
    for (let i = 0; i < imageCount; i++) {
      const image = Array(224 * 224 * 3).fill(0).map(() => Math.random());
      images.push(this.reshapeImageData(image));
      
      // Multi-label: each feature can be present or not
      const label = this.features.map(() => Math.random() > 0.7 ? 1 : 0);
      labels.push(label);
    }
    
    return { images, labels };
  }

  generateRoomTrainingData() {
    const imageCount = 700;
    const images = [];
    const labels = [];
    
    for (let i = 0; i < imageCount; i++) {
      const image = Array(224 * 224 * 3).fill(0).map(() => Math.random());
      images.push(this.reshapeImageData(image));
      
      const roomTypeIndex = Math.floor(Math.random() * this.roomTypes.length);
      const label = Array(this.roomTypes.length).fill(0);
      label[roomTypeIndex] = 1;
      labels.push(label);
    }
    
    return { images, labels };
  }

  generatePriceTrainingData() {
    const imageCount = 900;
    const images = [];
    const prices = [];
    
    for (let i = 0; i < imageCount; i++) {
      const image = Array(224 * 224 * 3).fill(0).map(() => Math.random());
      images.push(this.reshapeImageData(image));
      
      // Generate price in AED (normalized)
      const basePrice = 500000 + Math.random() * 4500000; // 500k to 5M AED
      const normalizedPrice = basePrice / 5000000; // Normalize to 0-1
      prices.push([normalizedPrice]);
    }
    
    return { images, prices };
  }

  reshapeImageData(flatData) {
    const reshaped = [];
    for (let i = 0; i < 224; i++) {
      const row = [];
      for (let j = 0; j < 224; j++) {
        const pixel = [];
        for (let k = 0; k < 3; k++) {
          pixel.push(flatData[i * 224 * 3 + j * 3 + k]);
        }
        row.push(pixel);
      }
      reshaped.push(row);
    }
    return reshaped;
  }

  async saveModels() {
    const modelPaths = {
      propertyClassifier: 'localstorage://property-classifier-model',
      conditionAssessment: 'localstorage://condition-assessment-model',
      featureDetection: 'localstorage://feature-detection-model',
      roomClassifier: 'localstorage://room-classifier-model',
      priceEstimator: 'localstorage://price-estimator-model'
    };

    for (const [modelName, path] of Object.entries(modelPaths)) {
      if (this.models[modelName]) {
        await this.models[modelName].save(path);
        console.log(`Saved ${modelName} to storage`);
      }
    }
  }

  async analyzePropertyImage(imageUri, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    const cacheKey = this.generateImageCacheKey(imageUri, options);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    this.notifyListeners('analysis_started', { imageUri });

    try {
      // Preprocess image
      const imageTensor = await this.preprocessImage(imageUri);
      
      // Run all analyses concurrently
      const [
        propertyType,
        condition,
        features,
        roomType,
        priceEstimate
      ] = await Promise.all([
        this.classifyPropertyType(imageTensor),
        this.assessCondition(imageTensor),
        this.detectFeatures(imageTensor),
        this.classifyRoom(imageTensor),
        this.estimatePrice(imageTensor)
      ]);

      const analysis = {
        imageUri,
        timestamp: new Date().toISOString(),
        propertyType,
        condition,
        features,
        roomType,
        priceEstimate,
        confidence: this.calculateOverallConfidence(propertyType, condition, features, roomType, priceEstimate),
        recommendations: this.generateImageRecommendations(propertyType, condition, features)
      };

      // Cache result
      this.cache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      this.notifyListeners('analysis_completed', analysis);
      
      // Dispose tensor
      imageTensor.dispose();
      
      return analysis;

    } catch (error) {
      this.notifyListeners('error', { error: error.message, imageUri });
      throw error;
    }
  }

  async preprocessImage(imageUri) {
    // In a real implementation, this would load and preprocess the actual image
    // For now, we'll simulate with random data
    const imageData = Array(224 * 224 * 3).fill(0).map(() => Math.random());
    const reshapedData = this.reshapeImageData(imageData);
    
    return tf.tensor4d([reshapedData]);
  }

  async classifyPropertyType(imageTensor) {
    const prediction = this.models.propertyClassifier.predict(imageTensor);
    const probabilities = await prediction.data();
    prediction.dispose();

    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    
    return {
      type: this.propertyTypes[maxIndex],
      confidence: probabilities[maxIndex],
      probabilities: this.propertyTypes.reduce((acc, type, index) => {
        acc[type] = probabilities[index];
        return acc;
      }, {})
    };
  }

  async assessCondition(imageTensor) {
    const prediction = this.models.conditionAssessment.predict(imageTensor);
    const probabilities = await prediction.data();
    prediction.dispose();

    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    
    return {
      condition: this.conditions[maxIndex],
      confidence: probabilities[maxIndex],
      score: this.calculateConditionScore(this.conditions[maxIndex]),
      probabilities: this.conditions.reduce((acc, condition, index) => {
        acc[condition] = probabilities[index];
        return acc;
      }, {})
    };
  }

  async detectFeatures(imageTensor) {
    const prediction = this.models.featureDetection.predict(imageTensor);
    const probabilities = await prediction.data();
    prediction.dispose();

    const detectedFeatures = [];
    const threshold = 0.5;

    this.features.forEach((feature, index) => {
      if (probabilities[index] > threshold) {
        detectedFeatures.push({
          feature,
          confidence: probabilities[index],
          impact: this.getFeatureImpact(feature)
        });
      }
    });

    return {
      detected: detectedFeatures,
      count: detectedFeatures.length,
      luxuryScore: this.calculateLuxuryScore(detectedFeatures),
      valueImpact: this.calculateFeatureValueImpact(detectedFeatures)
    };
  }

  async classifyRoom(imageTensor) {
    const prediction = this.models.roomClassifier.predict(imageTensor);
    const probabilities = await prediction.data();
    prediction.dispose();

    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    
    return {
      roomType: this.roomTypes[maxIndex],
      confidence: probabilities[maxIndex],
      probabilities: this.roomTypes.reduce((acc, room, index) => {
        acc[room] = probabilities[index];
        return acc;
      }, {})
    };
  }

  async estimatePrice(imageTensor) {
    const prediction = this.models.priceEstimator.predict(imageTensor);
    const normalizedPrice = (await prediction.data())[0];
    prediction.dispose();

    const estimatedPrice = normalizedPrice * 5000000; // Denormalize
    
    return {
      estimatedValue: Math.round(estimatedPrice),
      currency: 'AED',
      confidence: this.calculatePriceConfidence(normalizedPrice),
      range: {
        min: Math.round(estimatedPrice * 0.8),
        max: Math.round(estimatedPrice * 1.2)
      }
    };
  }

  calculateConditionScore(condition) {
    const scores = {
      'excellent': 95,
      'good': 80,
      'fair': 60,
      'poor': 35
    };
    return scores[condition] || 50;
  }

  getFeatureImpact(feature) {
    const impacts = {
      'swimming_pool': 0.15,
      'garden': 0.10,
      'parking': 0.08,
      'gym': 0.12,
      'security': 0.08,
      'elevator': 0.06,
      'central_ac': 0.07,
      'marble_flooring': 0.05,
      'granite_counters': 0.04,
      'maid_room': 0.06,
      'driver_room': 0.04,
      'study_room': 0.03
    };
    return impacts[feature] || 0.02;
  }

  calculateLuxuryScore(features) {
    const luxuryFeatures = ['swimming_pool', 'gym', 'marble_flooring', 'granite_counters', 'maid_room'];
    const luxuryCount = features.filter(f => luxuryFeatures.includes(f.feature)).length;
    return Math.min(luxuryCount * 20, 100);
  }

  calculateFeatureValueImpact(features) {
    return features.reduce((total, feature) => total + feature.impact, 0);
  }

  calculatePriceConfidence(normalizedPrice) {
    // Higher confidence for mid-range prices
    const midPoint = 0.5;
    const distance = Math.abs(normalizedPrice - midPoint);
    return Math.max(0.6, 1 - distance * 2);
  }

  calculateOverallConfidence(propertyType, condition, features, roomType, priceEstimate) {
    return (
      propertyType.confidence * 0.25 +
      condition.confidence * 0.25 +
      (features.detected.length > 0 ? features.detected.reduce((sum, f) => sum + f.confidence, 0) / features.detected.length : 0.5) * 0.2 +
      roomType.confidence * 0.15 +
      priceEstimate.confidence * 0.15
    );
  }

  generateImageRecommendations(propertyType, condition, features) {
    const recommendations = [];

    if (condition.score >= 90) {
      recommendations.push('Excellent property condition - ideal for premium pricing');
    } else if (condition.score < 60) {
      recommendations.push('Property may need renovations before listing');
    }

    if (features.luxuryScore >= 60) {
      recommendations.push('High-end features detected - target luxury market');
    }

    if (propertyType.confidence > 0.8) {
      recommendations.push(`Property type clearly identified as ${propertyType.type}`);
    }

    if (features.valueImpact > 0.3) {
      recommendations.push('Multiple value-adding features detected');
    }

    return recommendations;
  }

  async analyzeBulkImages(imageUris, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    this.notifyListeners('bulk_analysis_started', { count: imageUris.length });

    const results = [];
    const batchSize = options.batchSize || 5;

    for (let i = 0; i < imageUris.length; i += batchSize) {
      const batch = imageUris.slice(i, i + batchSize);
      const batchPromises = batch.map(uri => this.analyzePropertyImage(uri, options));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        this.notifyListeners('bulk_progress', {
          completed: results.length,
          total: imageUris.length,
          progress: (results.length / imageUris.length) * 100
        });
      } catch (error) {
        console.error('Batch processing error:', error);
        this.notifyListeners('error', { error: error.message, batch: i / batchSize });
      }
    }

    const summary = this.generateBulkAnalysisSummary(results);
    
    this.notifyListeners('bulk_analysis_completed', { results, summary });
    
    return { results, summary };
  }

  generateBulkAnalysisSummary(results) {
    const propertyTypes = {};
    const conditions = {};
    const features = {};
    let totalValue = 0;
    let avgConfidence = 0;

    results.forEach(result => {
      // Property types
      const type = result.propertyType.type;
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;

      // Conditions
      const condition = result.condition.condition;
      conditions[condition] = (conditions[condition] || 0) + 1;

      // Features
      result.features.detected.forEach(feature => {
        features[feature.feature] = (features[feature.feature] || 0) + 1;
      });

      totalValue += result.priceEstimate.estimatedValue;
      avgConfidence += result.confidence;
    });

    return {
      totalImages: results.length,
      averageValue: Math.round(totalValue / results.length),
      averageConfidence: avgConfidence / results.length,
      propertyTypeDistribution: propertyTypes,
      conditionDistribution: conditions,
      commonFeatures: Object.entries(features)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [feature, count]) => {
          acc[feature] = count;
          return acc;
        }, {}),
      recommendations: this.generatePortfolioRecommendations(results)
    };
  }

  generatePortfolioRecommendations(results) {
    const recommendations = [];
    
    const excellentProperties = results.filter(r => r.condition.score >= 90).length;
    const poorProperties = results.filter(r => r.condition.score < 60).length;
    
    if (excellentProperties > results.length * 0.6) {
      recommendations.push('High-quality portfolio suitable for premium market positioning');
    }
    
    if (poorProperties > results.length * 0.3) {
      recommendations.push('Consider renovation strategy for multiple properties');
    }
    
    const avgLuxury = results.reduce((sum, r) => sum + r.features.luxuryScore, 0) / results.length;
    if (avgLuxury > 60) {
      recommendations.push('Portfolio shows strong luxury appeal');
    }
    
    return recommendations;
  }

  generateImageCacheKey(imageUri, options) {
    const optionsStr = JSON.stringify(options);
    return `image_${imageUri}_${optionsStr}`;
  }

  getCachedResult(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.data;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

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

  dispose() {
    // Dispose all models
    Object.values(this.models).forEach(model => {
      if (model) {
        model.dispose();
      }
    });

    // Clear cache and listeners
    this.cache.clear();
    this.listeners = [];
    this.isInitialized = false;
  }
}

export const propertyImageAnalysisService = new PropertyImageAnalysisService();