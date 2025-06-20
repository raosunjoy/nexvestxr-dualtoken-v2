// Mock config first before importing DualTokenService
jest.mock('../../../src/config/blockchainConfig.json', () => ({
  blockchain: {
    xrpl: {
      network: 'wss://testnet.xrpl-labs.com',
      walletSeed: 'mock_seed',
      xeraIssuer: 'rMockIssuer123'
    },
    flare: {
      rpcUrl: 'https://mock-flare-rpc.com',
      contracts: {
        xeraToken: '0x123...',
        propxFactory: '0x456...'
      }
    }
  }
}), { virtual: true });

const DualTokenService = require('../../../src/services/DualTokenService');
const xrpl = require('xrpl');
const { ethers } = require('ethers');

// Mock dependencies
jest.mock('xrpl');
jest.mock('ethers');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock contract JSON files
jest.mock('../../../src/contracts/XERAToken.json', () => ({
  abi: ['mock-xera-abi']
}), { virtual: true });

jest.mock('../../../src/contracts/PROPXTokenFactory.json', () => ({
  abi: ['mock-propx-factory-abi']
}), { virtual: true });

jest.mock('../../../src/contracts/PROPXToken.json', () => ({
  abi: ['mock-propx-token-abi']
}), { virtual: true });

describe('DualTokenService', () => {
  let dualTokenService;
  let mockXrplClient;
  let mockFlareProvider;
  let mockXeraContract;
  let mockPropxFactoryContract;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock XRPL client
    mockXrplClient = {
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      isConnected: jest.fn().mockReturnValue(true),
      request: jest.fn(),
      autofill: jest.fn(),
      submitAndWait: jest.fn()
    };
    xrpl.Client.mockReturnValue(mockXrplClient);

    // Mock Wallet
    const mockWallet = {
      sign: jest.fn().mockReturnValue({ tx_blob: 'mock_tx_blob' }),
      address: 'rMockAddress123'
    };
    xrpl.Wallet = {
      fromSeed: jest.fn().mockReturnValue(mockWallet)
    };

    // Mock Ethers provider and contracts
    mockFlareProvider = {
      getBlockNumber: jest.fn().mockResolvedValue(12345),
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt('20000000000') // 20 gwei
      })
    };
    ethers.JsonRpcProvider.mockReturnValue(mockFlareProvider);

    mockXeraContract = {
      address: '0x123...',
      interface: {
        parseLog: jest.fn()
      }
    };

    mockPropxFactoryContract = {
      developers: jest.fn(),
      createPROPXToken: jest.fn(),
      propxTokenCount: jest.fn(),
      getPROPXTokenInfo: jest.fn()
    };

    ethers.Contract
      .mockReturnValueOnce(mockXeraContract)
      .mockReturnValueOnce(mockPropxFactoryContract);

    ethers.Wallet.mockReturnValue({
      address: '0xMockWalletAddress',
      connect: jest.fn()
    });

    // Mock BigNumber for ethers v6
    ethers.BigNumber = {
      from: jest.fn().mockImplementation((value) => ({
        toString: () => value.toString(),
        toNumber: () => parseInt(value),
        mul: jest.fn().mockImplementation(function(other) { return this; }),
        add: jest.fn().mockImplementation(function(other) { return this; }),
        sub: jest.fn().mockImplementation(function(other) { return this; }),
        div: jest.fn().mockImplementation(function(other) { return this; })
      }))
    };
    
    // Mock ethers.utils for compatibility
    ethers.utils = {
      parseEther: jest.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
      formatEther: jest.fn((value) => {
        const val = BigInt(value);
        const divisor = BigInt(1e18);
        return (val / divisor).toString();
      })
    };
    
    // Mock ethers.formatEther for v6
    ethers.formatEther = jest.fn((value) => {
      const val = BigInt(value);
      const divisor = BigInt(1e18);
      return (val / divisor).toString();
    });


    dualTokenService = new DualTokenService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Property Classification System', () => {
    describe('classifyProperty', () => {
      it('should classify high-value property as PROPX eligible', async () => {
        const propertyData = {
          totalValue: 60000000, // ₹6 Cr
          location: 'Mumbai',
          category: 'COMMERCIAL',
          developer: 'mockDeveloper',
          compliance: { score: 85 }
        };

        // Mock developer tier check
        dualTokenService.getDeveloperTier = jest.fn().mockResolvedValue('TIER1');

        const result = await dualTokenService.classifyProperty(propertyData);

        expect(result.eligibleForPROPX).toBe(true);
        expect(result.tokenType).toBe('PROPX');
        expect(result.tier).toBe('TIER1');
        expect(result.reasons).toContain('High-value property in premium location');
      });

      it('should classify low-value property as XERA only', async () => {
        const propertyData = {
          totalValue: 30000000, // ₹3 Cr (below threshold)
          location: 'Mumbai',
          category: 'RESIDENTIAL',
          developer: 'mockDeveloper',
          compliance: { score: 85 }
        };

        dualTokenService.getDeveloperTier = jest.fn().mockResolvedValue('TIER1');

        const result = await dualTokenService.classifyProperty(propertyData);

        expect(result.eligibleForPROPX).toBe(false);
        expect(result.tokenType).toBe('XERA');
        expect(result.reasons).toContain('Property value below ₹5 Cr threshold');
      });

      it('should classify property in non-premium location as XERA only', async () => {
        const propertyData = {
          totalValue: 60000000,
          location: 'Indore', // Non-premium city
          category: 'RESIDENTIAL',
          developer: 'mockDeveloper',
          compliance: { score: 85 }
        };

        dualTokenService.getDeveloperTier = jest.fn().mockResolvedValue('TIER1');

        const result = await dualTokenService.classifyProperty(propertyData);

        expect(result.eligibleForPROPX).toBe(false);
        expect(result.tokenType).toBe('XERA');
        expect(result.reasons).toContain('Location not in premium tier');
      });

      it('should handle missing developer information gracefully', async () => {
        const propertyData = {
          totalValue: 60000000,
          location: 'Mumbai',
          category: 'COMMERCIAL',
          compliance: { score: 85 }
        };

        const result = await dualTokenService.classifyProperty(propertyData);

        expect(result.eligibleForPROPX).toBe(false);
        expect(result.tokenType).toBe('XERA');
      });
    });

    describe('getDeveloperTier', () => {
      it('should return correct developer tier', async () => {
        mockPropxFactoryContract.developers.mockResolvedValue({ tier: 2 });

        const tier = await dualTokenService.getDeveloperTier('0xDeveloper123');

        expect(tier).toBe('TIER1'); // tier 2 maps to 'TIER1' in array ['NONE', 'TIER2', 'TIER1']
        expect(mockPropxFactoryContract.developers).toHaveBeenCalledWith('0xDeveloper123');
      });

      it('should handle contract errors gracefully', async () => {
        mockPropxFactoryContract.developers.mockRejectedValue(new Error('Contract error'));

        const tier = await dualTokenService.getDeveloperTier('0xDeveloper123');

        expect(tier).toBeNull();
      });

      it('should return null when contract not initialized', async () => {
        dualTokenService.propxFactoryContract = null;

        const tier = await dualTokenService.getDeveloperTier('0xDeveloper123');

        expect(tier).toBeNull();
      });
    });
  });

  describe('XERA Token Operations', () => {
    describe('createXERAProperty', () => {
      it('should create XERA property successfully', async () => {
        const propertyData = {
          name: 'Test Property',
          location: 'Mumbai',
          valuation: 5000000,
          category: 'RESIDENTIAL',
          documents: { ipfsHash: 'QmTest123' },
          cityCode: 'MUM'
        };
        const ownerAddress = 'rOwner123';

        mockXrplClient.submitAndWait.mockResolvedValue({
          result: {
            hash: 'mockTxHash123',
            meta: { TransactionResult: 'tesSUCCESS' }
          }
        });

        dualTokenService.submitXRPLTransaction = jest.fn().mockResolvedValue({
          result: { hash: 'mockTxHash123' }
        });

        const result = await dualTokenService.createXERAProperty(propertyData, ownerAddress);

        expect(result.success).toBe(true);
        expect(result.tokenType).toBe('XERA');
        expect(result.transactionHash).toBe('mockTxHash123');
        expect(result.network).toBe('XRPL');
        expect(result.propertyId).toContain('XERA-MUM-');
      });

      it('should handle XRPL transaction errors', async () => {
        const propertyData = {
          name: 'Test Property',
          location: 'Mumbai',
          valuation: 5000000,
          category: 'RESIDENTIAL',
          documents: { ipfsHash: 'QmTest123' },
          cityCode: 'MUM'
        };

        dualTokenService.submitXRPLTransaction = jest.fn().mockRejectedValue(
          new Error('XRPL transaction failed')
        );

        await expect(
          dualTokenService.createXERAProperty(propertyData, 'rOwner123')
        ).rejects.toThrow('XRPL transaction failed');
      });
    });

    describe('calculateXERAAllocation', () => {
      it('should calculate correct XERA allocation with multipliers', async () => {
        const allocation = await dualTokenService.calculateXERAAllocation(
          1000000, // ₹10L
          'COMMERCIAL',
          'MUM'
        );

        // Base: 1000000/1000 = 1000
        // Commercial multiplier: 1.2
        // Mumbai multiplier: 1.3
        // Expected: 1000 * 1.2 * 1.3 = 1560
        expect(allocation).toBe(1560);
      });

      it('should handle unknown category and city codes', async () => {
        const allocation = await dualTokenService.calculateXERAAllocation(
          1000000,
          'UNKNOWN_CATEGORY',
          'UNKNOWN_CITY'
        );

        // Should use default multipliers (1.0)
        expect(allocation).toBe(1000);
      });

      it('should return integer allocation amounts', async () => {
        const allocation = await dualTokenService.calculateXERAAllocation(
          1500000,
          'RESIDENTIAL',
          'DEL'
        );

        expect(Number.isInteger(allocation)).toBe(true);
      });
    });

    describe('getXERAPortfolio', () => {
      it('should return user XERA portfolio', async () => {
        mockXrplClient.request.mockResolvedValue({
          result: {
            lines: [{
              currency: 'XERA',
              account: 'rMockIssuer123',
              balance: '5000'
            }]
          }
        });

        dualTokenService.getXERAProperties = jest.fn().mockResolvedValue([]);
        dualTokenService.calculateXERAMetrics = jest.fn().mockResolvedValue({
          totalValue: 5000000,
          yield: 8.5,
          diversificationScore: 50,
          riskScore: 30
        });
        dualTokenService.getXERABenefits = jest.fn().mockResolvedValue({
          tier: 'Silver',
          feeDiscount: 15
        });

        const portfolio = await dualTokenService.getXERAPortfolio('rUser123');

        expect(portfolio.tokenType).toBe('XERA');
        expect(portfolio.balance).toBe(5000);
        expect(portfolio.network).toBe('XRPL');
        expect(portfolio.properties).toEqual([]);
      });

      it('should handle zero balance correctly', async () => {
        mockXrplClient.request.mockResolvedValue({
          result: { lines: [] }
        });

        dualTokenService.getXERAProperties = jest.fn().mockResolvedValue([]);
        dualTokenService.calculateXERAMetrics = jest.fn().mockResolvedValue({
          totalValue: 0,
          yield: 0,
          diversificationScore: 0,
          riskScore: 50
        });
        dualTokenService.getXERABenefits = jest.fn().mockResolvedValue({
          tier: 'Bronze',
          feeDiscount: 0
        });

        const portfolio = await dualTokenService.getXERAPortfolio('rUser123');

        expect(portfolio.balance).toBe(0);
      });
    });

    describe('getXERABenefits', () => {
      it('should return Platinum tier for high balance', async () => {
        const benefits = await dualTokenService.getXERABenefits(150000);

        expect(benefits.tier).toBe('Platinum');
        expect(benefits.feeDiscount).toBe(35);
        expect(benefits.stakingAPY).toBe(15);
        expect(benefits.premiumAccess).toBe(true);
      });

      it('should return Bronze tier for low balance', async () => {
        const benefits = await dualTokenService.getXERABenefits(1500);

        expect(benefits.tier).toBe('Bronze');
        expect(benefits.feeDiscount).toBe(10);
        expect(benefits.stakingAPY).toBe(6);
        expect(benefits.premiumAccess).toBe(false);
      });

      it('should calculate voting power correctly', async () => {
        const benefits = await dualTokenService.getXERABenefits(10000);

        expect(benefits.votingPower).toBe(100); // 10000 / 100
      });
    });
  });

  describe('PROPX Token Operations', () => {
    describe('createPROPXProperty', () => {
      it('should create PROPX property successfully', async () => {
        const propertyData = {
          name: 'Premium Property',
          address: 'Test Address',
          projectCode: 'TEST001',
          cityCode: 'MUM',
          category: 'COMMERCIAL',
          totalTokens: 1000000,
          pricePerToken: 100,
          minimumRaise: 50000000,
          fundingPeriodDays: 90,
          documents: { ipfsHash: 'QmTest123' },
          expectedROI: 12,
          completionMonths: 24
        };

        mockPropxFactoryContract.developers.mockResolvedValue({
          isActive: true,
          brandCode: 'DEV1'
        });

        mockPropxFactoryContract.createPROPXToken.mockResolvedValue({
          wait: jest.fn().mockResolvedValue({
            transactionHash: 'mockTxHash456',
            events: [{
              event: 'PROPXTokenCreated',
              args: {
                tokenContract: '0xTokenContract123',
                tokenId: BigInt('1')
              }
            }]
          })
        });

        const result = await dualTokenService.createPROPXProperty(
          propertyData,
          '0xDeveloper123'
        );

        expect(result.success).toBe(true);
        expect(result.tokenType).toBe('PROPX');
        expect(result.tokenContract).toBe('0xTokenContract123');
        expect(result.network).toBe('Flare');
      });

      it('should reject inactive developers', async () => {
        mockPropxFactoryContract.developers.mockResolvedValue({
          isActive: false
        });

        await expect(
          dualTokenService.createPROPXProperty({}, '0xInactiveDeveloper')
        ).rejects.toThrow('Developer not active or registered');
      });
    });

    describe('getPROPXMarketplace', () => {
      it('should return filtered marketplace tokens', async () => {
        mockPropxFactoryContract.propxTokenCount.mockResolvedValue(
          BigInt('2')
        );

        mockPropxFactoryContract.getPROPXTokenInfo
          .mockResolvedValueOnce({
            tokenContract: '0xToken1',
            cityCode: 'MUM',
            category: 'COMMERCIAL',
            developer: '0xDev1',
            status: 'ACTIVE',
            projectCode: 'PROJ1'
          })
          .mockResolvedValueOnce({
            tokenContract: '0xToken2',
            cityCode: 'DEL',
            category: 'RESIDENTIAL',
            developer: '0xDev2',
            status: 'ACTIVE',
            projectCode: 'PROJ2'
          });

        mockPropxFactoryContract.developers
          .mockResolvedValueOnce({
            companyName: 'Developer 1',
            brandCode: 'DEV1',
            tier: 1
          })
          .mockResolvedValueOnce({
            companyName: 'Developer 2',
            brandCode: 'DEV2',
            tier: 2
          });

        // Mock token contracts
        const mockTokenContract = {
          getFundingStatus: jest.fn().mockResolvedValue({ raised: 1000000 }),
          getInvestmentMetrics: jest.fn().mockResolvedValue({ currentYield: 8.5 })
        };
        ethers.Contract.mockReturnValue(mockTokenContract);

        const result = await dualTokenService.getPROPXMarketplace({
          city: 'MUM',
          limit: 10
        });

        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0].cityCode).toBe('MUM');
        expect(result.totalCount).toBe(1);
      });

      it('should handle empty marketplace', async () => {
        mockPropxFactoryContract.propxTokenCount.mockResolvedValue(
          BigInt('0')
        );

        const result = await dualTokenService.getPROPXMarketplace();

        expect(result.tokens).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      });
    });

    describe('investInPROPX', () => {
      it('should process PROPX investment successfully', async () => {
        const mockTokenContract = {
          pricePerToken: jest.fn().mockResolvedValue(BigInt('100000000000000000000')), // 100 ether
          buyTokens: jest.fn().mockResolvedValue({
            wait: jest.fn().mockResolvedValue({
              transactionHash: 'mockInvestmentTx',
              status: 1
            })
          })
        };
        ethers.Contract.mockReturnValue(mockTokenContract);

        const tokenAmount = BigInt('10');
        const result = await dualTokenService.investInPROPX(
          '0xTokenAddress',
          '0xInvestor',
          tokenAmount,
          false
        );

        expect(result.success).toBe(true);
        expect(result.transactionHash).toBe('mockInvestmentTx');
        expect(result.network).toBe('Flare');
      });

      it('should handle institutional investments', async () => {
        const mockTokenContract = {
          pricePerToken: jest.fn().mockResolvedValue(BigInt('100000000000000000000')), // 100 ether
          buyTokensInstitutional: jest.fn().mockResolvedValue({
            wait: jest.fn().mockResolvedValue({
              transactionHash: 'mockInstitutionalTx',
              status: 1
            })
          })
        };
        ethers.Contract.mockReturnValue(mockTokenContract);

        const tokenAmount = BigInt('1000');
        const result = await dualTokenService.investInPROPX(
          '0xTokenAddress',
          '0xInstitution',
          tokenAmount,
          true
        );

        expect(result.success).toBe(true);
        expect(mockTokenContract.buyTokensInstitutional).toHaveBeenCalled();
      });
    });
  });

  describe('Cross-Chain Portfolio Management', () => {
    describe('getUserPortfolio', () => {
      it('should return combined portfolio data', async () => {
        const mockXeraPortfolio = {
          tokenType: 'XERA',
          balance: 5000,
          metrics: { totalValue: 5000000, yield: 8.5 }
        };
        const mockPropxPortfolio = {
          tokenType: 'PROPX',
          totalValue: 2000000,
          averageYield: 12.0
        };

        dualTokenService.getXERAPortfolio = jest.fn().mockResolvedValue(mockXeraPortfolio);
        dualTokenService.getPROPXPortfolio = jest.fn().mockResolvedValue(mockPropxPortfolio);
        dualTokenService.getCrossChainBenefits = jest.fn().mockResolvedValue({
          crossChainFeatures: ['Unified tracking']
        });

        const portfolio = await dualTokenService.getUserPortfolio('userAddress');

        expect(portfolio.xera).toEqual(mockXeraPortfolio);
        expect(portfolio.propx).toEqual(mockPropxPortfolio);
        expect(portfolio.combined.totalValue).toBe(7000000);
        expect(portfolio.totalValue).toBe(7000000);
      });
    });

    describe('calculateCombinedMetrics', () => {
      it('should calculate weighted average metrics', () => {
        const xeraPortfolio = {
          metrics: { totalValue: 6000000, yield: 8.0, diversificationScore: 80 }
        };
        const propxPortfolio = {
          totalValue: 4000000,
          averageYield: 12.0
        };

        const metrics = dualTokenService.calculateCombinedMetrics(xeraPortfolio, propxPortfolio);

        expect(metrics.totalValue).toBe(10000000);
        expect(metrics.distribution.xera).toBe(0.6);
        expect(metrics.distribution.propx).toBe(0.4);
        expect(metrics.averageYield).toBeCloseTo(9.6, 1); // (8*0.6) + (12*0.4)
      });
    });

    describe('calculateRiskScore', () => {
      it('should calculate correct risk score', () => {
        const riskScore = dualTokenService.calculateRiskScore(0.7, 0.3);

        // (30 * 0.7) + (70 * 0.3) = 21 + 21 = 42
        expect(riskScore).toBe(42);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('submitXRPLTransaction', () => {
      it('should submit XRPL transaction successfully', async () => {
        const mockTransaction = { TransactionType: 'Payment' };
        const mockWallet = {
          sign: jest.fn().mockReturnValue({ tx_blob: 'signed_tx' })
        };

        mockXrplClient.autofill.mockResolvedValue({ ...mockTransaction, prepared: true });
        mockXrplClient.submitAndWait.mockResolvedValue({
          result: {
            hash: 'success_hash',
            meta: { TransactionResult: 'tesSUCCESS' }
          }
        });

        const result = await dualTokenService.submitXRPLTransaction(mockTransaction, mockWallet);

        expect(result.result.hash).toBe('success_hash');
        expect(mockXrplClient.autofill).toHaveBeenCalledWith(mockTransaction);
        expect(mockWallet.sign).toHaveBeenCalled();
        expect(mockXrplClient.submitAndWait).toHaveBeenCalledWith('signed_tx');
      });

      it('should handle transaction failures', async () => {
        const mockTransaction = { TransactionType: 'Payment' };
        const mockWallet = { sign: jest.fn().mockReturnValue({ tx_blob: 'signed_tx' }) };

        mockXrplClient.autofill.mockResolvedValue(mockTransaction);
        mockXrplClient.submitAndWait.mockResolvedValue({
          result: {
            meta: { TransactionResult: 'tecINSUF_RESERVE_LINE' }
          }
        });

        await expect(
          dualTokenService.submitXRPLTransaction(mockTransaction, mockWallet)
        ).rejects.toThrow('XRPL transaction failed: tecINSUF_RESERVE_LINE');
      });
    });

    describe('disconnect', () => {
      it('should disconnect XRPL client safely', async () => {
        await dualTokenService.disconnect();

        expect(mockXrplClient.disconnect).toHaveBeenCalled();
      });

      it('should handle disconnect errors gracefully', async () => {
        mockXrplClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));

        // Should not throw
        await expect(dualTokenService.disconnect()).resolves.toBeUndefined();
      });

      it('should handle already disconnected client', async () => {
        mockXrplClient.isConnected.mockReturnValue(false);

        await dualTokenService.disconnect();

        expect(mockXrplClient.disconnect).not.toHaveBeenCalled();
      });
    });
  });
});