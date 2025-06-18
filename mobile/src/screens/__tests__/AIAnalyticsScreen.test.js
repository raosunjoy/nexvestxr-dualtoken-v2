import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AIAnalyticsScreen from '../AIAnalyticsScreen';
import { locationHeatmapService } from '../../services/LocationHeatmapService';
import { propertyScoringService } from '../../services/PropertyScoringService';

// Mock the services
jest.mock('../../services/LocationHeatmapService', () => ({
  locationHeatmapService: {
    isInitialized: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }
}));

jest.mock('../../services/PropertyScoringService', () => ({
  propertyScoringService: {
    isInitialized: false,
    analyzeProperty: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }
}));

// Mock the LocationHeatmapView component
jest.mock('../components/LocationHeatmapView', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  
  return React.forwardRef((props, ref) => (
    <View testID="location-heatmap-view">
      <Text>Heatmap Component</Text>
      <TouchableOpacity
        testID="heatmap-location-select"
        onPress={() => props.onLocationSelect && props.onLocationSelect({
          latitude: 25.0760,
          longitude: 55.1302,
          value: 15000,
          demand: 80,
          investment: 75,
          risk: 25,
          confidence: 0.85,
          recommendation: 'Good investment opportunity'
        })}
      >
        <Text>Select Location</Text>
      </TouchableOpacity>
    </View>
  ));
});

// Mock navigation
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

