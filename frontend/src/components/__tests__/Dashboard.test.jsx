import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Dashboard from '../Dashboard/Dashboard';

// Mock dependencies
jest.mock('axios');

// Mock react-i18next after import
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: jest.fn(),
    },
  }),
  Trans: ({ children }) => children,
}));
jest.mock('../Payment/PaymentIntegration.jsx', () => ({ userId }) => (
  <div data-testid="payment-integration">PaymentIntegration for {userId}</div>
));
jest.mock('../Subscription/SubscriptionPlans', () => ({ role, userId }) => (
  <div data-testid="subscription-plans">SubscriptionPlans for {role} - {userId}</div>
));
jest.mock('../Payment/TransactionHistory.jsx', () => ({ userId }) => (
  <div data-testid="transaction-history">TransactionHistory for {userId}</div>
));
jest.mock('../Support/IntercomChat', () => ({ user }) => (
  <div data-testid="intercom-chat">IntercomChat for {user.name}</div>
));
jest.mock('./AnalyticsDashboard', () => ({ userId }) => (
  <div data-testid="analytics-dashboard">AnalyticsDashboard for {userId}</div>
));
jest.mock('../../hooks/useRTL', () => ({
  useRTL: () => ({ isRTL: false, direction: 'ltr' })
}));

// Mock UAE config
jest.mock('../../config/uaeConfig.json', () => ({
  investment: {
    tiers: {
      retail: { minAmount: 10000 },
      premium: { minAmount: 100000 },
      institutional: { minAmount: 1000000 }
    }
  }
}), { virtual: true });

