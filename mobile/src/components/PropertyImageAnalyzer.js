import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  StyleSheet
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { propertyImageAnalysisService } from '../services/PropertyImageAnalysisService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PropertyImageAnalyzer = ({ onAnalysisComplete, style }) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [initializingService, setInitializingService] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const cameraRef = useRef(null);

  useEffect(() => {
    initializeService();
    requestPermissions();
  }, []);

  const initializeService = async () => {
    if (propertyImageAnalysisService.isInitialized) {
      setServiceInitialized(true);
      return;
    }

    setInitializingService(true);
    
    const listener = (event, data) => {
      switch (event) {
        case 'initialized':
          setServiceInitialized(true);
          setInitializingService(false);
          break;
        case 'training_progress':
          console.log(`Training ${data.model}: ${data.epoch}/${data.totalEpochs}`);
          break;
        case 'error':
          Alert.alert('Initialization Error', data.error);
          setInitializingService(false);
          break;
      }
    };

    propertyImageAnalysisService.addListener(listener);

    try {
      await propertyImageAnalysisService.initialize();
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize image analysis service');
      setInitializingService(false);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and gallery access are required for image analysis');
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false
      });
      
      setSelectedImages(prev => [...prev, { uri: photo.uri, type: 'camera' }]);
      setShowCamera(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3]
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'gallery'
        }));
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select images to analyze');
      return;
    }

    if (!serviceInitialized) {
      Alert.alert('Service Not Ready', 'Image analysis service is still initializing');
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(0);

    const listener = (event, data) => {
      switch (event) {
        case 'bulk_progress':
          setAnalysisProgress(data.progress);
          break;
        case 'bulk_analysis_completed':
          setAnalysisResults(data.results);
          setAnalyzing(false);
          setShowResults(true);
          if (onAnalysisComplete) {
            onAnalysisComplete(data);
          }
          break;
        case 'error':
          Alert.alert('Analysis Error', data.error);
          setAnalyzing(false);
          break;
      }
    };

    propertyImageAnalysisService.addListener(listener);

    try {
      const imageUris = selectedImages.map(img => img.uri);
      await propertyImageAnalysisService.analyzeBulkImages(imageUris, {
        batchSize: 3
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze images');
      setAnalyzing(false);
    }
  };

  const renderImageItem = ({ item, index }) => (
    <View style={styles.imageItem}>
      <Image source={{ uri: item.uri }} style={styles.selectedImage} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeImage(index)}
      >
        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  const renderAnalysisResult = ({ item, index }) => (
    <View style={styles.resultItem}>
      <Image source={{ uri: item.imageUri }} style={styles.resultImage} />
      <View style={styles.resultDetails}>
        <Text style={styles.resultTitle}>Analysis #{index + 1}</Text>
        
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Property Type:</Text>
          <Text style={styles.resultValue}>
            {item.propertyType.type} ({Math.round(item.propertyType.confidence * 100)}%)
          </Text>
        </View>
        
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Condition:</Text>
          <Text style={[styles.resultValue, { color: getConditionColor(item.condition.condition) }]}>
            {item.condition.condition} ({item.condition.score}/100)
          </Text>
        </View>
        
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Room Type:</Text>
          <Text style={styles.resultValue}>
            {item.roomType.roomType} ({Math.round(item.roomType.confidence * 100)}%)
          </Text>
        </View>
        
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Estimated Value:</Text>
          <Text style={styles.priceValue}>
            AED {item.priceEstimate.estimatedValue.toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Features Detected:</Text>
          <Text style={styles.resultValue}>{item.features.detected.length}</Text>
        </View>
        
        <View style={styles.featuresContainer}>
          {item.features.detected.slice(0, 3).map((feature, idx) => (
            <View key={idx} style={styles.featureTag}>
              <Text style={styles.featureText}>
                {feature.feature.replace('_', ' ')}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.confidenceBar}>
          <Text style={styles.confidenceLabel}>
            Confidence: {Math.round(item.confidence * 100)}%
          </Text>
          <View style={styles.confidenceBarContainer}>
            <View 
              style={[
                styles.confidenceBarFill, 
                { width: `${item.confidence * 100}%` }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#666';
    }
  };

  if (initializingService) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.initializingText}>
          Initializing AI Image Analysis...
        </Text>
        <Text style={styles.initializingSubtext}>
          Training computer vision models for UAE properties
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Property Image Analysis</Text>
        <Text style={styles.subtitle}>
          AI-powered analysis of property images
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCamera(true)}
        >
          <Ionicons name="camera" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={pickImages}
        >
          <Ionicons name="images" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Select Images</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Images */}
      {selectedImages.length > 0 && (
        <View style={styles.selectedImagesContainer}>
          <Text style={styles.sectionTitle}>
            Selected Images ({selectedImages.length})
          </Text>
          <FlatList
            data={selectedImages}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesList}
          />
        </View>
      )}

      {/* Analyze Button */}
      {selectedImages.length > 0 && (
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            (!serviceInitialized || analyzing) && styles.disabledButton
          ]}
          onPress={analyzeImages}
          disabled={!serviceInitialized || analyzing}
        >
          {analyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.analyzingText}>
                Analyzing... {Math.round(analysisProgress)}%
              </Text>
            </View>
          ) : (
            <>
              <Ionicons name="analytics" size={24} color="#FFF" />
              <Text style={styles.analyzeButtonText}>
                Analyze {selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Results Button */}
      {analysisResults.length > 0 && (
        <TouchableOpacity
          style={styles.resultsButton}
          onPress={() => setShowResults(true)}
        >
          <Ionicons name="document-text" size={24} color="#007AFF" />
          <Text style={styles.resultsButtonText}>
            View Analysis Results ({analysisResults.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={Camera.Constants.Type.back}
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <View style={styles.cameraButton} />
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal visible={showResults} animationType="slide">
        <View style={styles.resultsModal}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Analysis Results</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResults(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={analysisResults}
            renderItem={renderAnalysisResult}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  initializingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  initializingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedImagesContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  imagesList: {
    height: 120,
  },
  imageItem: {
    marginRight: 15,
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 10,
    gap: 10,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  analyzeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyzingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  resultsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
  },
  resultsModal: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  resultsList: {
    padding: 20,
  },
  resultItem: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#E5E5E5',
  },
  resultDetails: {
    padding: 15,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
    flex: 1,
    textAlign: 'right',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  featureTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  featureText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  confidenceBar: {
    marginTop: 10,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  confidenceBarContainer: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
});

export default PropertyImageAnalyzer;