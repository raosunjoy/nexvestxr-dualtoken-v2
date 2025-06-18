import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Heatmap } from 'react-native-maps';
import { locationHeatmapService } from '../services/LocationHeatmapService';
import { Feather } from 'react-native-vector-icons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const LocationHeatmapView = ({ 
  filters = {},
  onLocationSelect = null,
  showFilters = true,
  style = {}
}) => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({
    propertyType: 0,
    size: 100,
    age: 5,
    amenitiesScore: 70,
    minValue: 5000,
    maxValue: 25000,
    maxPoints: 500,
    ...filters
  });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showPrediction, setShowPrediction] = useState(false);
  
  const mapRef = useRef(null);

  // UAE region bounds
  const uaeRegion = {
    latitude: 24.2,
    longitude: 54.0,
    latitudeDelta: 4.5,
    longitudeDelta: 4.5,
  };

  useEffect(() => {
    initializeService();
    return () => {
      locationHeatmapService.removeListener(handleServiceEvent);
    };
  }, []);

  useEffect(() => {
    if (initialized) {
      generateHeatmap();
    }
  }, [initialized, currentFilters]);

  const initializeService = () => {
    locationHeatmapService.addListener(handleServiceEvent);
    
    if (!locationHeatmapService.isInitialized) {
      setLoading(true);
    } else {
      setInitialized(true);
    }
  };

  const handleServiceEvent = (event, data) => {
    switch (event) {
      case 'initialized':
        setInitialized(true);
        setLoading(false);
        break;
        
      case 'heatmap_generation_started':
        setLoading(true);
        setProgress(0);
        break;
        
      case 'heatmap_progress':
        setProgress(data.progress);
        break;
        
      case 'heatmap_generation_completed':
        setLoading(false);
        setProgress(100);
        console.log(`Heatmap completed with ${data.pointCount} points`);
        break;
        
      case 'error':
        setLoading(false);
        Alert.alert('Error', data.error);
        break;
    }
  };

  const generateHeatmap = async () => {
    try {
      const points = await locationHeatmapService.generateHeatmap(currentFilters);
      setHeatmapData(points);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate heatmap');
      console.error('Heatmap generation error:', error);
    }
  };

  const handleMapPress = async (event) => {
    if (!onLocationSelect && !showPrediction) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    try {
      const prediction = await locationHeatmapService.getPredictionForLocation(
        latitude, 
        longitude, 
        {
          type: currentFilters.propertyType,
          size: currentFilters.size,
          age: currentFilters.age,
          amenitiesScore: currentFilters.amenitiesScore
        }
      );

      if (prediction.success) {
        setSelectedPoint({
          coordinate: { latitude, longitude },
          prediction: prediction.data
        });
        
        if (onLocationSelect) {
          onLocationSelect(prediction.data);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get location prediction');
    }
  };

  const formatValue = (value) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatScore = (score) => {
    return Math.round(score);
  };

  const getIntensityColor = (intensity) => {
    if (intensity > 0.8) return '#FF0000'; // High value - Red
    if (intensity > 0.6) return '#FF6600'; // Medium-high - Orange
    if (intensity > 0.4) return '#FFFF00'; // Medium - Yellow
    if (intensity > 0.2) return '#00FF00'; // Low-medium - Green
    return '#0000FF'; // Low value - Blue
  };

  const applyFilters = (newFilters) => {
    setCurrentFilters({ ...currentFilters, ...newFilters });
    setShowFiltersModal(false);
  };

  const resetFilters = () => {
    setCurrentFilters({
      propertyType: 0,
      size: 100,
      age: 5,
      amenitiesScore: 70,
      minValue: 5000,
      maxValue: 25000,
      maxPoints: 500
    });
  };

  if (!initialized) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2E86AB" />
        <Text style={styles.loadingText}>Initializing TensorFlow Model...</Text>
        <Text style={styles.subText}>This may take a moment</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header with filters */}
      {showFilters && (
        <View style={styles.header}>
          <Text style={styles.title}>UAE Property Heatmap</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFiltersModal(true)}
          >
            <Feather name="filter" size={20} color="#FFFFFF" />
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#2E86AB" />
            <Text style={styles.loadingText}>Generating Heatmap...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </View>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={uaeRegion}
        onPress={handleMapPress}
        mapType="satellite"
      >
        {/* Heatmap points */}
        {heatmapData.length > 0 && (
          <Heatmap
            points={heatmapData.map(point => ({
              latitude: point.latitude,
              longitude: point.longitude,
              weight: point.intensity
            }))}
            radius={20}
            opacity={0.7}
            gradient={{
              colors: ['#0000FF', '#00FF00', '#FFFF00', '#FF6600', '#FF0000'],
              startPoints: [0.2, 0.4, 0.6, 0.8, 1.0],
              colorMapSize: 256
            }}
          />
        )}

        {/* Selected point marker */}
        {selectedPoint && (
          <MapView.Marker
            coordinate={selectedPoint.coordinate}
            title="Prediction"
            description={`Value: ${formatValue(selectedPoint.prediction.value)}`}
          />
        )}
      </MapView>

      {/* Heatmap legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Property Value</Text>
        <LinearGradient
          colors={['#0000FF', '#00FF00', '#FFFF00', '#FF6600', '#FF0000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.legendGradient}
        />
        <View style={styles.legendLabels}>
          <Text style={styles.legendLabel}>Low</Text>
          <Text style={styles.legendLabel}>High</Text>
        </View>
      </View>

      {/* Stats panel */}
      <View style={styles.statsPanel}>
        <Text style={styles.statsTitle}>Heatmap Statistics</Text>
        <Text style={styles.statsText}>Points: {heatmapData.length}</Text>
        <Text style={styles.statsText}>
          Avg Value: {heatmapData.length > 0 ? 
            formatValue(heatmapData.reduce((sum, p) => sum + p.value, 0) / heatmapData.length) : 
            'N/A'
          }
        </Text>
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Heatmap Filters</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Property Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Property Type</Text>
                <View style={styles.propertyTypeButtons}>
                  {['Apartment', 'Villa', 'Commercial', 'Office', 'Retail'].map((type, index) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        currentFilters.propertyType === index && styles.typeButtonActive
                      ]}
                      onPress={() => setCurrentFilters({
                        ...currentFilters,
                        propertyType: index
                      })}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        currentFilters.propertyType === index && styles.typeButtonTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Value Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Value Range (AED per sqm)</Text>
                <Text style={styles.filterValue}>
                  {formatValue(currentFilters.minValue)} - {formatValue(currentFilters.maxValue)}
                </Text>
              </View>

              {/* Max Points Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Max Points: {currentFilters.maxPoints}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton]}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={() => applyFilters(currentFilters)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prediction Details Modal */}
      {selectedPoint && (
        <Modal
          visible={!!selectedPoint}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedPoint(null)}
        >
          <View style={styles.predictionOverlay}>
            <View style={styles.predictionContent}>
              <View style={styles.predictionHeader}>
                <Text style={styles.predictionTitle}>Location Analysis</Text>
                <TouchableOpacity onPress={() => setSelectedPoint(null)}>
                  <Feather name="x" size={20} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.predictionBody}>
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>Estimated Value:</Text>
                  <Text style={styles.predictionValue}>
                    {formatValue(selectedPoint.prediction.value)}/sqm
                  </Text>
                </View>
                
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>Demand Score:</Text>
                  <Text style={[styles.predictionValue, { color: '#4CAF50' }]}>
                    {formatScore(selectedPoint.prediction.demand)}/100
                  </Text>
                </View>
                
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>Investment Score:</Text>
                  <Text style={[styles.predictionValue, { color: '#2196F3' }]}>
                    {formatScore(selectedPoint.prediction.investment)}/100
                  </Text>
                </View>
                
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>Risk Score:</Text>
                  <Text style={[styles.predictionValue, { color: '#FF5722' }]}>
                    {formatScore(selectedPoint.prediction.risk)}/100
                  </Text>
                </View>
                
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>Confidence:</Text>
                  <Text style={styles.predictionValue}>
                    {Math.round(selectedPoint.prediction.confidence * 100)}%
                  </Text>
                </View>
                
                <View style={styles.recommendationContainer}>
                  <Text style={styles.recommendationLabel}>Recommendation:</Text>
                  <Text style={styles.recommendationText}>
                    {selectedPoint.prediction.recommendation}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2E86AB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  progressBar: {
    width: 150,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E86AB',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  legend: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  legendGradient: {
    width: 80,
    height: 8,
    borderRadius: 4,
  },
  legendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: '#666',
  },
  statsPanel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterValue: {
    fontSize: 14,
    color: '#666',
  },
  propertyTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginBottom: 8,
  },
  typeButtonActive: {
    backgroundColor: '#2E86AB',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  resetButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#2E86AB',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  predictionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  predictionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  predictionBody: {
    padding: 16,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionLabel: {
    fontSize: 14,
    color: '#666',
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recommendationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  recommendationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default LocationHeatmapView;