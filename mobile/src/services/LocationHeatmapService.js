import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-platform-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './ApiService';
import config from '../config';

class LocationHeatmapService {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.heatmapData = new Map();
    this.modelVersion = '1.0.0';
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.listeners = [];
    
    // UAE location bounds
    this.uaeBounds = {
      north: 26.084,
      south: 22.633,
      east: 56.396,
      west: 51.583
    };
    
    // Grid resolution for heatmap
    this.gridResolution = 50; // 50x50 grid
    
    this.initialize();
  }

  // Initialize TensorFlow and load model
  async initialize() {
    try {
      console.log('Initializing LocationHeatmapService...');
      
      // Initialize TensorFlow platform
      await tf.ready();
      console.log('TensorFlow ready');
      
      // Load or create the model
      await this.loadOrCreateModel();
      
      // Load cached heatmap data
      await this.loadCachedData();
      
      this.isInitialized = true;
      this.notifyListeners('initialized', { success: true });
      console.log('LocationHeatmapService initialized successfully');
      
    } catch (error) {
      console.error('LocationHeatmapService initialization error:', error);
      this.notifyListeners('error', { error: error.message });
    }
  }

  // Load or create the TensorFlow model
  async loadOrCreateModel() {
    try {
      // Try to load existing model
      const modelPath = `${config.CACHE_DIR}/heatmap_model`;
      
      try {
        this.model = await tf.loadLayersModel(`localstorage://${modelPath}`);
        console.log('Loaded existing heatmap model');
      } catch (loadError) {
        console.log('Creating new heatmap model...');
        await this.createModel();
      }
      
    } catch (error) {
      console.error('Model loading/creation error:', error);
      throw error;
    }
  }

  // Create a new TensorFlow model for property value prediction
  async createModel() {
    try {
      // Input features: [lat, lng, property_type, size, age, amenities_score]
      const model = tf.sequential({
        layers: [
          // Input layer
          tf.layers.dense({
            inputShape: [6],
            units: 64,
            activation: 'relu',
            name: 'input_layer'
          }),
          
          // Hidden layers with dropout for regularization
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 128,
            activation: 'relu',
            name: 'hidden_1'
          }),
          
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 64,
            activation: 'relu',
            name: 'hidden_2'
          }),
          
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            name: 'hidden_3'
          }),
          
          // Output layers for multiple predictions
          tf.layers.dense({
            units: 16,
            activation: 'relu',
            name: 'pre_output'
          }),
          
          // Multi-output: [value, demand_score, investment_score, risk_score]
          tf.layers.dense({
            units: 4,
            activation: 'linear',
            name: 'output_layer'
          })
        ]
      });

      // Compile model with custom loss function
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae', 'mse']
      });

      // Train with initial UAE real estate data
      await this.trainInitialModel(model);

      this.model = model;
      
      // Save model
      await this.model.save(`localstorage://heatmap_model`);
      console.log('Created and saved new heatmap model');
      
    } catch (error) {
      console.error('Model creation error:', error);
      throw error;
    }
  }

  // Train model with initial UAE real estate data
  async trainInitialModel(model) {
    try {
      // Generate synthetic training data based on UAE real estate patterns
      const trainingData = this.generateUAETrainingData();
      
      const xs = tf.tensor2d(trainingData.features);
      const ys = tf.tensor2d(trainingData.labels);
      
      console.log('Training initial model...');
      
      await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
            }
          }
        }
      });
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      
      console.log('Initial model training completed');
      
    } catch (error) {
      console.error('Initial training error:', error);
      throw error;
    }
  }

  // Generate synthetic UAE real estate training data
  generateUAETrainingData() {
    const features = [];
    const labels = [];
    
    // UAE prime locations with known patterns
    const primeLocations = [
      { lat: 25.0760, lng: 55.1302, name: 'Dubai Marina', multiplier: 1.8 },
      { lat: 25.2048, lng: 55.2708, name: 'Downtown Dubai', multiplier: 2.2 },
      { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi Central', multiplier: 1.9 },
      { lat: 25.1972, lng: 55.2744, name: 'DIFC', multiplier: 2.0 },
      { lat: 25.1127, lng: 55.1390, name: 'JBR', multiplier: 1.7 },
      { lat: 24.4219, lng: 54.4319, name: 'Saadiyat Island', multiplier: 2.1 },
      { lat: 25.0657, lng: 55.1713, name: 'Palm Jumeirah', multiplier: 2.5 },
      { lat: 25.0343, lng: 55.1413, name: 'Business Bay', multiplier: 1.6 },
      { lat: 24.3700, lng: 54.4217, name: 'Al Reem Island', multiplier: 1.8 },
      { lat: 25.0925, lng: 55.1562, name: 'Jumeirah Lakes Towers', multiplier: 1.5 }
    ];
    
    // Generate 1000 training samples
    for (let i = 0; i < 1000; i++) {
      const location = primeLocations[Math.floor(Math.random() * primeLocations.length)];
      
      // Add noise to location
      const lat = location.lat + (Math.random() - 0.5) * 0.02;
      const lng = location.lng + (Math.random() - 0.5) * 0.02;
      
      // Property characteristics
      const propertyType = Math.floor(Math.random() * 5); // 0-4: apartment, villa, commercial, etc.
      const size = 50 + Math.random() * 500; // 50-550 sqm
      const age = Math.random() * 20; // 0-20 years
      const amenitiesScore = Math.random() * 100; // 0-100 amenities score
      
      // Calculate target values based on location and characteristics
      const baseValue = 5000 + size * 8 + amenitiesScore * 20; // Base AED per sqm
      const locationValue = baseValue * location.multiplier;
      const ageDiscount = 1 - (age * 0.02); // 2% discount per year
      const finalValue = locationValue * ageDiscount;
      
      const demandScore = 60 + Math.random() * 40; // 60-100 demand score
      const investmentScore = 50 + Math.random() * 50; // 50-100 investment score  
      const riskScore = Math.random() * 50; // 0-50 risk score (lower is better)
      
      features.push([lat, lng, propertyType, size, age, amenitiesScore]);
      labels.push([finalValue, demandScore, investmentScore, riskScore]);
    }
    
    return { features, labels };
  }

  // Generate heatmap data for UAE regions
  async generateHeatmap(filters = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }
      
      console.log('Generating heatmap data...');
      this.notifyListeners('heatmap_generation_started', filters);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(filters);
      if (this.heatmapData.has(cacheKey)) {
        const cached = this.heatmapData.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('Returning cached heatmap data');
          return cached.data;
        }
      }
      
      // Generate grid points for UAE
      const gridPoints = this.generateGridPoints();
      const heatmapPoints = [];
      
      // Process in batches for performance
      const batchSize = 100;
      const batches = this.chunkArray(gridPoints, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchFeatures = batch.map(point => [
          point.lat,
          point.lng,
          filters.propertyType || 0,
          filters.size || 100,
          filters.age || 5,
          filters.amenitiesScore || 70
        ]);
        
        // Predict using TensorFlow model
        const predictions = await this.model.predict(tf.tensor2d(batchFeatures));
        const predictionData = await predictions.data();
        predictions.dispose();
        
        // Process predictions
        for (let j = 0; j < batch.length; j++) {
          const baseIndex = j * 4; // 4 outputs per prediction
          heatmapPoints.push({
            latitude: batch[j].lat,
            longitude: batch[j].lng,
            value: predictionData[baseIndex], // Property value
            demand: predictionData[baseIndex + 1], // Demand score
            investment: predictionData[baseIndex + 2], // Investment score
            risk: predictionData[baseIndex + 3], // Risk score
            intensity: this.normalizeIntensity(predictionData[baseIndex], filters)
          });
        }
        
        // Update progress
        const progress = ((i + 1) / batches.length) * 100;
        this.notifyListeners('heatmap_progress', { progress: Math.round(progress) });
      }
      
      // Apply filters and sorting
      const filteredPoints = this.applyHeatmapFilters(heatmapPoints, filters);
      
      // Cache the result
      this.heatmapData.set(cacheKey, {
        data: filteredPoints,
        timestamp: Date.now()
      });
      
      this.notifyListeners('heatmap_generation_completed', {
        pointCount: filteredPoints.length,
        filters
      });
      
      console.log(`Generated heatmap with ${filteredPoints.length} points`);
      return filteredPoints;
      
    } catch (error) {
      console.error('Heatmap generation error:', error);
      this.notifyListeners('error', { error: error.message });
      throw error;
    }
  }

  // Generate grid points covering UAE
  generateGridPoints() {
    const points = [];
    const latStep = (this.uaeBounds.north - this.uaeBounds.south) / this.gridResolution;
    const lngStep = (this.uaeBounds.east - this.uaeBounds.west) / this.gridResolution;
    
    for (let i = 0; i <= this.gridResolution; i++) {
      for (let j = 0; j <= this.gridResolution; j++) {
        const lat = this.uaeBounds.south + (i * latStep);
        const lng = this.uaeBounds.west + (j * lngStep);
        points.push({ lat, lng });
      }
    }
    
    return points;
  }

  // Normalize intensity for heatmap visualization
  normalizeIntensity(value, filters) {
    // Normalize based on UAE property value ranges
    const minValue = 2000; // AED per sqm
    const maxValue = 25000; // AED per sqm
    
    const normalized = (value - minValue) / (maxValue - minValue);
    return Math.max(0, Math.min(1, normalized));
  }

  // Apply filters to heatmap points
  applyHeatmapFilters(points, filters) {
    let filtered = [...points];
    
    // Filter by minimum value
    if (filters.minValue) {
      filtered = filtered.filter(point => point.value >= filters.minValue);
    }
    
    // Filter by maximum value  
    if (filters.maxValue) {
      filtered = filtered.filter(point => point.value <= filters.maxValue);
    }
    
    // Filter by demand score
    if (filters.minDemand) {
      filtered = filtered.filter(point => point.demand >= filters.minDemand);
    }
    
    // Filter by investment score
    if (filters.minInvestment) {
      filtered = filtered.filter(point => point.investment >= filters.minInvestment);
    }
    
    // Filter by risk threshold
    if (filters.maxRisk) {
      filtered = filtered.filter(point => point.risk <= filters.maxRisk);
    }
    
    // Sort by intensity (highest first)
    filtered.sort((a, b) => b.intensity - a.intensity);
    
    // Limit points for performance
    if (filters.maxPoints) {
      filtered = filtered.slice(0, filters.maxPoints);
    }
    
    return filtered;
  }

  // Update model with new real estate data
  async updateModelWithNewData(newData) {
    try {
      if (!this.isInitialized || !this.model) {
        throw new Error('Model not initialized');
      }
      
      console.log('Updating model with new data...');
      
      // Prepare training data from new real estate transactions
      const features = newData.map(property => [
        property.latitude,
        property.longitude,
        property.type || 0,
        property.size || 100,
        property.age || 5,
        property.amenitiesScore || 70
      ]);
      
      const labels = newData.map(property => [
        property.pricePerSqm || property.value,
        property.demandScore || 70,
        property.investmentScore || 70,
        property.riskScore || 30
      ]);
      
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);
      
      // Fine-tune model with new data
      await this.model.fit(xs, ys, {
        epochs: 10,
        batchSize: 16,
        validationSplit: 0.1,
        shuffle: true
      });
      
      // Save updated model
      await this.model.save(`localstorage://heatmap_model`);
      
      // Clear cache to force regeneration
      this.heatmapData.clear();
      
      xs.dispose();
      ys.dispose();
      
      this.notifyListeners('model_updated', { dataPoints: newData.length });
      console.log(`Model updated with ${newData.length} new data points`);
      
    } catch (error) {
      console.error('Model update error:', error);
      this.notifyListeners('error', { error: error.message });
      throw error;
    }
  }

  // Get property predictions for specific location
  async getPredictionForLocation(latitude, longitude, propertyDetails = {}) {
    try {
      if (!this.isInitialized || !this.model) {
        throw new Error('Model not initialized');
      }
      
      const features = [[
        latitude,
        longitude,
        propertyDetails.type || 0,
        propertyDetails.size || 100,
        propertyDetails.age || 5,
        propertyDetails.amenitiesScore || 70
      ]];
      
      const prediction = await this.model.predict(tf.tensor2d(features));
      const result = await prediction.data();
      prediction.dispose();
      
      return {
        success: true,
        data: {
          latitude,
          longitude,
          value: result[0],
          demand: result[1],
          investment: result[2],
          risk: result[3],
          confidence: this.calculateConfidence(latitude, longitude),
          recommendation: this.generateRecommendation(result)
        }
      };
      
    } catch (error) {
      console.error('Location prediction error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Calculate prediction confidence based on data density
  calculateConfidence(latitude, longitude) {
    // Check proximity to known data points
    // This is a simplified confidence calculation
    const confidenceBase = 0.7;
    const locationFactor = this.isInPrimeArea(latitude, longitude) ? 0.2 : 0.1;
    return Math.min(0.95, confidenceBase + locationFactor);
  }

  // Check if location is in prime UAE area
  isInPrimeArea(latitude, longitude) {
    const primeAreas = [
      { center: [25.0760, 55.1302], radius: 0.02 }, // Dubai Marina
      { center: [25.2048, 55.2708], radius: 0.015 }, // Downtown Dubai
      { center: [24.4539, 54.3773], radius: 0.02 }, // Abu Dhabi Central
      { center: [25.1972, 55.2744], radius: 0.01 }, // DIFC
    ];
    
    return primeAreas.some(area => {
      const distance = this.calculateDistance(
        latitude, longitude,
        area.center[0], area.center[1]
      );
      return distance <= area.radius;
    });
  }

  // Calculate distance between two coordinates
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // Generate investment recommendation
  generateRecommendation(predictionResult) {
    const [value, demand, investment, risk] = predictionResult;
    
    if (investment > 80 && risk < 20) {
      return 'Excellent investment opportunity';
    } else if (investment > 60 && risk < 40) {
      return 'Good investment potential';
    } else if (investment > 40 && risk < 60) {
      return 'Moderate investment option';
    } else {
      return 'High risk investment';
    }
  }

  // Utility functions
  generateCacheKey(filters) {
    return JSON.stringify(filters);
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async loadCachedData() {
    try {
      const cached = await AsyncStorage.getItem('heatmap_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.heatmapData = new Map(data);
        console.log('Loaded cached heatmap data');
      }
    } catch (error) {
      console.log('No cached heatmap data found');
    }
  }

  async saveCacheData() {
    try {
      const data = Array.from(this.heatmapData.entries());
      await AsyncStorage.setItem('heatmap_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Cache save error:', error);
    }
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

  // Cleanup resources
  dispose() {
    if (this.model) {
      this.model.dispose();
    }
    this.heatmapData.clear();
    this.listeners = [];
    this.saveCacheData();
  }
}

// Create and export singleton instance
export const locationHeatmapService = new LocationHeatmapService();
export default locationHeatmapService;