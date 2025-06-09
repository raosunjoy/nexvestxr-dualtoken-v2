// ============================================================================
// DIVIDEND SERVICE - Cross-Chain Dividend Mobile Integration
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

class DividendService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/dividends`;
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
      console.error(`Dividend API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============================================================================
  // USER DIVIDEND MANAGEMENT
  // ============================================================================

  async getUserDividendSummary(userAddress) {
    try {
      // Mock dividend summary - in production, this would call the actual API
      return {
        totalEarned: 245600, // ₹2,45,600 total earned
        totalClaimed: 198400, // ₹1,98,400 claimed
        pendingAmount: 47200, // ₹47,200 pending
        thisMonth: 28500, // ₹28,500 this month
        lastClaimDate: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
        roundsParticipated: 18,
        averageYield: 9.2, // 9.2% average yield
        monthlyGrowth: 12.5, // 12.5% growth this month
        activeStreams: 5, // 5 active dividend streams
        typeBreakdown: {
          xeraPools: 125000, // ₹1,25,000 from XERA city pools
          staking: 87500, // ₹87,500 from staking rewards
          propx: 56000, // ₹56,000 from PROPX properties
          bonuses: 15100 // ₹15,100 from cross-chain bonuses
        },
        projectedMonthly: 32000, // ₹32,000 projected next month
        nextClaimDate: Date.now() + (4 * 24 * 60 * 60 * 1000) // 4 days from now
      };
    } catch (error) {
      console.error('Error fetching user dividend summary:', error);
      throw error;
    }
  }

  async getClaimableDividends(userAddress) {
    try {
      // Mock claimable dividends
      return [
        {
          roundId: 15,
          type: 'XERA_CITY_POOL',
          source: 'Mumbai Residential Pool',
          amount: 12500, // ₹12,500
          distributionDate: Date.now() - (2 * 24 * 60 * 60 * 1000),
          deadline: Date.now() + (28 * 24 * 60 * 60 * 1000), // 28 days to claim
          recordDate: Date.now() - (5 * 24 * 60 * 60 * 1000),
          eligibleTokens: 15000, // Based on 15K XERA holdings
          yieldRate: 9.2
        },
        {
          roundId: 16,
          type: 'XERA_STAKING_REWARD',
          source: 'Gold Tier Staking',
          amount: 8750, // ₹8,750
          distributionDate: Date.now() - (1 * 24 * 60 * 60 * 1000),
          deadline: Date.now() + (89 * 24 * 60 * 60 * 1000), // 89 days to claim
          recordDate: Date.now() - (1 * 24 * 60 * 60 * 1000),
          eligibleTokens: 12500, // Based on staked amount
          yieldRate: 12.0
        },
        {
          roundId: 17,
          type: 'PROPX_RENTAL_INCOME',
          source: 'Prestige Tech Park Phase II',
          amount: 15200, // ₹15,200
          distributionDate: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
          deadline: Date.now() + (59 * 24 * 60 * 60 * 1000), // 59 days to claim
          recordDate: Date.now() - (24 * 60 * 60 * 1000),
          eligibleTokens: 13, // 13 PROPX tokens owned
          yieldRate: 12.0,
          crossChainBonus: 1520 // 10% bonus due to XERA holdings
        },
        {
          roundId: 18,
          type: 'CROSS_CHAIN_BONUS',
          source: 'Silver Tier Benefits',
          amount: 3200, // ₹3,200
          distributionDate: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
          deadline: Date.now() + (29 * 24 * 60 * 60 * 1000), // 29 days to claim
          recordDate: Date.now() - (12 * 60 * 60 * 1000),
          eligibleTokens: 15000, // Based on XERA holdings
          yieldRate: 2.5,
          xeraTier: 'Silver'
        }
      ];
    } catch (error) {
      console.error('Error fetching claimable dividends:', error);
      return [];
    }
  }

  async claimDividend(roundId) {
    try {
      console.log('Claiming dividend for round:', roundId);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock successful claim
      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
        claimedAmount: 12500,
        gasUsed: '21000',
        blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
        message: 'Dividend claimed successfully'
      };
    } catch (error) {
      console.error('Error claiming dividend:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async claimMultipleDividends(roundIds) {
    try {
      console.log('Claiming multiple dividends:', roundIds);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const totalAmount = roundIds.length * 10000; // Mock calculation
      
      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
        claimedRounds: roundIds,
        totalAmount: totalAmount,
        gasUsed: (21000 * roundIds.length).toString(),
        blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
        message: `Successfully claimed ${roundIds.length} dividends`
      };
    } catch (error) {
      console.error('Error claiming multiple dividends:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // DIVIDEND HISTORY
  // ============================================================================

  async getDividendHistory(userAddress, limit = 20) {
    try {
      // Mock dividend history
      const history = [];
      const now = Date.now();
      
      for (let i = 0; i < limit; i++) {
        const daysAgo = Math.floor(Math.random() * 60) + 1; // 1-60 days ago
        const types = ['XERA_CITY_POOL', 'XERA_STAKING_REWARD', 'PROPX_RENTAL_INCOME', 'CROSS_CHAIN_BONUS'];
        const sources = ['Mumbai Pool', 'Bangalore Pool', 'Delhi Pool', 'Gold Staking', 'Prestige Tech Park', 'Brigade Mall'];
        
        history.push({
          roundId: 100 - i,
          type: types[Math.floor(Math.random() * types.length)],
          source: sources[Math.floor(Math.random() * sources.length)],
          amount: Math.floor(Math.random() * 25000) + 5000, // ₹5,000 to ₹30,000
          claimedAt: now - (daysAgo * 24 * 60 * 60 * 1000),
          transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
          blockNumber: Math.floor(Math.random() * 100000) + 14900000,
          yieldRate: Math.random() * 10 + 5, // 5% to 15%
          distributionDate: now - ((daysAgo + 1) * 24 * 60 * 60 * 1000)
        });
      }
      
      return history.sort((a, b) => b.claimedAt - a.claimedAt);
    } catch (error) {
      console.error('Error fetching dividend history:', error);
      return [];
    }
  }

  // ============================================================================
  // XERA CITY POOL DIVIDENDS
  // ============================================================================

  async getCityPoolDividends(userAddress) {
    try {
      return [
        {
          cityCode: 'MUM',
          cityName: 'Mumbai',
          monthlyIncome: 8500000, // ₹85L monthly income for pool
          yourShare: 12500, // User's share ₹12,500
          sharePercentage: 1.47, // 1.47% of pool
          occupancyRate: 95, // 95% occupancy
          propertyCount: 45,
          averageRent: 18888, // ₹18,888 average rent per property
          yield: 9.2, // 9.2% yield
          totalValue: 11000000000, // ₹110 Cr total pool value
          yourStake: 15000, // 15K XERA staked
          nextDividendDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
          lastDividendAmount: 12500,
          lastDividendDate: Date.now() - (23 * 24 * 60 * 60 * 1000)
        },
        {
          cityCode: 'BANG',
          cityName: 'Bangalore',
          monthlyIncome: 6800000, // ₹68L monthly income
          yourShare: 8900, // User's share ₹8,900
          sharePercentage: 1.31, // 1.31% of pool
          occupancyRate: 88, // 88% occupancy
          propertyCount: 38,
          averageRent: 17894, // ₹17,894 average rent
          yield: 10.1, // 10.1% yield
          totalValue: 8100000000, // ₹81 Cr total pool value
          yourStake: 8500, // 8.5K XERA staked
          nextDividendDate: Date.now() + (9 * 24 * 60 * 60 * 1000),
          lastDividendAmount: 8900,
          lastDividendDate: Date.now() - (21 * 24 * 60 * 60 * 1000)
        },
        {
          cityCode: 'DEL',
          cityName: 'Delhi NCR',
          monthlyIncome: 7200000, // ₹72L monthly income
          yourShare: 11200, // User's share ₹11,200
          sharePercentage: 1.56, // 1.56% of pool
          occupancyRate: 92, // 92% occupancy
          propertyCount: 42,
          averageRent: 17142, // ₹17,142 average rent
          yield: 8.8, // 8.8% yield
          totalValue: 9800000000, // ₹98 Cr total pool value
          yourStake: 12000, // 12K XERA staked
          nextDividendDate: Date.now() + (5 * 24 * 60 * 60 * 1000),
          lastDividendAmount: 11200,
          lastDividendDate: Date.now() - (25 * 24 * 60 * 60 * 1000)
        }
      ];
    } catch (error) {
      console.error('Error fetching city pool dividends:', error);
      return [];
    }
  }

  // ============================================================================
  // XERA STAKING REWARDS
  // ============================================================================

  async getStakingRewards(userAddress) {
    try {
      return [
        {
          stakingTier: 'Gold',
          stakedAmount: 25000, // 25K XERA staked
          stakingDuration: 180, // 180 days
          apy: 12.0, // 12% APY
          earnedRewards: 4876, // 4,876 XERA earned
          claimedRewards: 3200, // 3,200 XERA claimed
          pendingRewards: 1676, // 1,676 XERA pending
          estimatedMonthly: 2500, // ₹2,500 monthly estimate
          startDate: Date.now() - (180 * 24 * 60 * 60 * 1000),
          nextRewardDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
          lockupEndDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
          autoCompound: true,
          bonusMultiplier: 1.2 // 20% bonus for Gold tier
        },
        {
          stakingTier: 'Silver',
          stakedAmount: 10000, // 10K XERA staked
          stakingDuration: 90, // 90 days
          apy: 8.0, // 8% APY
          earnedRewards: 986, // 986 XERA earned
          claimedRewards: 740, // 740 XERA claimed
          pendingRewards: 246, // 246 XERA pending
          estimatedMonthly: 667, // ₹667 monthly estimate
          startDate: Date.now() - (90 * 24 * 60 * 60 * 1000),
          nextRewardDate: Date.now() + (14 * 24 * 60 * 60 * 1000),
          lockupEndDate: Date.now() + (60 * 24 * 60 * 60 * 1000),
          autoCompound: false,
          bonusMultiplier: 1.1 // 10% bonus for Silver tier
        }
      ];
    } catch (error) {
      console.error('Error fetching staking rewards:', error);
      return [];
    }
  }

  // ============================================================================
  // PROPX PROPERTY DIVIDENDS
  // ============================================================================

  async getPROPXDividends(userAddress) {
    try {
      return [
        {
          tokenId: 'PROPX-PRESTIGE-TECH002',
          propertyName: 'Prestige Tech Park Phase II',
          developer: 'Prestige Estates',
          location: 'Bangalore, Whitefield',
          investment: 975000, // ₹9,75,000 invested
          tokensOwned: 13, // 13 tokens owned
          totalTokens: 2000000,
          ownershipPercentage: 0.00065, // 0.065% ownership
          monthlyRental: 15200, // ₹15,200 monthly rental
          totalDividends: 91200, // ₹91,200 total dividends received
          lastDividendAmount: 15200,
          lastDividendDate: Date.now() - (28 * 24 * 60 * 60 * 1000),
          nextDividendDate: Date.now() + (2 * 24 * 60 * 60 * 1000),
          yield: 12.0, // 12% yield
          occupancyRate: 88, // 88% occupied
          completionProgress: 75, // 75% construction complete
          estimatedCompletion: Date.now() + (300 * 24 * 60 * 60 * 1000), // 300 days
          capitalAppreciation: 48750, // ₹48,750 appreciation so far
          crossChainBonus: 9120 // 10% bonus due to XERA holdings
        },
        {
          tokenId: 'PROPX-GODREJ-BKC001',
          propertyName: 'Godrej BKC Residency Tower A',
          developer: 'Godrej Properties',
          location: 'Mumbai, BKC',
          investment: 1000000, // ₹10,00,000 invested
          tokensOwned: 20, // 20 tokens owned
          totalTokens: 1000000,
          ownershipPercentage: 0.002, // 0.2% ownership
          monthlyRental: 8500, // ₹8,500 monthly rental
          totalDividends: 51000, // ₹51,000 total dividends received
          lastDividendAmount: 8500,
          lastDividendDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
          nextDividendDate: Date.now() + (1 * 24 * 60 * 60 * 1000),
          yield: 8.5, // 8.5% yield
          occupancyRate: 95, // 95% occupied
          completionProgress: 60, // 60% construction complete
          estimatedCompletion: Date.now() + (450 * 24 * 60 * 60 * 1000), // 450 days
          capitalAppreciation: 25000, // ₹25,000 appreciation so far
          crossChainBonus: 5100 // 10% bonus due to XERA holdings
        }
      ];
    } catch (error) {
      console.error('Error fetching PROPX dividends:', error);
      return [];
    }
  }

  // ============================================================================
  // DIVIDEND ANALYTICS
  // ============================================================================

  async getDividendAnalytics(userAddress, timeframe = '6months') {
    try {
      // Mock analytics data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const data = months.map((month, index) => ({
        month,
        totalDividends: Math.floor(Math.random() * 20000) + 15000,
        xeraDividends: Math.floor(Math.random() * 12000) + 8000,
        propxDividends: Math.floor(Math.random() * 8000) + 5000,
        stakingRewards: Math.floor(Math.random() * 6000) + 3000,
        crossChainBonuses: Math.floor(Math.random() * 2000) + 500
      }));

      return {
        timeframe,
        monthlyData: data,
        totalEarned: data.reduce((sum, d) => sum + d.totalDividends, 0),
        averageMonthly: data.reduce((sum, d) => sum + d.totalDividends, 0) / data.length,
        growth: {
          monthOverMonth: 12.5, // 12.5% MoM growth
          yearOverYear: 45.8, // 45.8% YoY growth
          trend: 'INCREASING'
        },
        breakdown: {
          xera: 65, // 65% from XERA
          propx: 28, // 28% from PROPX
          staking: 5, // 5% from staking
          bonuses: 2 // 2% from bonuses
        },
        projections: {
          nextMonth: 32000, // ₹32,000 projected
          nextQuarter: 95000, // ₹95,000 projected
          annualized: 350000 // ₹3,50,000 annualized
        }
      };
    } catch (error) {
      console.error('Error fetching dividend analytics:', error);
      return null;
    }
  }

  async getDividendCalendar(userAddress, month = null) {
    try {
      const currentMonth = month || new Date().getMonth();
      const year = new Date().getFullYear();
      const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
      
      const calendar = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, currentMonth, day);
        const dayEvents = [];
        
        // Mock dividend events
        if (day % 7 === 0) { // Weekly XERA city pool dividends
          dayEvents.push({
            type: 'XERA_CITY_POOL',
            source: 'Mumbai Pool',
            amount: 12500,
            status: date < new Date() ? 'CLAIMED' : 'PENDING'
          });
        }
        
        if (day === 15) { // Monthly PROPX dividends
          dayEvents.push({
            type: 'PROPX_RENTAL_INCOME',
            source: 'Prestige Tech Park',
            amount: 15200,
            status: date < new Date() ? 'CLAIMED' : 'PENDING'
          });
        }
        
        if (day === 1) { // Monthly staking rewards
          dayEvents.push({
            type: 'XERA_STAKING_REWARD',
            source: 'Gold Tier Staking',
            amount: 8750,
            status: date < new Date() ? 'CLAIMED' : 'PENDING'
          });
        }
        
        calendar.push({
          date: date.toISOString().split('T')[0],
          day: day,
          events: dayEvents,
          totalAmount: dayEvents.reduce((sum, event) => sum + event.amount, 0)
        });
      }
      
      return calendar;
    } catch (error) {
      console.error('Error fetching dividend calendar:', error);
      return [];
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  formatDividendType(type) {
    const typeMap = {
      'XERA_CITY_POOL': 'XERA City Pool',
      'XERA_STAKING_REWARD': 'XERA Staking',
      'PROPX_RENTAL_INCOME': 'PROPX Rental',
      'PROPX_CAPITAL_APPRECIATION': 'PROPX Appreciation',
      'CROSS_CHAIN_BONUS': 'Cross-Chain Bonus'
    };
    return typeMap[type] || type;
  }

  calculateYieldProjection(currentMonthly, growthRate = 0.05) {
    const monthly = currentMonthly * (1 + growthRate);
    return {
      monthly: Math.floor(monthly),
      quarterly: Math.floor(monthly * 3),
      annually: Math.floor(monthly * 12)
    };
  }

  formatCurrency(amount, currency = '₹') {
    return `${currency}${amount.toLocaleString()}`;
  }

  formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
  }

  // ============================================================================
  // CACHING FUNCTIONS
  // ============================================================================

  async getCachedDividendSummary(userAddress) {
    try {
      const cached = await AsyncStorage.getItem(`dividend_summary_${userAddress}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isStale = Date.now() - timestamp > 10 * 60 * 1000; // 10 minutes
        
        if (!isStale) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached dividend summary:', error);
      return null;
    }
  }

  async cacheDividendSummary(userAddress, summary) {
    try {
      await AsyncStorage.setItem(`dividend_summary_${userAddress}`, JSON.stringify({
        data: summary,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching dividend summary:', error);
    }
  }

  async clearDividendCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dividendKeys = keys.filter(key => key.startsWith('dividend_'));
      await AsyncStorage.multiRemove(dividendKeys);
    } catch (error) {
      console.error('Error clearing dividend cache:', error);
    }
  }
}

export const dividendService = new DividendService();
export default DividendService;