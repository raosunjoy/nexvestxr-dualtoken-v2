import AsyncStorage from '@react-native-async-storage/async-storage';
import { governanceService } from '../src/services/GovernanceService';
import { dividendService } from '../src/services/DividendService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('GovernanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('mock-token');
  });

  describe('getActiveProposals', () => {
    it('should return active proposals with correct structure', async () => {
      const proposals = await governanceService.getActiveProposals();
      
      expect(Array.isArray(proposals)).toBe(true);
      expect(proposals.length).toBeGreaterThan(0);
      
      const proposal = proposals[0];
      expect(proposal).toHaveProperty('id');
      expect(proposal).toHaveProperty('title');
      expect(proposal).toHaveProperty('description');
      expect(proposal).toHaveProperty('type');
      expect(proposal).toHaveProperty('status');
      expect(proposal).toHaveProperty('forVotes');
      expect(proposal).toHaveProperty('againstVotes');
      expect(proposal).toHaveProperty('abstainVotes');
    });

    it('should handle different proposal types', async () => {
      const proposals = await governanceService.getActiveProposals();
      const types = proposals.map(p => p.type);
      
      expect(types).toContain('CITY_POOL_EXPANSION');
      expect(types).toContain('PLATFORM_FEE_CHANGE');
      expect(types).toContain('STAKING_REWARD_ADJUSTMENT');
    });
  });

  describe('castVote', () => {
    it('should successfully cast vote with valid parameters', async () => {
      const result = await governanceService.castVote(1, 1, 'Support this proposal');
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('transactionHash');
      expect(result).toHaveProperty('votingPower');
      expect(result).toHaveProperty('message');
    });

    it('should reject invalid vote support values', async () => {
      const result = await governanceService.castVote(1, 5, 'Invalid vote'); // Invalid support value
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    it('should reject votes without proposal ID', async () => {
      const result = await governanceService.castVote(null, 1, 'No proposal ID');
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('createProposal', () => {
    it('should create proposal with valid data', async () => {
      const proposalData = {
        title: 'Test Proposal',
        description: 'Test Description',
        type: 'CITY_POOL_EXPANSION'
      };

      const result = await governanceService.createProposal(proposalData);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('proposalId');
      expect(result).toHaveProperty('transactionHash');
    });

    it('should reject proposal without required fields', async () => {
      const proposalData = {
        title: '', // Missing title
        description: 'Test Description',
        type: 'CITY_POOL_EXPANSION'
      };

      const result = await governanceService.createProposal(proposalData);
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('getUserVotingPower', () => {
    it('should return voting power for user', async () => {
      const votingPower = await governanceService.getUserVotingPower('0x123');
      
      expect(typeof votingPower).toBe('number');
      expect(votingPower).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCityPoolGovernance', () => {
    it('should return city pool governance data', async () => {
      const cityPools = await governanceService.getCityPoolGovernance();
      
      expect(Array.isArray(cityPools)).toBe(true);
      expect(cityPools.length).toBeGreaterThan(0);
      
      const pool = cityPools[0];
      expect(pool).toHaveProperty('cityCode');
      expect(pool).toHaveProperty('cityName');
      expect(pool).toHaveProperty('totalStaked');
      expect(pool).toHaveProperty('averageYield');
      expect(pool).toHaveProperty('propertyCount');
    });
  });

  describe('caching', () => {
    it('should cache proposals', async () => {
      const proposals = await governanceService.getActiveProposals();
      await governanceService.cacheProposals(proposals);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'governance_proposals',
        expect.stringContaining('"data"')
      );
    });

    it('should retrieve cached proposals', async () => {
      const mockCachedData = {
        data: [{ id: 1, title: 'Cached Proposal' }],
        timestamp: Date.now()
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCachedData));
      
      const cached = await governanceService.getCachedProposals();
      expect(cached).toEqual(mockCachedData.data);
    });
  });
});

describe('DividendService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('mock-token');
  });

  describe('getUserDividendSummary', () => {
    it('should return comprehensive dividend summary', async () => {
      const summary = await dividendService.getUserDividendSummary('0x123');
      
      expect(summary).toHaveProperty('totalEarned');
      expect(summary).toHaveProperty('totalClaimed');
      expect(summary).toHaveProperty('pendingAmount');
      expect(summary).toHaveProperty('thisMonth');
      expect(summary).toHaveProperty('averageYield');
      expect(summary).toHaveProperty('typeBreakdown');
      expect(summary).toHaveProperty('projectedMonthly');
      
      expect(typeof summary.totalEarned).toBe('number');
      expect(typeof summary.averageYield).toBe('number');
      expect(typeof summary.typeBreakdown).toBe('object');
    });

    it('should include type breakdown with all dividend sources', async () => {
      const summary = await dividendService.getUserDividendSummary('0x123');
      
      expect(summary.typeBreakdown).toHaveProperty('xeraPools');
      expect(summary.typeBreakdown).toHaveProperty('staking');
      expect(summary.typeBreakdown).toHaveProperty('propx');
      expect(summary.typeBreakdown).toHaveProperty('bonuses');
    });
  });

  describe('getClaimableDividends', () => {
    it('should return claimable dividends with proper structure', async () => {
      const claimable = await dividendService.getClaimableDividends('0x123');
      
      expect(Array.isArray(claimable)).toBe(true);
      
      if (claimable.length > 0) {
        const dividend = claimable[0];
        expect(dividend).toHaveProperty('roundId');
        expect(dividend).toHaveProperty('type');
        expect(dividend).toHaveProperty('source');
        expect(dividend).toHaveProperty('amount');
        expect(dividend).toHaveProperty('distributionDate');
        expect(dividend).toHaveProperty('deadline');
        expect(dividend).toHaveProperty('yieldRate');
      }
    });

    it('should include cross-chain bonuses where applicable', async () => {
      const claimable = await dividendService.getClaimableDividends('0x123');
      
      const propxDividends = claimable.filter(d => d.type === 'PROPX_RENTAL_INCOME');
      if (propxDividends.length > 0) {
        expect(propxDividends[0]).toHaveProperty('crossChainBonus');
      }
    });
  });

  describe('claimDividend', () => {
    it('should successfully claim dividend', async () => {
      const result = await dividendService.claimDividend(15);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('transactionHash');
      expect(result).toHaveProperty('claimedAmount');
      expect(result).toHaveProperty('blockNumber');
    });

    it('should handle claim failures gracefully', async () => {
      // Mock a network error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Test with invalid round ID
      const result = await dividendService.claimDividend(-1);
      
      expect(result).toHaveProperty('success');
      consoleSpy.mockRestore();
    });
  });

  describe('claimMultipleDividends', () => {
    it('should claim multiple dividends at once', async () => {
      const roundIds = [15, 16, 17];
      const result = await dividendService.claimMultipleDividends(roundIds);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('claimedRounds');
      expect(result).toHaveProperty('totalAmount');
      expect(result.claimedRounds).toEqual(roundIds);
    });
  });

  describe('getCityPoolDividends', () => {
    it('should return city pool dividend data', async () => {
      const cityPools = await dividendService.getCityPoolDividends('0x123');
      
      expect(Array.isArray(cityPools)).toBe(true);
      expect(cityPools.length).toBeGreaterThan(0);
      
      const pool = cityPools[0];
      expect(pool).toHaveProperty('cityCode');
      expect(pool).toHaveProperty('cityName');
      expect(pool).toHaveProperty('monthlyIncome');
      expect(pool).toHaveProperty('yourShare');
      expect(pool).toHaveProperty('occupancyRate');
      expect(pool).toHaveProperty('yield');
    });
  });

  describe('getStakingRewards', () => {
    it('should return staking reward information', async () => {
      const staking = await dividendService.getStakingRewards('0x123');
      
      expect(Array.isArray(staking)).toBe(true);
      
      if (staking.length > 0) {
        const stake = staking[0];
        expect(stake).toHaveProperty('stakingTier');
        expect(stake).toHaveProperty('stakedAmount');
        expect(stake).toHaveProperty('apy');
        expect(stake).toHaveProperty('earnedRewards');
        expect(stake).toHaveProperty('pendingRewards');
      }
    });
  });

  describe('getPROPXDividends', () => {
    it('should return PROPX dividend information', async () => {
      const propx = await dividendService.getPROPXDividends('0x123');
      
      expect(Array.isArray(propx)).toBe(true);
      
      if (propx.length > 0) {
        const property = propx[0];
        expect(property).toHaveProperty('tokenId');
        expect(property).toHaveProperty('propertyName');
        expect(property).toHaveProperty('investment');
        expect(property).toHaveProperty('tokensOwned');
        expect(property).toHaveProperty('monthlyRental');
        expect(property).toHaveProperty('crossChainBonus');
      }
    });
  });

  describe('getDividendAnalytics', () => {
    it('should return analytics data', async () => {
      const analytics = await dividendService.getDividendAnalytics('0x123', '6months');
      
      expect(analytics).toHaveProperty('timeframe', '6months');
      expect(analytics).toHaveProperty('monthlyData');
      expect(analytics).toHaveProperty('totalEarned');
      expect(analytics).toHaveProperty('averageMonthly');
      expect(analytics).toHaveProperty('growth');
      expect(analytics).toHaveProperty('breakdown');
      expect(analytics).toHaveProperty('projections');
      
      expect(Array.isArray(analytics.monthlyData)).toBe(true);
      expect(analytics.monthlyData.length).toBe(6);
    });
  });

  describe('getDividendCalendar', () => {
    it('should return calendar data for current month', async () => {
      const calendar = await dividendService.getDividendCalendar('0x123');
      
      expect(Array.isArray(calendar)).toBe(true);
      expect(calendar.length).toBeGreaterThan(0);
      
      const day = calendar[0];
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('day');
      expect(day).toHaveProperty('events');
      expect(day).toHaveProperty('totalAmount');
    });
  });

  describe('utility functions', () => {
    it('should format dividend types correctly', () => {
      expect(dividendService.formatDividendType('XERA_CITY_POOL')).toBe('XERA City Pool');
      expect(dividendService.formatDividendType('PROPX_RENTAL_INCOME')).toBe('PROPX Rental');
      expect(dividendService.formatDividendType('CROSS_CHAIN_BONUS')).toBe('Cross-Chain Bonus');
    });

    it('should calculate yield projections correctly', () => {
      const projection = dividendService.calculateYieldProjection(1000, 0.05);
      
      expect(projection).toHaveProperty('monthly');
      expect(projection).toHaveProperty('quarterly');
      expect(projection).toHaveProperty('annually');
      
      expect(projection.monthly).toBe(1050);
      expect(projection.quarterly).toBe(3150);
      expect(projection.annually).toBe(12600);
    });

    it('should format currency correctly', () => {
      expect(dividendService.formatCurrency(1000)).toBe('₹1,000');
      expect(dividendService.formatCurrency(1000000)).toBe('₹1,000,000');
    });

    it('should format percentages correctly', () => {
      expect(dividendService.formatPercentage(12.345)).toBe('12.3%');
      expect(dividendService.formatPercentage(9.8765, 2)).toBe('9.88%');
    });
  });

  describe('caching functionality', () => {
    it('should cache dividend summary', async () => {
      const summary = { totalEarned: 1000, totalClaimed: 500 };
      await dividendService.cacheDividendSummary('0x123', summary);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'dividend_summary_0x123',
        expect.stringContaining('"data"')
      );
    });

    it('should retrieve cached dividend summary', async () => {
      const mockCachedData = {
        data: { totalEarned: 1000, totalClaimed: 500 },
        timestamp: Date.now()
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCachedData));
      
      const cached = await dividendService.getCachedDividendSummary('0x123');
      expect(cached).toEqual(mockCachedData.data);
    });

    it('should clear expired cache', async () => {
      const mockCachedData = {
        data: { totalEarned: 1000 },
        timestamp: Date.now() - (15 * 60 * 1000) // 15 minutes ago (stale)
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCachedData));
      
      const cached = await dividendService.getCachedDividendSummary('0x123');
      expect(cached).toBeNull();
    });
  });
});