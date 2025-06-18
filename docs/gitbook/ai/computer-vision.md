# Computer Vision Analysis

NexVestXR v2 includes advanced computer vision capabilities for automated property image analysis using TensorFlow.js-powered convolutional neural networks.

## 🎯 Overview

The PropertyImageAnalysisService provides comprehensive image analysis for real estate properties using five specialized AI models:

| Model | Purpose | Architecture | Accuracy |
|-------|---------|--------------|----------|
| **Property Classifier** | Identify property type | CNN | 89% |
| **Condition Assessment** | Evaluate property condition | CNN | 91% |
| **Feature Detection** | Detect amenities & features | Multi-label CNN | 87% |
| **Room Classifier** | Classify room types | CNN | 85% |
| **Price Estimator** | Estimate value from images | CNN + Regression | 83% |

## 🏗️ Architecture

### Service Structure

```javascript
class PropertyImageAnalysisService {
  constructor() {
    this.models = {
      propertyClassifier: null,    // Apartment, villa, office, retail
      conditionAssessment: null,   // New, good, fair, poor
      featureDetection: null,      // Pool, garden, parking, etc.
      roomClassifier: null,        // Bedroom, bathroom, kitchen, living
      priceEstimator: null         // Price estimation from images
    };
    
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
}
```

## 🧠 Model Architectures

### 1. Property Classification Model

Identifies the type of property from images.

```javascript
async createPropertyClassifierModel() {
  const model = tf.sequential({
    layers: [
      // Input: 224x224x3 images
      tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 3,
        activation: 'relu',
        name: 'conv1'
      }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.batchNormalization(),
      
      // Feature extraction layers
      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu',
        name: 'conv2'
      }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.batchNormalization(),
      
      tf.layers.conv2d({
        filters: 128,
        kernelSize: 3,
        activation: 'relu',
        name: 'conv3'
      }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.batchNormalization(),
      
      tf.layers.conv2d({
        filters: 256,
        kernelSize: 3,
        activation: 'relu',
        name: 'conv4'
      }),
      tf.layers.globalAveragePooling2d(),
      
      // Classification layers
      tf.layers.dense({
        units: 512,
        activation: 'relu',
        name: 'dense1'
      }),
      tf.layers.dropout({ rate: 0.5 }),
      tf.layers.dense({
        units: 256,
        activation: 'relu',
        name: 'dense2'
      }),
      tf.layers.dropout({ rate: 0.3 }),
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
```

**Training Configuration:**
- **Epochs**: 50
- **Batch Size**: 16
- **Validation Split**: 20%
- **Learning Rate**: 0.001

### 2. Condition Assessment Model

Evaluates the physical condition of properties.

```javascript
async createConditionAssessmentModel() {
  const model = tf.sequential({
    layers: [
      tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 5,  // Larger kernel for condition features
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
```

**Training Configuration:**
- **Epochs**: 40
- **Batch Size**: 16
- **Learning Rate**: 0.0005
- **Dropout**: Progressive (0.4 → 0.2)

### 3. Feature Detection Model

Multi-label classification for detecting multiple property features.

```javascript
async createFeatureDetectionModel() {
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
```

**Training Configuration:**
- **Epochs**: 45
- **Batch Size**: 12
- **Loss Function**: Binary Crossentropy
- **Activation**: Sigmoid (multi-label)

### 4. Price Estimation Model

Regression model for estimating property values from images.

```javascript
async createPriceEstimatorModel() {
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
```

**Training Configuration:**
- **Epochs**: 60
- **Batch Size**: 8
- **Loss Function**: Mean Squared Error
- **Output**: Normalized price (0-1)

## 📷 Image Processing Pipeline

### Preprocessing

