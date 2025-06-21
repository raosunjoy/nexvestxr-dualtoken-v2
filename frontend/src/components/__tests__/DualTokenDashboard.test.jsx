import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DualTokenDashboard from '../DualToken/DualTokenDashboard';

// Mock UI components
jest.mock('../ui/card', () => ({
  Card: ({ children, className }) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <h3 data-testid="card-title">{children}</h3>
}));

jest.mock('../ui/badge', () => ({
  Badge: ({ children, variant, className }) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">{children}</span>
  )
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, onClick, size, variant, className }) => (
    <button 
      className={`button ${size} ${variant} ${className}`} 
      onClick={onClick}
      data-testid="button"
    >
      {children}
    </button>
  )
}));

jest.mock('../ui/tabs', () => ({
  Tabs: ({ children, defaultValue }) => (
    <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  )
}));

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}));

// Mock fetch
global.fetch = jest.fn();

describe('DualTokenDashboard Component', () => {
  const mockUserAddress = '0x1234567890abcdef';
  const mockPortfolioData = {
    user: mockUserAddress,
    totalValue: 5000000,
    diversificationScore: 75,
    xera: {
      balance: 15000,
      network: 'XRPL',
      metrics: {
        totalValue: 3000000,
        yield: 8.5
      }
    },
    propx: {
      holdings: [
        { id: 1, name: 'Property 1' },
        { id: 2, name: 'Property 2' }
      ],
      totalValue: 2000000,
      averageYield: 12.0
    }
  };

  const mockAnalyticsData = {
    crossChain: {
      totalPortfolioValue: '1,706 Cr',
      totalUsers: '2,847',
      crossChainUsers: '1,523'
    },
    xera: {
      circulatingSupply: '12.5M',
      activeProperties: '485',
      averageYield: '8.7%'
    },
    propx: {
      activeTokens: '5',
      successRate: '87%',
      averageYield: '11.2%'
    }
  };

  const mockBenefitsData = {
    benefits: {
      tier: 'Gold',
      feeDiscount: 25,
      stakingAPY: 12,
      features: [
        '25% platform fee discount',
        '12% staking rewards',
        'Premium PROPX access',
        'Governance voting rights'
      ]
    },
    crossChainFeatures: [
      'Unified portfolio tracking',
      'Cross-chain fee discounts',
      'Aggregated governance voting',
      'Combined analytics dashboard'
    ]
  };

  beforeEach(() => {
    fetch.mockClear();
    localStorage.setItem('token', 'mock-jwt-token');
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner when fetching data', () => {
      fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch portfolio data on mount', async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);

      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/dual-token/portfolio/${mockUserAddress}`,
          expect.objectContaining({
            headers: { 'Authorization': 'Bearer mock-jwt-token' }
          })
        );
      });

      expect(fetch).toHaveBeenCalledWith('/api/dual-token/analytics/platform');
      expect(fetch).toHaveBeenCalledWith(
        `/api/dual-token/cross-chain-benefits/${mockUserAddress}`,
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer mock-jwt-token' }
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      fetch.mockRejectedValue(new Error('API Error'));

      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching portfolio:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle unsuccessful API responses', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: false, error: 'Unauthorized' })
      };
      fetch.mockResolvedValue(mockResponse);

      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show loading spinner when API fails with unsuccessful response
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Component Rendering with Data', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should display header information correctly', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Dual Token Portfolio')).toBeInTheDocument();
      });

      expect(screen.getByText('XERA Platform Token + PROPX Premium Properties')).toBeInTheDocument();
      expect(screen.getAllByText(/XRPL Network/)).toHaveLength(3); // Header badges and section text
      expect(screen.getAllByText(/Flare Network/)).toHaveLength(3);
    });

    it('should display portfolio overview cards with correct data', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
      });

      expect(screen.getByText('₹5,000,000')).toBeInTheDocument();
      expect(screen.getByText('XERA Holdings')).toBeInTheDocument();
      expect(screen.getByText('XERA Holdings').parentElement).toHaveTextContent('15,000');
      expect(screen.getByText('PROPX Properties')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Diversification Score')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    it('should display tier information correctly', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Gold Tier')).toBeInTheDocument();
      });
    });

    it('should display PROPX properties count and yield', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Avg Yield: 12%')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should render all tab triggers', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByTestId('tab-trigger-portfolio')).toBeInTheDocument();
      });

      expect(screen.getByTestId('tab-trigger-xera')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-propx')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-benefits')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-analytics')).toBeInTheDocument();
    });

    it('should default to portfolio tab', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-default-value', 'portfolio');
      });
    });
  });

  describe('Portfolio Tab Content', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should display portfolio distribution chart', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Portfolio Distribution')).toBeInTheDocument();
      });

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('XERA (Platform)')).toBeInTheDocument();
      expect(screen.getByText('PROPX (Properties)')).toBeInTheDocument();
    });

    it('should display performance chart', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('6-Month Performance')).toBeInTheDocument();
      });

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should display recent transactions', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      });

      expect(screen.getByText('Staked')).toBeInTheDocument();
      expect(screen.getByText('Invested')).toBeInTheDocument();
      expect(screen.getByText('Received Rewards')).toBeInTheDocument();
      expect(screen.getByText('Dividend Claimed')).toBeInTheDocument();
    });
  });

  describe('XERA Tab Content', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should display XERA balance and equivalent value', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('XERA Balance')).toBeInTheDocument();
      });

      expect(screen.getByText('XERA Balance').closest('.bg-gradient-to-br')).toHaveTextContent('15,000');
      expect(screen.getByText(/≈ ₹/)).toBeInTheDocument(); // Any rupee equivalent value
    });

    it('should display city pools information', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('City Pools')).toBeInTheDocument();
      });

      expect(screen.getByText('Mumbai')).toBeInTheDocument();
      expect(screen.getByText('Bangalore')).toBeInTheDocument();
      expect(screen.getByText('Delhi NCR')).toBeInTheDocument();
      expect(screen.getByText('Chennai')).toBeInTheDocument();
    });

    it('should display staking rewards information', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Staking Rewards')).toBeInTheDocument();
      });

      expect(screen.getByText('12% APY')).toBeInTheDocument();
      expect(screen.getByText('2,500 XERA')).toBeInTheDocument();
      expect(screen.getByText('+127 XERA')).toBeInTheDocument();
    });

    it('should have functional buttons', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Stake XERA')).toBeInTheDocument();
      });

      expect(screen.getByText('View on XRPL')).toBeInTheDocument();
      expect(screen.getByText('Claim Rewards')).toBeInTheDocument();

      // Test button functionality
      const stakeButton = screen.getByText('Stake XERA');
      fireEvent.click(stakeButton);
      // Note: No actual functionality in component, just ensuring it's clickable
    });
  });

  describe('PROPX Tab Content', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should display PROPX marketplace properties', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Godrej BKC Residency Tower A')).toBeInTheDocument();
      });

      expect(screen.getByText('Prestige Tech Park Phase II')).toBeInTheDocument();
      expect(screen.getByText('Brigade Metropolis Mall')).toBeInTheDocument();
    });

    it('should display property details correctly', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Godrej Properties')).toBeInTheDocument();
      });

      expect(screen.getByText('Mumbai, BKC')).toBeInTheDocument();
      expect(screen.getByText('8.5%')).toBeInTheDocument();
      expect(screen.getByText('₹10,000')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // Funding progress
    });

    it('should display tier badges correctly', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        const tierBadges = screen.getAllByText('TIER1');
        expect(tierBadges).toHaveLength(3); // All three properties are TIER1
      });
    });

    it('should have functional investment buttons', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        const investButtons = screen.getAllByText('View Details & Invest');
        expect(investButtons).toHaveLength(3);
      });

      // Test button click
      fireEvent.click(screen.getAllByText('View Details & Invest')[0]);
      // Note: No actual functionality in component, just ensuring it's clickable
    });
  });

  describe('Benefits Tab Content', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should display current tier benefits', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Current Tier Benefits')).toBeInTheDocument();
      });

      expect(screen.getByText('Current Tier Benefits')).toBeInTheDocument();
      expect(screen.getByText(/Gold.*(Tier|tier)/)).toBeInTheDocument();
      expect(screen.getByText('Your current tier level')).toBeInTheDocument();
      expect(screen.getByText('Fee Discount:')).toBeInTheDocument();
      expect(screen.getByText('Fee Discount:').parentElement).toHaveTextContent('25%');
    });

    it('should display tier features', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('25% platform fee discount')).toBeInTheDocument();
      });

      expect(screen.getByText('12% staking rewards')).toBeInTheDocument();
      expect(screen.getByText('Premium PROPX access')).toBeInTheDocument();
      expect(screen.getByText('Governance voting rights')).toBeInTheDocument();
    });

    it('should display cross-chain benefits', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Cross-Chain Benefits')).toBeInTheDocument();
      });

      expect(screen.getByText('Unified portfolio tracking')).toBeInTheDocument();
      expect(screen.getByText('Cross-chain fee discounts')).toBeInTheDocument();
      expect(screen.getByText('Aggregated governance voting')).toBeInTheDocument();
      expect(screen.getByText('Combined analytics dashboard')).toBeInTheDocument();
    });

    it('should display tier progression', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Tier Progression')).toBeInTheDocument();
      });

      expect(screen.getByText('Bronze')).toBeInTheDocument();
      expect(screen.getByText('Silver')).toBeInTheDocument();
      expect(screen.getByText('Tier Progression').parentElement).toHaveTextContent('Gold');
      expect(screen.getByText('Platinum')).toBeInTheDocument();
      expect(screen.getByText('1,000 XERA')).toBeInTheDocument();
      expect(screen.getByText('5,000 XERA')).toBeInTheDocument();
      expect(screen.getByText('25,000 XERA')).toBeInTheDocument();
      expect(screen.getByText('100,000 XERA')).toBeInTheDocument();
    });
  });

  describe('Analytics Tab Content', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should display platform overview statistics', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Platform Overview')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Value Locked')).toBeInTheDocument();
      expect(screen.getByText('₹1,706 Cr')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('2,847')).toBeInTheDocument();
      expect(screen.getByText('Cross-Chain Users')).toBeInTheDocument();
      expect(screen.getByText('1,523')).toBeInTheDocument();
    });

    it('should display XERA statistics', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('XERA Statistics')).toBeInTheDocument();
      });

      // Just check that XERA statistics elements exist
      expect(screen.getByText('Circulating Supply')).toBeInTheDocument();
      expect(screen.getByText('12.5M')).toBeInTheDocument();
      expect(screen.getByText('Active Properties')).toBeInTheDocument();
      expect(screen.getByText('485')).toBeInTheDocument();
      expect(screen.getByText('8.7%')).toBeInTheDocument();
    });

    it('should display PROPX statistics', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('PROPX Statistics')).toBeInTheDocument();
      });

      expect(screen.getByText('Active Tokens')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('87%')).toBeInTheDocument();
      expect(screen.getByText('11.2%')).toBeInTheDocument(); // Another average yield
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null portfolio data gracefully', async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: null })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);

      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Dual Token Portfolio')).toBeInTheDocument();
      });

      // Should show zero values
      expect(screen.getByText('₹0')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(3); // Multiple zero values expected
    });

    it('should handle missing benefits data gracefully', async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: null })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);

      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Bronze Tier')).toBeInTheDocument(); // Default fallback
      });
    });

    it('should handle empty PROPX holdings gracefully', async () => {
      const modifiedPortfolioData = {
        ...mockPortfolioData,
        propx: {
          holdings: [],
          totalValue: 0,
          averageYield: 0
        }
      };

      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: modifiedPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);

      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Avg Yield: 0%')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      const mockPortfolioResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockPortfolioData })
      };
      const mockAnalyticsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockAnalyticsData })
      };
      const mockBenefitsResponse = {
        ok: true,
        json: async () => ({ success: true, data: mockBenefitsData })
      };

      fetch
        .mockResolvedValueOnce(mockPortfolioResponse)
        .mockResolvedValueOnce(mockAnalyticsResponse)
        .mockResolvedValueOnce(mockBenefitsResponse);
    });

    it('should have proper responsive grid classes', async () => {
      render(<DualTokenDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
      });

      // Check that grid containers have responsive classes
      const mainContainer = screen.getByText('Total Portfolio Value').closest('.grid');
      expect(mainContainer).toHaveClass('grid-cols-1', 'md:grid-cols-4');
    });
  });
});