// ============================================================================
// GOVERNANCE SERVICE - DAO Voting Mobile Integration
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

class GovernanceService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/governance`;
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
      console.error(`Governance API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PROPOSAL MANAGEMENT
  // ============================================================================

  async getActiveProposals() {
    try {
      // Mock data for now - in production, this would call the actual API
      return [
        {
          id: 1,
          title: 'Expand Mumbai Residential Pool',
          description: 'Proposal to add 15 new residential properties in Mumbai suburbs including Thane, Navi Mumbai, and Vasai-Virar areas to increase diversification and rental income potential.',
          type: 'CITY_POOL_EXPANSION',
          proposer: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'ACTIVE',
          startTime: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
          endTime: Date.now() + (5 * 24 * 60 * 60 * 1000), // 5 days from now
          forVotes: 1250000,
          againstVotes: 350000,
          abstainVotes: 85000,
          userHasVoted: false,
          quorumRequired: 400000, // 4% of total supply
          createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          title: 'Reduce Platform Fees for Tier 1 Developers',
          description: 'Proposal to reduce platform fees from 1.5% to 1.2% for Tier 1 developers to attract more premium projects and increase competitiveness.',
          type: 'PLATFORM_FEE_CHANGE',
          proposer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          status: 'ACTIVE',
          startTime: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
          endTime: Date.now() + (6 * 24 * 60 * 60 * 1000), // 6 days from now
          forVotes: 890000,
          againstVotes: 1100000,
          abstainVotes: 120000,
          userHasVoted: true,
          userVote: 0, // voted against
          quorumRequired: 400000,
          createdAt: Date.now() - (1 * 24 * 60 * 60 * 1000)
        },
        {
          id: 3,
          title: 'Increase Staking Rewards for Gold Tier',
          description: 'Proposal to increase staking rewards for Gold tier holders from 12% to 14% APY to incentivize long-term holding and platform loyalty.',
          type: 'STAKING_REWARD_ADJUSTMENT',
          proposer: '0xfedcbafedcbafedcbafedcbafedcbafedcbafed',
          status: 'ACTIVE',
          startTime: Date.now() - (3 * 60 * 60 * 1000), // 3 hours ago
          endTime: Date.now() + (6 * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000), // 6d 21h from now
          forVotes: 75000,
          againstVotes: 25000,
          abstainVotes: 8000,
          userHasVoted: false,
          quorumRequired: 400000,
          createdAt: Date.now() - (3 * 60 * 60 * 1000)
        }
      ];
    } catch (error) {
      console.error('Error fetching active proposals:', error);
      throw error;
    }
  }

  async getProposalDetails(proposalId) {
    try {
      // In production, this would fetch from the blockchain
      const proposals = await this.getActiveProposals();
      const proposal = proposals.find(p => p.id === proposalId);
      
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      return {
        ...proposal,
        votingHistory: [
          { address: '0x1111...', vote: 1, power: 15000, timestamp: Date.now() - 60 * 60 * 1000 },
          { address: '0x2222...', vote: 0, power: 8500, timestamp: Date.now() - 90 * 60 * 1000 },
          { address: '0x3333...', vote: 1, power: 25000, timestamp: Date.now() - 120 * 60 * 1000 }
        ],
        discussion: [
          {
            author: '0x1111...',
            message: 'I support this proposal as it will increase our rental income diversity.',
            timestamp: Date.now() - 60 * 60 * 1000
          },
          {
            author: '0x2222...',
            message: 'Concerned about the execution timeline and capital requirements.',
            timestamp: Date.now() - 90 * 60 * 1000
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching proposal details:', error);
      throw error;
    }
  }

  async createProposal(proposalData) {
    try {
      // Validate proposal data
      if (!proposalData.title || !proposalData.description || !proposalData.type) {
        throw new Error('Missing required proposal fields');
      }

      // Mock creating proposal - in production, this would interact with smart contract
      console.log('Creating proposal:', proposalData);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        proposalId: Date.now(), // Mock proposal ID
        transactionHash: `0x${Math.random().toString(16).slice(2)}`,
        message: 'Proposal created successfully'
      };
    } catch (error) {
      console.error('Error creating proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // VOTING FUNCTIONS
  // ============================================================================

  async castVote(proposalId, support, reason = '') {
    try {
      // Validate inputs
      if (!proposalId || (support !== 0 && support !== 1 && support !== 2)) {
        throw new Error('Invalid voting parameters');
      }

      // Mock voting - in production, this would interact with smart contract
      console.log('Casting vote:', { proposalId, support, reason });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock transaction result
      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2)}`,
        votingPower: await this.getUserVotingPower('mock_address'),
        message: 'Vote cast successfully'
      };
    } catch (error) {
      console.error('Error casting vote:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserVotingPower(userAddress) {
    try {
      // Mock calculation based on XERA holdings and staking
      // In production, this would query the governance contract
      const mockXERABalance = 15000; // 15K XERA
      const mockStakingBonus = 3000; // 20% bonus for staking
      
      return mockXERABalance + mockStakingBonus; // 18K total voting power
    } catch (error) {
      console.error('Error getting voting power:', error);
      return 0;
    }
  }

  async getUserVoteHistory(userAddress, limit = 10) {
    try {
      // Mock vote history
      return [
        {
          proposalId: 1,
          proposalTitle: 'Expand Mumbai Residential Pool',
          vote: 1, // FOR
          votingPower: 18000,
          timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000),
          outcome: 'PENDING'
        },
        {
          proposalId: 2,
          proposalTitle: 'Reduce Platform Fees for Tier 1 Developers',
          vote: 0, // AGAINST
          votingPower: 17500,
          timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000),
          outcome: 'PENDING'
        }
      ];
    } catch (error) {
      console.error('Error getting vote history:', error);
      return [];
    }
  }

  // ============================================================================
  // GOVERNANCE STATISTICS
  // ============================================================================

  async getGovernanceStats() {
    try {
      // Mock governance statistics
      return {
        totalProposals: 12,
        activeProposals: 3,
        succeededProposals: 7,
        defeatedProposals: 2,
        participationRate: 45, // 45% of token holders participated in recent votes
        quorumRequired: 4, // 4% of total supply
        averageVotingPower: 12500,
        totalVotingPower: 10000000, // Total XERA in circulation
        topVoters: [
          { address: '0x1111...', power: 125000, votes: 8 },
          { address: '0x2222...', power: 98000, votes: 10 },
          { address: '0x3333...', power: 87500, votes: 7 }
        ]
      };
    } catch (error) {
      console.error('Error getting governance stats:', error);
      return null;
    }
  }

  async getDelegationInfo(userAddress) {
    try {
      // Mock delegation data
      return {
        hasDelegated: false,
        delegatedTo: null,
        delegatedPower: 0,
        delegatedFrom: [], // Addresses that delegated to this user
        totalDelegatedPower: 0
      };
    } catch (error) {
      console.error('Error getting delegation info:', error);
      return null;
    }
  }

  // ============================================================================
  // CITY POOL GOVERNANCE
  // ============================================================================

  async getCityPoolGovernance() {
    try {
      return [
        {
          cityCode: 'MUM',
          cityName: 'Mumbai',
          totalStaked: 2500000, // 2.5M XERA staked to this pool
          allocationPercentage: 25,
          activeProposals: 1,
          lastProposal: 'Expand Mumbai Residential Pool',
          proposalStatus: 'ACTIVE',
          averageYield: 9.2,
          propertyCount: 45,
          userStake: 15000 // User's stake in this pool
        },
        {
          cityCode: 'BANG',
          cityName: 'Bangalore',
          totalStaked: 2000000,
          allocationPercentage: 20,
          activeProposals: 0,
          lastProposal: 'Add Tech Parks to Portfolio',
          proposalStatus: 'SUCCEEDED',
          averageYield: 10.1,
          propertyCount: 38,
          userStake: 8500
        },
        {
          cityCode: 'DEL',
          cityName: 'Delhi NCR',
          totalStaked: 2000000,
          allocationPercentage: 20,
          activeProposals: 0,
          lastProposal: 'Increase Commercial Properties',
          proposalStatus: 'DEFEATED',
          averageYield: 8.8,
          propertyCount: 42,
          userStake: 12000
        }
      ];
    } catch (error) {
      console.error('Error getting city pool governance:', error);
      return [];
    }
  }

  async stakeToCityPool(cityCode, amount) {
    try {
      console.log('Staking to city pool:', { cityCode, amount });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2)}`,
        stakedAmount: amount,
        cityCode: cityCode,
        message: 'Successfully staked to city pool'
      };
    } catch (error) {
      console.error('Error staking to city pool:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // TREASURY GOVERNANCE
  // ============================================================================

  async getTreasuryInfo() {
    try {
      return {
        totalBalance: 5000000, // ₹50L in treasury
        monthlyIncome: 125000, // ₹1.25L monthly income
        allocations: [
          { category: 'Development', percentage: 40, amount: 2000000 },
          { category: 'Marketing', percentage: 25, amount: 1250000 },
          { category: 'Operations', percentage: 20, amount: 1000000 },
          { category: 'Reserve', percentage: 15, amount: 750000 }
        ],
        recentTransactions: [
          {
            type: 'ALLOCATION',
            amount: 500000,
            recipient: 'Development Fund',
            purpose: 'Smart Contract Audit',
            timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000),
            txHash: '0xabc123...'
          },
          {
            type: 'INCOME',
            amount: 125000,
            source: 'Platform Fees',
            purpose: 'Monthly Collection',
            timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000),
            txHash: '0xdef456...'
          }
        ]
      };
    } catch (error) {
      console.error('Error getting treasury info:', error);
      return null;
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  async checkUserEligibility(userAddress) {
    try {
      const votingPower = await this.getUserVotingPower(userAddress);
      const minimumForProposal = 10000; // 10K XERA needed to create proposals
      
      return {
        canVote: votingPower > 0,
        canPropose: votingPower >= minimumForProposal,
        votingPower: votingPower,
        minimumForProposal: minimumForProposal
      };
    } catch (error) {
      console.error('Error checking user eligibility:', error);
      return {
        canVote: false,
        canPropose: false,
        votingPower: 0,
        minimumForProposal: 10000
      };
    }
  }

  formatProposalType(type) {
    const typeMap = {
      'CITY_POOL_EXPANSION': 'City Pool Expansion',
      'PLATFORM_FEE_CHANGE': 'Platform Fee Change',
      'STAKING_REWARD_ADJUSTMENT': 'Staking Reward Adjustment',
      'PROPERTY_ADDITION': 'Property Addition',
      'TREASURY_ALLOCATION': 'Treasury Allocation',
      'EMERGENCY_ACTION': 'Emergency Action',
      'CROSS_CHAIN_BRIDGE': 'Cross-Chain Bridge',
      'PROPX_INTEGRATION': 'PROPX Integration'
    };
    return typeMap[type] || type;
  }

  formatVoteSupport(support) {
    if (support === 0) return 'AGAINST';
    if (support === 1) return 'FOR';
    if (support === 2) return 'ABSTAIN';
    return 'UNKNOWN';
  }

  calculateTimeRemaining(endTime) {
    const now = Date.now();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Voting ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }

  // ============================================================================
  // CACHING FUNCTIONS
  // ============================================================================

  async getCachedProposals() {
    try {
      const cached = await AsyncStorage.getItem('governance_proposals');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isStale = Date.now() - timestamp > 5 * 60 * 1000; // 5 minutes
        
        if (!isStale) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached proposals:', error);
      return null;
    }
  }

  async cacheProposals(proposals) {
    try {
      await AsyncStorage.setItem('governance_proposals', JSON.stringify({
        data: proposals,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching proposals:', error);
    }
  }

  async clearGovernanceCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const governanceKeys = keys.filter(key => key.startsWith('governance_'));
      await AsyncStorage.multiRemove(governanceKeys);
    } catch (error) {
      console.error('Error clearing governance cache:', error);
    }
  }
}

export const governanceService = new GovernanceService();
export default GovernanceService;