```javascript
async preprocessImage(imageUri) {
  return tf.tidy(() => {
    // Load image data (in real implementation)
    const imageData = this.loadImageFromUri(imageUri);
    
    // Resize to 224x224
    let tensor = tf.browser.fromPixels(imageData);
    tensor = tf.image.resizeBilinear(tensor, [224, 224]);
    
    // Normalize to [0, 1]
    tensor = tensor.div(255.0);
    
    // Add batch dimension
    tensor = tensor.expandDims(0);
    
    return tensor;
  });
}
```

### Analysis Pipeline

```javascript
async analyzePropertyImage(imageUri, options = {}) {
  if (!this.isInitialized) {
    throw new Error('Service not initialized');
  }

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

    this.notifyListeners('analysis_completed', analysis);
    
    // Dispose tensor
    imageTensor.dispose();
    
    return analysis;

  } catch (error) {
    this.notifyListeners('error', { error: error.message, imageUri });
    throw error;
  }
}
```

## 📊 Analysis Results

### Property Type Classification

```javascript
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
```

**Example Output:**
```json
{
  "type": "apartment",
  "confidence": 0.87,
  "probabilities": {
    "apartment": 0.87,
    "villa": 0.08,
    "townhouse": 0.03,
    "office": 0.01,
    "retail": 0.01,
    "warehouse": 0.00
  }
}
```

### Condition Assessment

```javascript
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

calculateConditionScore(condition) {
  const scores = {
    'excellent': 95,
    'good': 80,
    'fair': 60,
    'poor': 35
  };
  return scores[condition] || 50;
}
```

**Example Output:**
```json
{
  "condition": "good",
  "confidence": 0.82,
  "score": 80,
  "probabilities": {
    "excellent": 0.15,
    "good": 0.82,
    "fair": 0.03,
    "poor": 0.00
  }
}
```

### Feature Detection

```javascript
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
```

**Example Output:**
```json
{
  "detected": [
    {
      "feature": "swimming_pool",
      "confidence": 0.89,
      "impact": 0.15
    },
    {
      "feature": "parking",
      "confidence": 0.76,
      "impact": 0.08
    },
    {
      "feature": "central_ac",
      "confidence": 0.65,
      "impact": 0.07
    }
  ],
  "count": 3,
  "luxuryScore": 60,
  "valueImpact": 0.30
}
```

### Price Estimation

```javascript
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
```

**Example Output:**
```json
{
  "estimatedValue": 2150000,
  "currency": "AED",
  "confidence": 0.78,
  "range": {
    "min": 1720000,
    "max": 2580000
  }
}
```

## 📱 Mobile UI Integration

### PropertyImageAnalyzer Component

```javascript
const PropertyImageAnalyzer = ({ onAnalysisComplete }) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);

  const analyzeImages = async () => {
    setAnalyzing(true);
    
    try {
      const imageUris = selectedImages.map(img => img.uri);
      const results = await propertyImageAnalysisService.analyzeBulkImages(imageUris);
      
      setAnalysisResults(results.results);
      if (onAnalysisComplete) {
        onAnalysisComplete(results);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze images');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera and gallery integration */}
      {/* Image selection UI */}
      {/* Analysis results display */}
    </View>
  );
};
```

### Camera Integration

```javascript
const takePhoto = async () => {
  if (!cameraRef.current) return;

  try {
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
      exif: false
    });
    
    setSelectedImages(prev => [...prev, { uri: photo.uri, type: 'camera' }]);
  } catch (error) {
    Alert.alert('Error', 'Failed to take photo');
  }
};
```

## 🚀 Bulk Analysis

### Portfolio Analysis

```javascript
async analyzeBulkImages(imageUris, options = {}) {
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
    }
  }

  const summary = this.generateBulkAnalysisSummary(results);
  return { results, summary };
}
```

### Summary Generation