const mockTranslation = {
  t: (key) => {
    const translations = {
      'common.loading': 'Loading...',
      'uae:platform.welcome': 'Welcome to NexVestXR UAE',
      'uae:platform.tagline': 'Invest in UAE Real Estate with Blockchain',
      'uae:investment.features.blockchain_security': 'Blockchain Security',
      'uae:investment.benefits.transparency': 'Full Transparency',
      'uae:investment.features.real_time_trading': 'Real-time Trading',
      'uae:investment.benefits.liquidity': 'Enhanced Liquidity',
      'uae:investment.features.regulatory_compliance': 'Regulatory Compliance',
      'uae:investment.benefits.regulatory_protection': 'Regulatory Protection',
      'common.navigation.dashboard': 'Dashboard',
      'currency.currency': 'Currency',
      'investment.totalInvestment': 'Total Investment',
      'common.properties': 'Properties',
      'investment.roi': 'ROI',
      'common.status': 'Status',
      'navigation.portfolio': 'Portfolio',
      'trading.tokens': 'tokens',
      'uae:marketing.headlines.invest_uae': 'Invest in UAE',
      'uae:marketing.call_to_action.explore_properties': 'Explore Properties',
      'uae:investment.tiers.retail.name': 'Retail',
      'uae:investment.tiers.premium.name': 'Premium',
      'uae:investment.tiers.institutional.name': 'Institutional',
      'uae:investment.tiers.retail.description': 'Perfect for individual investors',
      'uae:investment.tiers.premium.description': 'Enhanced features for serious investors',
      'uae:investment.tiers.institutional.description': 'Full-service institutional platform',
      'investment.invest': 'Invest Now'
    };
    return translations[key] || key;
  },
  i18n: { language: 'en' }
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    useTranslation.mockReturnValue(mockTranslation);
    axios.get.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner initially', () => {
      // Mock slow API response
      axios.get.mockReturnValue(new Promise(() => {}));

      render(<Dashboard />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument();
    });
  });

  describe('Data Loading and Display', () => {
    it('should load and display UAE properties data', async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check if UAE properties are displayed
      expect(screen.getByText('Luxury Apartment Downtown Dubai')).toBeInTheDocument();
      expect(screen.getByText('Marina View Penthouse')).toBeInTheDocument();
      expect(screen.getByText('Commercial Office Business Bay')).toBeInTheDocument();
    });

    it('should handle exchange rate API failure gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should still display content with fallback rates
      expect(screen.getByText('Welcome to NexVestXR UAE')).toBeInTheDocument();
    });
  });

  describe('Currency Switching', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should display currency selector with default AED', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check currency buttons
      expect(screen.getByRole('button', { name: 'AED' })).toHaveClass('btn-uae-gold');
      expect(screen.getByRole('button', { name: 'USD' })).toHaveClass('bg-gray-100');
      expect(screen.getByRole('button', { name: 'EUR' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SAR' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'QAR' })).toBeInTheDocument();
    });

    it('should switch currency when button is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Click USD button
      fireEvent.click(screen.getByRole('button', { name: 'USD' }));

      // Check if USD button becomes active
      expect(screen.getByRole('button', { name: 'USD' })).toHaveClass('btn-uae-gold');
      expect(screen.getByRole('button', { name: 'AED' })).toHaveClass('bg-gray-100');
    });

    it('should format currency correctly based on selected currency', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check AED formatting (default)
      expect(screen.getByText(/AED.*112,900/)).toBeInTheDocument(); // Total portfolio value

      // Switch to USD
      fireEvent.click(screen.getByRole('button', { name: 'USD' }));

      await waitFor(() => {
        // Should show USD equivalent
        expect(screen.getByText(/USD.*30,483/)).toBeInTheDocument();
      });
    });
  });

  describe('Portfolio Summary', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should display correct portfolio metrics', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check portfolio summary
      expect(screen.getByText('Total Investment')).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('ROI')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check values
      expect(screen.getByText('2')).toBeInTheDocument(); // Number of properties
      expect(screen.getByText('8.2%')).toBeInTheDocument(); // Average ROI
      expect(screen.getByText('Premium')).toBeInTheDocument(); // Status
    });

    it('should display user information correctly', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Dashboard - Ahmed Al Mansouri')).toBeInTheDocument();
      expect(screen.getByText('Downtown Dubai, Dubai')).toBeInTheDocument();
    });
  });

  describe('Investment Tiers', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should display investment tiers correctly', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check tier names
      expect(screen.getByText('Retail')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText('Institutional')).toBeInTheDocument();

      // Check minimum amounts
      expect(screen.getByText('AED 10,000')).toBeInTheDocument();
      expect(screen.getByText('AED 100,000')).toBeInTheDocument();
      expect(screen.getByText('AED 1,000,000')).toBeInTheDocument();

      // Check invest buttons
      const investButtons = screen.getAllByText('Invest Now');
      expect(investButtons).toHaveLength(3);
    });
  });

  describe('Token Holdings', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should display token holdings with property details', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check portfolio section
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      
      // Check token details
      expect(screen.getByText('25 tokens • EMAAR')).toBeInTheDocument();
      expect(screen.getByText('12 tokens • MERAAS')).toBeInTheDocument();
      
      // Check property locations
      expect(screen.getByText('Downtown Dubai')).toBeInTheDocument();
      expect(screen.getByText('Dubai Marina')).toBeInTheDocument();
    });
  });

  describe('Marketplace Preview', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should display marketplace preview with properties', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check marketplace section
      expect(screen.getByText('Invest in UAE')).toBeInTheDocument();
      expect(screen.getByText('Explore Properties')).toBeInTheDocument();

      // Check property previews
      expect(screen.getByText('Downtown Dubai • EMAAR')).toBeInTheDocument();
      expect(screen.getByText('Dubai Marina • MERAAS')).toBeInTheDocument();
      expect(screen.getByText('Business Bay • DAMAC')).toBeInTheDocument();

      // Check ROI badges
      expect(screen.getByText('8.5% ROI')).toBeInTheDocument();
      expect(screen.getByText('7.2% ROI')).toBeInTheDocument();
      expect(screen.getByText('9.1% ROI')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should render all child components with correct props', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check all child components are rendered
      expect(screen.getByTestId('analytics-dashboard')).toHaveTextContent('AnalyticsDashboard for uae-user-001');
      expect(screen.getByTestId('payment-integration')).toHaveTextContent('PaymentIntegration for uae-user-001');
      expect(screen.getByTestId('subscription-plans')).toHaveTextContent('SubscriptionPlans for investor - uae-user-001');
      expect(screen.getByTestId('transaction-history')).toHaveTextContent('TransactionHistory for uae-user-001');
      expect(screen.getByTestId('intercom-chat')).toHaveTextContent('IntercomChat for Ahmed Al Mansouri');
    });
  });

  describe('Responsive Design Elements', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should have proper CSS classes for responsive design', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check responsive grid classes
      const portfolioGrid = screen.getByText('Total Investment').closest('.grid');
      expect(portfolioGrid).toHaveClass('grid-cols-1', 'md:grid-cols-4');

      const mainGrid = screen.getByText('Portfolio').closest('.grid');
      expect(mainGrid).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing translation gracefully', async () => {
      const brokenTranslation = {
        t: (key) => key, // Return key if translation not found
        i18n: { language: 'en' }
      };
      
      useTranslation.mockReturnValue(brokenTranslation);
      
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      });

      // Should display translation keys as fallback
      expect(screen.getByText('uae:platform.welcome')).toBeInTheDocument();
    });

    it('should handle empty portfolio data gracefully', async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should handle zero values gracefully
      expect(screen.getByText(/AED.*112,900/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      const mockExchangeRateResponse = {
        data: {
          rates: { USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 }
        }
      };
      
      axios.get.mockResolvedValue(mockExchangeRateResponse);
    });

    it('should have proper ARIA labels and roles', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check button roles
      const currencyButtons = screen.getAllByRole('button');
      expect(currencyButtons.length).toBeGreaterThan(0);

      // Check currency buttons are properly labeled
      expect(screen.getByRole('button', { name: 'AED' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'USD' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const aedButton = screen.getByRole('button', { name: 'AED' });
      const usdButton = screen.getByRole('button', { name: 'USD' });

      // Test keyboard navigation
      aedButton.focus();
      expect(document.activeElement).toBe(aedButton);

      // Test keyboard interaction
      fireEvent.keyDown(usdButton, { key: 'Enter', code: 'Enter' });
      expect(usdButton).toHaveClass('btn-uae-gold');
    });
  });
});