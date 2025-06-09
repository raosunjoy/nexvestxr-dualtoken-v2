// ============================================================================
// DUAL TOKEN SERVICE - Mobile API Integration
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

class DualTokenService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/dual-token`;
  }

  async getAuthHeaders() {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PORTFOLIO MANAGEMENT
  // ============================================================================

  async getUserPortfolio(userAddress) {
    return this.makeRequest(`/portfolio/${userAddress}`);
  }

  async getCrossChainBenefits(userAddress) {
    return this.makeRequest(`/cross-chain-benefits/${userAddress}`);
  }

  async classifyProperty(propertyData) {
    return this.makeRequest('/classify-property', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }

  async getClassificationCriteria() {
    return this.makeRequest('/classification-criteria');
  }

  // ============================================================================
  // XERA TOKEN OPERATIONS (XRPL)
  // ============================================================================

  async getXERAPortfolio(userAddress) {
    return this.makeRequest(`/xera/portfolio/${userAddress}`);
  }

  async getXERABenefits(userAddress) {
    return this.makeRequest(`/xera/benefits/${userAddress}`);
  }

  async getXERACityPools(city = null) {
    const endpoint = city ? `/xera/city-pools?city=${city}` : '/xera/city-pools';
    return this.makeRequest(endpoint);
  }

  async createXERAProperty(propertyData) {
    return this.makeRequest('/xera/create-property', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }

  async stakeXERA(stakeData) {
    // This would integrate with XRPL for actual staking
    // For now, return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionHash: 'mock_xrpl_hash_' + Date.now(),
          stakedAmount: stakeData.amount,
          stakingPeriod: stakeData.period,
          expectedRewards: Math.floor(stakeData.amount * 0.08 / 12), // 8% APY monthly
        });
      }, 2000);
    });
  }

  // ============================================================================
  // PROPX TOKEN OPERATIONS (FLARE)
  // ============================================================================

  async getPROPXMarketplace(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/propx/marketplace?${queryParams}` : '/propx/marketplace';
    return this.makeRequest(endpoint);
  }

  async getPROPXTokenDetails(tokenId) {
    return this.makeRequest(`/propx/token/${tokenId}`);
  }

  async investInPROPX(investmentData) {
    return this.makeRequest('/propx/invest', {
      method: 'POST',
      body: JSON.stringify(investmentData),
    });
  }

  async createPROPXProperty(propertyData) {
    return this.makeRequest('/propx/create-property', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }

  // ============================================================================
  // ANALYTICS AND PLATFORM DATA
  // ============================================================================

  async getPlatformAnalytics() {
    return this.makeRequest('/analytics/platform');
  }

  async getMarketData() {
    return this.makeRequest('/analytics/market');
  }

  async getDeveloperDashboard(developerAddress) {
    return this.makeRequest(`/developer/dashboard/${developerAddress}`);
  }

  async registerDeveloper(developerData) {
    return this.makeRequest('/developer/register', {
      method: 'POST',
      body: JSON.stringify(developerData),
    });
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  async getTokenPrice(tokenType) {
    try {
      if (tokenType === 'XERA') {
        // Mock XERA price from XRPL
        return {
          current: 1247, // ₹1,247 per XERA
          change24h: '+2.3%',
          volume24h: 4560000, // ₹45.6L
          marketCap: 15600000000, // ₹156 Cr
        };
      } else if (tokenType === 'PROPX') {
        // Mock PROPX average price from Flare
        return {
          current: 625, // ₹625 average
          change24h: '+1.8%',
          volume24h: 1230000, // ₹12.3L
          marketCap: 45600000000, // ₹456 Cr
        };
      }
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  async getNetworkStatus() {
    try {
      return {
        xrpl: {
          status: 'online',
          lastBlock: Date.now(),
          avgTransactionTime: '3-5 seconds',
          networkFee: '0.00001 XRP',
        },
        flare: {
          status: 'online',
          lastBlock: Date.now(),
          avgTransactionTime: '2-3 seconds',
          networkFee: '0.01 FLR',
        },
      };
    } catch (error) {
      console.error('Error fetching network status:', error);
      return null;
    }
  }

  // ============================================================================
  // CACHING HELPERS
  // ============================================================================

  async getCachedData(key, freshDataFn, cacheTime = 5 * 60 * 1000) { // 5 minutes default
    try {
      const cachedItem = await AsyncStorage.getItem(key);
      
      if (cachedItem) {
        const { data, timestamp } = JSON.parse(cachedItem);
        const isStale = Date.now() - timestamp > cacheTime;
        
        if (!isStale) {
          return data;
        }
      }

      // Fetch fresh data
      const freshData = await freshDataFn();
      
      // Cache the fresh data
      await AsyncStorage.setItem(key, JSON.stringify({
        data: freshData,
        timestamp: Date.now(),
      }));

      return freshData;
    } catch (error) {
      console.error('Cache error:', error);
      // Fallback to fresh data if caching fails
      return await freshDataFn();
    }
  }

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dualTokenKeys = keys.filter(key => key.startsWith('dualToken_'));
      await AsyncStorage.multiRemove(dualTokenKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // ============================================================================
  // MOCK DATA GENERATORS (for development)
  // ============================================================================

  generateMockPortfolioData(userAddress) {
    return {
      user: userAddress,
      timestamp: new Date().toISOString(),
      xera: {
        tokenType: 'XERA',
        network: 'XRPL',
        balance: 15000,
        properties: [
          { city: 'Mumbai', allocation: 35, value: 525000 },
          { city: 'Bangalore', allocation: 28, value: 420000 },
          { city: 'Delhi NCR', allocation: 25, value: 375000 },
          { city: 'Chennai', allocation: 12, value: 180000 },
        ],
        metrics: {
          totalValue: 1500000, // ₹15L
          yield: 8.5,
          diversificationScore: 85,
          riskScore: 25,
        },
        benefits: {
          tier: 'Silver',
          feeDiscount: 15,
          stakingAPY: 8,
          premiumAccess: false,
          votingPower: 150,
        },
      },
      propx: {
        tokenType: 'PROPX',
        network: 'Flare',
        holdings: [
          {
            id: 'PROPX-GODREJ-BKC001',
            name: 'Godrej BKC Residency Tower A',
            tokens: 20,
            value: 1000000, // ₹10L
            yield: 8.5,
          },
          {
            id: 'PROPX-PRESTIGE-TECH002',
            name: 'Prestige Tech Park Phase II',
            tokens: 13,
            value: 975000, // ₹9.75L
            yield: 12.0,
          },
        ],
        totalValue: 1975000, // ₹19.75L
        monthlyDividends: 16458, // ₹16,458
        averageYield: 10.2,
      },
      combined: {
        totalValue: 3475000, // ₹34.75L
        distribution: {
          xera: 0.43, // 43%
          propx: 0.57, // 57%
        },
        averageYield: 9.4,
        diversificationScore: 92,
        riskScore: 35,
      },
      crossChainBenefits: {
        tier: 'Silver',
        feeDiscount: 15,
        stakingAPY: 8,
        premiumAccess: false,
        votingPower: 150,
        crossChainFeatures: [
          'Unified portfolio tracking',
          'Cross-chain fee discounts',
          'Aggregated governance voting',
          'Combined analytics dashboard',
        ],
        eligibleForPROPX: false,
      },
      totalValue: 3475000,
      diversificationScore: 92,
    };
  }

  generateMockMarketplaceData() {
    return {
      tokens: [
        {
          id: 1,
          tokenContract: '0xGodrejBKC001Contract...',
          developer: 'rGodrejDeveloperAddress...',
          propertyName: 'Godrej BKC Residency Tower A',
          propertyAddress: 'Bandra Kurla Complex, Mumbai',
          projectCode: 'BKC001',
          cityCode: 'MUM',
          category: 0, // Residential
          totalTokens: 1000000,
          pricePerToken: 50000, // ₹500
          minimumRaise: 100000000, // ₹1 Cr
          expectedROI: 850, // 8.5%
          completionDate: '2026-03-15',
          status: 1, // Active
          fundingStatus: {
            raised: 85000000, // ₹85L
            goal: 100000000, // ₹1 Cr
            percentage: 85,
            deadline: '2024-09-30',
            tokensRemaining: 150000,
            investorCount: 157,
            institutionalCount: 12,
          },
          developerInfo: {
            name: 'Godrej Properties Limited',
            brandCode: 'GODREJ',
            tier: 'TIER1',
          },
          metrics: {
            currentYield: 8.5,
            capRate: 750, // 7.5%
            occupancyRate: 9500, // 95%
            totalReturn: 0,
            annualizedReturn: 0,
            dividendYield: 0,
          },
        },
        {
          id: 2,
          tokenContract: '0xPrestigeTech002Contract...',
          developer: 'rPrestigeDeveloperAddress...',
          propertyName: 'Prestige Tech Park Phase II',
          propertyAddress: 'Whitefield, Bangalore',
          projectCode: 'TECH002',
          cityCode: 'BANG',
          category: 1, // Commercial
          totalTokens: 2000000,
          pricePerToken: 75000, // ₹750
          minimumRaise: 300000000, // ₹3 Cr
          expectedROI: 1200, // 12%
          completionDate: '2025-12-30',
          status: 1, // Active
          fundingStatus: {
            raised: 276000000, // ₹2.76 Cr
            goal: 300000000, // ₹3 Cr
            percentage: 92,
            deadline: '2024-08-15',
            tokensRemaining: 320000,
            investorCount: 234,
            institutionalCount: 28,
          },
          developerInfo: {
            name: 'Prestige Estates Projects',
            brandCode: 'PRESTIGE',
            tier: 'TIER1',
          },
          metrics: {
            currentYield: 12.0,
            capRate: 950, // 9.5%
            occupancyRate: 8800, // 88%
            totalReturn: 0,
            annualizedReturn: 0,
            dividendYield: 0,
          },
        },
        {
          id: 3,
          tokenContract: '0xBrigadeMetro003Contract...',
          developer: 'rBrigadeDeveloperAddress...',
          propertyName: 'Brigade Metropolis Mall',
          propertyAddress: 'Hebbal, Bangalore',
          projectCode: 'METRO003',
          cityCode: 'BANG',
          category: 1, // Commercial
          totalTokens: 1500000,
          pricePerToken: 65000, // ₹650
          minimumRaise: 250000000, // ₹2.5 Cr
          expectedROI: 980, // 9.8%
          completionDate: '2027-06-20',
          status: 1, // Active
          fundingStatus: {
            raised: 167500000, // ₹1.675 Cr
            goal: 250000000, // ₹2.5 Cr
            percentage: 67,
            deadline: '2024-10-31',
            tokensRemaining: 925000,
            investorCount: 189,
            institutionalCount: 15,
          },
          developerInfo: {
            name: 'Brigade Enterprises',
            brandCode: 'BRIGADE',
            tier: 'TIER1',
          },
          metrics: {
            currentYield: 9.8,
            capRate: 850, // 8.5%
            occupancyRate: 9200, // 92%
            totalReturn: 0,
            annualizedReturn: 0,
            dividendYield: 0,
          },
        },
      ],
      totalCount: 3,
      filters: {},
    };
  }
}

export const dualTokenService = new DualTokenService();
export default DualTokenService;