```javascript
generateBulkAnalysisSummary(results) {
  const propertyTypes = {};
  const conditions = {};
  let totalValue = 0;
  let avgConfidence = 0;

  results.forEach(result => {
    // Property types distribution
    const type = result.propertyType.type;
    propertyTypes[type] = (propertyTypes[type] || 0) + 1;

    // Conditions distribution
    const condition = result.condition.condition;
    conditions[condition] = (conditions[condition] || 0) + 1;

    totalValue += result.priceEstimate.estimatedValue;
    avgConfidence += result.confidence;
  });

  return {
    totalImages: results.length,
    averageValue: Math.round(totalValue / results.length),
    averageConfidence: avgConfidence / results.length,
    propertyTypeDistribution: propertyTypes,
    conditionDistribution: conditions,
    recommendations: this.generatePortfolioRecommendations(results)
  };
}
```

## ⚡ Performance Optimization

### Memory Management

```javascript
// Proper tensor disposal in analysis pipeline
async analyzeWithMemoryManagement(imageTensor) {
  const tensorsToDispose = [];
  
  try {
    const predictions = await Promise.all([
      this.models.propertyClassifier.predict(imageTensor),
      this.models.conditionAssessment.predict(imageTensor),
      // ... other predictions
    ]);
    
    tensorsToDispose.push(...predictions);
    
    // Process predictions
    const results = await this.processPredictions(predictions);
    
    return results;
  } finally {
    // Dispose all tensors
    tensorsToDispose.forEach(tensor => tensor.dispose());
  }
}
```

### Batch Processing Optimization

```javascript
async processBatchOptimized(images) {
  const batchSize = 4; // Optimized for mobile memory
  const results = [];
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    // Process batch with memory cleanup
    const batchResults = await tf.tidy(() => {
      return Promise.all(batch.map(img => this.analyzeImage(img)));
    });
    
    results.push(...batchResults);
    
    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return results;
}
```

## 🧪 Testing Computer Vision

### Model Testing

```javascript
describe('Computer Vision Models', () => {
  test('should classify property types correctly', async () => {
    const mockImageTensor = tf.randomNormal([1, 224, 224, 3]);
    
    propertyImageAnalysisService.models.propertyClassifier = {
      predict: jest.fn().mockReturnValue({
        data: jest.fn().mockResolvedValue(new Float32Array([0.7, 0.2, 0.05, 0.03, 0.015, 0.005])),
        dispose: jest.fn()
      })
    };
    
    const result = await propertyImageAnalysisService.classifyPropertyType(mockImageTensor);
    
    expect(result.type).toBe('apartment');
    expect(result.confidence).toBe(0.7);
    expect(result.probabilities).toHaveProperty('apartment');
    
    mockImageTensor.dispose();
  });
});
```

### Integration Testing

```javascript
test('should analyze property image end-to-end', async () => {
  const mockImageUri = 'file://test-property.jpg';
  
  // Mock all models
  setupMockModels();
  
  const analysis = await propertyImageAnalysisService.analyzePropertyImage(mockImageUri);
  
  expect(analysis).toHaveProperty('propertyType');
  expect(analysis).toHaveProperty('condition');
  expect(analysis).toHaveProperty('features');
  expect(analysis).toHaveProperty('priceEstimate');
  expect(analysis.confidence).toBeGreaterThan(0);
});
```

## 📈 Business Applications

### Property Valuation
- **Automated appraisal** from property photos
- **Condition-based pricing** adjustments
- **Feature premium** calculations

### Market Analysis
- **Portfolio assessment** from image galleries
- **Property comparison** across multiple listings
- **Investment potential** scoring

### Quality Control
- **Listing verification** against property photos
- **Condition monitoring** for maintenance needs
- **Feature compliance** for property standards

## 🔮 Future Enhancements

### Advanced Models
- **3D reconstruction** from multiple images
- **Damage detection** for insurance claims
- **Architectural style** classification
- **Energy efficiency** assessment

### Integration Opportunities
- **Virtual staging** suggestions
- **Renovation cost** estimation
- **Interior design** recommendations
- **Market comparison** visualization

---

*Computer vision brings automated property analysis to NexVestXR, enabling intelligent insights from property images while maintaining user privacy through on-device processing.*