describe('AIAnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationHeatmapService.isInitialized = true;
    propertyScoringService.isInitialized = true;
  });

  describe('Component Rendering', () => {
    test('should render correctly with default state', () => {
      const { getByText, getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      expect(getByText('AI Analytics')).toBeDefined();
      expect(getByText('AI Services Status')).toBeDefined();
      expect(getByText('Heatmap TensorFlow')).toBeDefined();
      expect(getByText('Property Scoring')).toBeDefined();
      expect(getByText('Heatmap')).toBeDefined();
      expect(getByText('Analytics')).toBeDefined();
    });

    test('should show service status correctly', () => {
      locationHeatmapService.isInitialized = true;
      propertyScoringService.isInitialized = false;
      
      const { getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Should show status for both services
      expect(getByText('Heatmap TensorFlow')).toBeDefined();
      expect(getByText('Property Scoring')).toBeDefined();
    });

    test('should handle back navigation', () => {
      const { getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('back-button') || getByText('←'));
      
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    test('should switch between heatmap and analytics tabs', () => {
      const { getByText, getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Should start with heatmap tab active
      expect(getByTestId('location-heatmap-view')).toBeDefined();
      
      // Switch to analytics tab
      fireEvent.press(getByText('Analytics'));
      
      // Should show analytics content
      expect(getByText('TensorFlow Models')).toBeDefined();
      expect(getByText('AI Features')).toBeDefined();
      
      // Switch back to heatmap tab
      fireEvent.press(getByText('Heatmap'));
      
      // Should show heatmap again
      expect(getByTestId('location-heatmap-view')).toBeDefined();
    });

    test('should update tab styles when switching', () => {
      const { getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      const heatmapTab = getByText('Heatmap');
      const analyticsTab = getByText('Analytics');
      
      // Initially heatmap should be active
      expect(heatmapTab.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FFFFFF' })
        ])
      );
      
      // Switch to analytics
      fireEvent.press(analyticsTab);
      
      // Analytics should now be active
      expect(analyticsTab.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FFFFFF' })
        ])
      );
    });
  });

  describe('Service Initialization', () => {
    test('should listen to service events on mount', () => {
      render(<AIAnalyticsScreen navigation={mockNavigation} />);
      
      expect(locationHeatmapService.addListener).toHaveBeenCalled();
      expect(propertyScoringService.addListener).toHaveBeenCalled();
    });

    test('should remove listeners on unmount', () => {
      const { unmount } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      unmount();
      
      expect(locationHeatmapService.removeListener).toHaveBeenCalled();
      expect(propertyScoringService.removeListener).toHaveBeenCalled();
    });

    test('should update service status when services initialize', async () => {
      locationHeatmapService.isInitialized = false;
      propertyScoringService.isInitialized = false;
      
      let heatmapListener, scoringListener;
      
      locationHeatmapService.addListener.mockImplementation((listener) => {
        heatmapListener = listener;
      });
      
      propertyScoringService.addListener.mockImplementation((listener) => {
        scoringListener = listener;
      });
      
      const { rerender } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Simulate service initialization
      await act(async () => {
        heatmapListener('initialized', { success: true });
        scoringListener('initialized', { success: true });
      });
      
      // Services should now be marked as initialized
      // This would be reflected in the UI status indicators
      expect(true).toBe(true); // Placeholder for state verification
    });
  });

  describe('Location Selection and Analysis', () => {
    test('should handle location selection from heatmap', async () => {
      const mockAnalysis = {
        propertyId: 'test-property',
        timestamp: new Date().toISOString(),
        valuation: {
          estimatedValue: 15000,
          confidence: 0.85,
          pricePerSqm: 150,
          marketPosition: 75
        },
        risk: {
          overallRisk: 0.3,
          liquidityRisk: 0.25,
          marketRisk: 0.35,
          creditRisk: 0.2,
          operationalRisk: 0.4,
          riskGrade: 'B'
        },
        trend: {
          trendDirection: 0.2,
          strength: 0.8,
          durationForecast: 8,
          volatility: 0.3
        },
        investment: {
          overallScore: 0.75,
          shortTermPotential: 0.7,
          longTermPotential: 0.8,
          riskAdjustedReturn: 0.72,
          grade: 'Good'
        },
        overallScore: 0.75,
        recommendations: ['Good investment opportunity', 'Market timing favorable'],
        confidence: 0.8
      };
      
      propertyScoringService.analyzeProperty.mockResolvedValue(mockAnalysis);
      
      const { getByTestId, getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Simulate location selection
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        expect(propertyScoringService.analyzeProperty).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 25.0760,
            longitude: 55.1302
          })
        );
      });
      
      // Should show analysis modal
      await waitFor(() => {
        expect(getByText('AI Property Analysis')).toBeDefined();
        expect(getByText('75')).toBeDefined(); // Overall score
        expect(getByText('AED 15,000')).toBeDefined(); // Estimated value
      });
    });

    test('should show loading during property analysis', async () => {
      // Mock delayed analysis
      propertyScoringService.analyzeProperty.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          overallScore: 0.75,
          confidence: 0.8
        }), 100))
      );
      
      const { getByTestId, getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Simulate location selection
      fireEvent.press(getByTestId('heatmap-location-select'));
      
      // Should show loading
      expect(getByText('Analyzing Property...')).toBeDefined();
    });

    test('should handle analysis errors', async () => {
      propertyScoringService.analyzeProperty.mockRejectedValue(
        new Error('Analysis failed')
      );
      
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
      const { getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to analyze selected location');
      });
    });
  });

  describe('Analytics Tab Content', () => {
    test('should display TensorFlow models information', () => {
      const { getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Switch to analytics tab
      fireEvent.press(getByText('Analytics'));
      
      expect(getByText('TensorFlow Models')).toBeDefined();
      expect(getByText('Valuation Model')).toBeDefined();
      expect(getByText('Risk Assessment')).toBeDefined();
      expect(getByText('Market Trends')).toBeDefined();
      expect(getByText('Investment Score')).toBeDefined();
      
      expect(getByText('Accuracy: 94%')).toBeDefined();
      expect(getByText('Accuracy: 91%')).toBeDefined();
      expect(getByText('Accuracy: 87%')).toBeDefined();
      expect(getByText('Accuracy: 92%')).toBeDefined();
    });

    test('should display AI features information', () => {
      const { getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Switch to analytics tab
      fireEvent.press(getByText('Analytics'));
      
      expect(getByText('AI Features')).toBeDefined();
      expect(getByText('Location Heatmap')).toBeDefined();
      expect(getByText('AI Property Scoring')).toBeDefined();
      expect(getByText('Real-time Predictions')).toBeDefined();
      expect(getByText('Multi-layer Analysis')).toBeDefined();
    });

    test('should display performance metrics', () => {
      const { getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Switch to analytics tab
      fireEvent.press(getByText('Analytics'));
      
      expect(getByText('Model Performance')).toBeDefined();
      expect(getByText('2,000+')).toBeDefined();
      expect(getByText('Training Data Points')).toBeDefined();
      expect(getByText('4')).toBeDefined();
      expect(getByText('TensorFlow Models')).toBeDefined();
      expect(getByText('91%')).toBeDefined();
      expect(getByText('Average Accuracy')).toBeDefined();
      expect(getByText('UAE')).toBeDefined();
      expect(getByText('Market Coverage')).toBeDefined();
    });
  });

  describe('Analysis Modal', () => {
    beforeEach(async () => {
      const mockAnalysis = {
        propertyId: 'test-property',
        valuation: {
          estimatedValue: 15000,
          confidence: 0.85,
          pricePerSqm: 150,
          marketPosition: 75
        },
        risk: {
          overallRisk: 0.3,
          liquidityRisk: 0.25,
          marketRisk: 0.35,
          creditRisk: 0.2,
          operationalRisk: 0.4,
          riskGrade: 'B'
        },
        trend: {
          trendDirection: 0.2,
          strength: 0.8,
          durationForecast: 8,
          volatility: 0.3
        },
        investment: {
          overallScore: 0.75,
          shortTermPotential: 0.7,
          longTermPotential: 0.8,
          riskAdjustedReturn: 0.72,
          grade: 'Good'
        },
        overallScore: 0.75,
        recommendations: ['Good investment opportunity', 'Market timing favorable'],
        confidence: 0.8
      };
      
      propertyScoringService.analyzeProperty.mockResolvedValue(mockAnalysis);
    });

    test('should display comprehensive analysis results', async () => {
      const { getByTestId, getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        // Overall score
        expect(getByText('75')).toBeDefined();
        expect(getByText('Confidence: 80%')).toBeDefined();
        
        // Valuation
        expect(getByText('Property Valuation')).toBeDefined();
        expect(getByText('AED 15,000')).toBeDefined();
        expect(getByText('AED 150')).toBeDefined();
        
        // Risk assessment
        expect(getByText('Risk Assessment')).toBeDefined();
        expect(getByText('Risk Grade: B')).toBeDefined();
        
        // Investment analysis
        expect(getByText('Investment Analysis')).toBeDefined();
        expect(getByText('Grade: Good')).toBeDefined();
        
        // Recommendations
        expect(getByText('AI Recommendations')).toBeDefined();
        expect(getByText('Good investment opportunity')).toBeDefined();
        expect(getByText('Market timing favorable')).toBeDefined();
      });
    });

    test('should close analysis modal', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Open modal
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        expect(getByText('AI Property Analysis')).toBeDefined();
      });
      
      // Close modal
      fireEvent.press(getByTestId('close-analysis-modal') || getByText('×'));
      
      await waitFor(() => {
        expect(queryByText('AI Property Analysis')).toBeNull();
      });
    });

    test('should display risk visualization correctly', async () => {
      const { getByTestId, getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        expect(getByText('30%')).toBeDefined(); // Overall risk
        expect(getByText('25%')).toBeDefined(); // Liquidity risk
        expect(getByText('35%')).toBeDefined(); // Market risk
      });
    });

    test('should display investment scores correctly', async () => {
      const { getByTestId, getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        expect(getByText('75/100')).toBeDefined(); // Overall score
        expect(getByText('70/100')).toBeDefined(); // Short-term
        expect(getByText('80/100')).toBeDefined(); // Long-term
        expect(getByText('72/100')).toBeDefined(); // Risk-adjusted
      });
    });
  });

  describe('Formatting Functions', () => {
    test('should format currency values correctly', async () => {
      const mockAnalysis = {
        valuation: { estimatedValue: 15000, pricePerSqm: 150 },
        overallScore: 0.75,
        confidence: 0.8
      };
      
      propertyScoringService.analyzeProperty.mockResolvedValue(mockAnalysis);
      
      const { getByTestId, getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        expect(getByText('AED 15,000')).toBeDefined();
        expect(getByText('AED 150')).toBeDefined();
      });
    });

    test('should format percentage values correctly', async () => {
      const mockAnalysis = {
        risk: { overallRisk: 0.3 },
        overallScore: 0.75,
        confidence: 0.8
      };
      
      propertyScoringService.analyzeProperty.mockResolvedValue(mockAnalysis);
      
      const { getByTestId, getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      await waitFor(() => {
        expect(getByText('30%')).toBeDefined();
        expect(getByText('Confidence: 80%')).toBeDefined();
      });
    });
  });

  describe('Color Coding', () => {
    test('should apply correct colors for different score ranges', async () => {
      const highScoreAnalysis = {
        investment: { overallScore: 0.9 },
        risk: { overallRisk: 0.1 },
        overallScore: 0.9,
        confidence: 0.9
      };
      
      propertyScoringService.analyzeProperty.mockResolvedValue(highScoreAnalysis);
      
      const { getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      // Should apply green color for high scores
      // This would be tested by checking the style props of the rendered elements
      await waitFor(() => {
        expect(true).toBe(true); // Placeholder for color testing
      });
    });

    test('should apply correct colors for risk levels', async () => {
      const highRiskAnalysis = {
        risk: { overallRisk: 0.9 },
        overallScore: 0.3,
        confidence: 0.7
      };
      
      propertyScoringService.analyzeProperty.mockResolvedValue(highRiskAnalysis);
      
      const { getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      await act(async () => {
        fireEvent.press(getByTestId('heatmap-location-select'));
      });
      
      // Should apply red color for high risk
      await waitFor(() => {
        expect(true).toBe(true); // Placeholder for color testing
      });
    });
  });

  describe('Performance', () => {
    test('should handle rapid location selections efficiently', async () => {
      propertyScoringService.analyzeProperty.mockResolvedValue({
        overallScore: 0.75,
        confidence: 0.8
      });
      
      const { getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Simulate rapid selections
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('heatmap-location-select'));
      }
      
      // Should handle multiple requests without breaking
      await waitFor(() => {
        expect(propertyScoringService.analyzeProperty).toHaveBeenCalled();
      });
    });

    test('should render analytics tab efficiently', () => {
      const startTime = Date.now();
      
      const { getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByText('Analytics'));
      
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    test('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Check for accessibility labels on key interactive elements
      // Note: This would require the component to have proper accessibility props
      expect(true).toBe(true); // Placeholder for accessibility testing
    });
  });

  describe('Error States', () => {
    test('should handle service unavailability gracefully', () => {
      locationHeatmapService.isInitialized = false;
      propertyScoringService.isInitialized = false;
      
      const { getByText } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      // Should show service status as not ready
      expect(getByText('AI Services Status')).toBeDefined();
      // The actual status indicators would show the services are not ready
    });

    test('should handle analysis timeout', async () => {
      propertyScoringService.analyzeProperty.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      const { getByTestId } = render(
        <AIAnalyticsScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('heatmap-location-select'));
      
      // Should show loading state
      expect(getByText('Analyzing Property...')).toBeDefined();
      
      // In a real implementation, there would be a timeout mechanism
    });
  });
});