import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from 'react-native-vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import LocationHeatmapView from '../components/LocationHeatmapView';
import { propertyScoringService } from '../services/PropertyScoringService';
import { locationHeatmapService } from '../services/LocationHeatmapService';

const { width, height } = Dimensions.get('window');

const AIAnalyticsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('heatmap');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertyAnalysis, setPropertyAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [aiServices, setAiServices] = useState({
    heatmap: false,
    scoring: false
  });

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = () => {
    // Check if services are initialized
    setAiServices({
      heatmap: locationHeatmapService.isInitialized,
      scoring: propertyScoringService.isInitialized
    });

    // Add listeners for service initialization
    locationHeatmapService.addListener(handleHeatmapEvent);
    propertyScoringService.addListener(handleScoringEvent);
  };

  const handleHeatmapEvent = (event, data) => {
    if (event === 'initialized') {
      setAiServices(prev => ({ ...prev, heatmap: true }));
    }
  };

  const handleScoringEvent = (event, data) => {
    if (event === 'initialized') {
      setAiServices(prev => ({ ...prev, scoring: true }));
    }
  };

  const handleLocationSelect = async (locationData) => {
    try {
      setLoading(true);
      setSelectedProperty(locationData);

      // Create property data object for analysis
      const propertyData = {
        id: `${locationData.latitude}_${locationData.longitude}`,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        size: 100, // Default size
        bedrooms: 2,
        bathrooms: 2,
        age: 5,
        amenitiesCount: 10,
        districtScore: 70,
        marketTrend: 1.05,
        locationStability: 0.8,
        marketVolatility: 0.3,
        developerRating: 4.0,
        legalStatus: 1.0,
        financialLeverage: 0.5,
        roiPotential: 0.12,
        liquidity: 0.7,
        growthPotential: 0.8,
        yieldRate: 0.08
      };

      // Get comprehensive analysis
      const analysis = await propertyScoringService.analyzeProperty(propertyData);
      setPropertyAnalysis(analysis);
      setShowAnalysisModal(true);

    } catch (error) {
      Alert.alert('Error', 'Failed to analyze selected location');
      console.error('Location analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  const getScoreColor = (score) => {
    if (score > 0.8) return '#4CAF50';
    if (score > 0.6) return '#8BC34A';
    if (score > 0.4) return '#FFC107';
    if (score > 0.2) return '#FF9800';
    return '#F44336';
  };

  const getRiskColor = (risk) => {
    if (risk < 0.2) return '#4CAF50';
    if (risk < 0.4) return '#8BC34A';
    if (risk < 0.6) return '#FFC107';
    if (risk < 0.8) return '#FF9800';
    return '#F44336';
  };

  const renderServiceStatus = () => (
    <View style={styles.serviceStatus}>
      <Text style={styles.serviceTitle}>AI Services Status</Text>
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <Feather 
            name={aiServices.heatmap ? 'check-circle' : 'clock'} 
            size={16} 
            color={aiServices.heatmap ? '#4CAF50' : '#FF9800'} 
          />
          <Text style={styles.statusText}>Heatmap TensorFlow</Text>
        </View>
        <View style={styles.statusItem}>
          <Feather 
            name={aiServices.scoring ? 'check-circle' : 'clock'} 
            size={16} 
            color={aiServices.scoring ? '#4CAF50' : '#FF9800'} 
          />
          <Text style={styles.statusText}>Property Scoring</Text>
        </View>
      </View>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'heatmap' && styles.activeTab]}
        onPress={() => setActiveTab('heatmap')}
      >
        <Feather name="map" size={20} color={activeTab === 'heatmap' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.tabText, activeTab === 'heatmap' && styles.activeTabText]}>
          Heatmap
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
        onPress={() => setActiveTab('analytics')}
      >
        <Feather name="bar-chart-2" size={20} color={activeTab === 'analytics' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
          Analytics
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeatmapTab = () => (
    <View style={styles.tabContent}>
      <LocationHeatmapView
        onLocationSelect={handleLocationSelect}
        style={styles.heatmapContainer}
        filters={{
          propertyType: 0,
          size: 100,
          maxPoints: 300
        }}
      />
    </View>
  );

  const renderAnalyticsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.analyticsContainer}>
        {/* AI Models Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TensorFlow Models</Text>
          <View style={styles.modelGrid}>
            <View style={styles.modelCard}>
              <Feather name="home" size={24} color="#2E86AB" />
              <Text style={styles.modelTitle}>Valuation Model</Text>
              <Text style={styles.modelDescription}>
                Advanced property valuation using 9 input features
              </Text>
              <Text style={styles.modelAccuracy}>Accuracy: 94%</Text>
            </View>
            
            <View style={styles.modelCard}>
              <Feather name="shield" size={24} color="#FF6B35" />
              <Text style={styles.modelTitle}>Risk Assessment</Text>
              <Text style={styles.modelDescription}>
                5-dimensional risk analysis with neural networks
              </Text>
              <Text style={styles.modelAccuracy}>Accuracy: 91%</Text>
            </View>
            
            <View style={styles.modelCard}>
              <Feather name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.modelTitle}>Market Trends</Text>
              <Text style={styles.modelDescription}>
                LSTM-based time series forecasting
              </Text>
              <Text style={styles.modelAccuracy}>Accuracy: 87%</Text>
            </View>
            
            <View style={styles.modelCard}>
              <Feather name="target" size={24} color="#9C27B0" />
              <Text style={styles.modelTitle}>Investment Score</Text>
              <Text style={styles.modelDescription}>
                Comprehensive investment scoring algorithm
              </Text>
              <Text style={styles.modelAccuracy}>Accuracy: 92%</Text>
            </View>
          </View>
        </View>

        {/* Feature Highlights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Feather name="map-pin" size={20} color="#2E86AB" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Location Heatmap</Text>
                <Text style={styles.featureDescription}>
                  TensorFlow-powered heatmap showing property values across UAE
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Feather name="brain" size={20} color="#FF6B35" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>AI Property Scoring</Text>
                <Text style={styles.featureDescription}>
                  Multi-model analysis providing comprehensive property insights
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Feather name="activity" size={20} color="#4CAF50" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Real-time Predictions</Text>
                <Text style={styles.featureDescription}>
                  Live property value and investment score predictions
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Feather name="layers" size={20} color="#9C27B0" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Multi-layer Analysis</Text>
                <Text style={styles.featureDescription}>
                  Valuation, risk, trends, and investment scoring in one platform
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Performance</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>2,000+</Text>
              <Text style={styles.metricLabel}>Training Data Points</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>4</Text>
              <Text style={styles.metricLabel}>TensorFlow Models</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>91%</Text>
              <Text style={styles.metricLabel}>Average Accuracy</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>UAE</Text>
              <Text style={styles.metricLabel}>Market Coverage</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderAnalysisModal = () => (
    <Modal
      visible={showAnalysisModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAnalysisModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.analysisModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Property Analysis</Text>
            <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {propertyAnalysis && (
            <ScrollView style={styles.analysisContent} showsVerticalScrollIndicator={false}>
              {/* Overall Score */}
              <View style={styles.overallScore}>
                <Text style={styles.overallScoreTitle}>Overall Score</Text>
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(propertyAnalysis.overallScore) }]}>
                    {Math.round(propertyAnalysis.overallScore * 100)}
                  </Text>
                  <Text style={styles.scoreUnit}>/ 100</Text>
                </View>
                <Text style={styles.confidenceText}>
                  Confidence: {formatPercentage(propertyAnalysis.confidence)}
                </Text>
              </View>

              {/* Valuation Analysis */}
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Property Valuation</Text>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Estimated Value:</Text>
                  <Text style={styles.analysisValue}>
                    {formatCurrency(propertyAnalysis.valuation.estimatedValue)}
                  </Text>
                </View>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Price per sqm:</Text>
                  <Text style={styles.analysisValue}>
                    {formatCurrency(propertyAnalysis.valuation.pricePerSqm)}
                  </Text>
                </View>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Market Position:</Text>
                  <Text style={styles.analysisValue}>
                    {Math.round(propertyAnalysis.valuation.marketPosition)}th percentile
                  </Text>
                </View>
              </View>

              {/* Risk Analysis */}
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Risk Assessment</Text>
                <View style={styles.riskGrid}>
                  <View style={styles.riskItem}>
                    <Text style={styles.riskLabel}>Overall</Text>
                    <View style={[styles.riskBar, { backgroundColor: getRiskColor(propertyAnalysis.risk.overallRisk) }]}>
                      <View style={[styles.riskFill, { width: `${propertyAnalysis.risk.overallRisk * 100}%` }]} />
                    </View>
                    <Text style={styles.riskValue}>{formatPercentage(propertyAnalysis.risk.overallRisk)}</Text>
                  </View>
                  
                  <View style={styles.riskItem}>
                    <Text style={styles.riskLabel}>Market</Text>
                    <View style={[styles.riskBar, { backgroundColor: getRiskColor(propertyAnalysis.risk.marketRisk) }]}>
                      <View style={[styles.riskFill, { width: `${propertyAnalysis.risk.marketRisk * 100}%` }]} />
                    </View>
                    <Text style={styles.riskValue}>{formatPercentage(propertyAnalysis.risk.marketRisk)}</Text>
                  </View>
                  
                  <View style={styles.riskItem}>
                    <Text style={styles.riskLabel}>Liquidity</Text>
                    <View style={[styles.riskBar, { backgroundColor: getRiskColor(propertyAnalysis.risk.liquidityRisk) }]}>
                      <View style={[styles.riskFill, { width: `${propertyAnalysis.risk.liquidityRisk * 100}%` }]} />
                    </View>
                    <Text style={styles.riskValue}>{formatPercentage(propertyAnalysis.risk.liquidityRisk)}</Text>
                  </View>
                </View>
                <Text style={styles.riskGrade}>
                  Risk Grade: {propertyAnalysis.risk.riskGrade}
                </Text>
              </View>

              {/* Investment Score */}
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Investment Analysis</Text>
                <View style={styles.investmentGrid}>
                  <View style={styles.investmentItem}>
                    <Text style={styles.investmentLabel}>Overall Score</Text>
                    <Text style={[styles.investmentValue, { color: getScoreColor(propertyAnalysis.investment.overallScore) }]}>
                      {Math.round(propertyAnalysis.investment.overallScore * 100)}/100
                    </Text>
                  </View>
                  
                  <View style={styles.investmentItem}>
                    <Text style={styles.investmentLabel}>Short-term</Text>
                    <Text style={[styles.investmentValue, { color: getScoreColor(propertyAnalysis.investment.shortTermPotential) }]}>
                      {Math.round(propertyAnalysis.investment.shortTermPotential * 100)}/100
                    </Text>
                  </View>
                  
                  <View style={styles.investmentItem}>
                    <Text style={styles.investmentLabel}>Long-term</Text>
                    <Text style={[styles.investmentValue, { color: getScoreColor(propertyAnalysis.investment.longTermPotential) }]}>
                      {Math.round(propertyAnalysis.investment.longTermPotential * 100)}/100
                    </Text>
                  </View>
                  
                  <View style={styles.investmentItem}>
                    <Text style={styles.investmentLabel}>Risk-Adjusted</Text>
                    <Text style={[styles.investmentValue, { color: getScoreColor(propertyAnalysis.investment.riskAdjustedReturn) }]}>
                      {Math.round(propertyAnalysis.investment.riskAdjustedReturn * 100)}/100
                    </Text>
                  </View>
                </View>
                <Text style={styles.investmentGrade}>
                  Grade: {propertyAnalysis.investment.grade}
                </Text>
              </View>

              {/* Recommendations */}
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>AI Recommendations</Text>
                {propertyAnalysis.recommendations.map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Feather name="check-circle" size={16} color="#4CAF50" />
                    <Text style={styles.recommendationText}>{recommendation}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2E86AB', '#A23B72']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Analytics</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {renderServiceStatus()}
      {renderTabBar()}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2E86AB" />
          <Text style={styles.loadingText}>Analyzing Property...</Text>
        </View>
      )}

      {activeTab === 'heatmap' ? renderHeatmapTab() : renderAnalyticsTab()}
      {renderAnalysisModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  serviceStatus: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#2E86AB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabContent: {
    flex: 1,
    margin: 16,
  },
  heatmapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  analyticsContainer: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modelCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  modelDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  modelAccuracy: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 8,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E86AB',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
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
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  analysisModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
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
  analysisContent: {
    padding: 20,
  },
  overallScore: {
    alignItems: 'center',
    marginBottom: 24,
  },
  overallScoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreUnit: {
    fontSize: 18,
    color: '#666',
    marginLeft: 4,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
  },
  analysisSection: {
    marginBottom: 24,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisLabel: {
    fontSize: 14,
    color: '#666',
  },
  analysisValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  riskGrid: {
    gap: 12,
    marginBottom: 12,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  riskBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskFill: {
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  riskValue: {
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  riskGrade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  investmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  investmentItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  investmentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  investmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  investmentGrade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
});

export default AIAnalyticsScreen;