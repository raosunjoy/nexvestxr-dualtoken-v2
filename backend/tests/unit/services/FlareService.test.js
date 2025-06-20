// Mock winston first
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

jest.mock('winston', () => ({
  createLogger: jest.fn(() => mockLogger),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}));

// Mock ethers
jest.mock('ethers');

const FlareService = require('../../../src/services/FlareService');
const { ethers } = require('ethers');

describe('FlareService', () => {
  let flareService;
  let mockProvider;
  let mockWallet;
  let mockContract;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock provider
    mockProvider = {
      getBlockNumber: jest.fn().mockResolvedValue(12345),
      getBalance: jest.fn().mockResolvedValue(ethers.parseEther('10')),
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: ethers.parseUnits('20', 'gwei'),
        maxFeePerGas: ethers.parseUnits('25', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
      }),
      getNetwork: jest.fn().mockResolvedValue({
        name: 'flare-coston',
        chainId: 16n
      }),
      getTransaction: jest.fn(),
      getTransactionReceipt: jest.fn()
    };
    ethers.JsonRpcProvider.mockReturnValue(mockProvider);

    // Mock wallet
    mockWallet = {
      address: '0x566DFE7324EBe4c3f62ca826ABD85c625eB3434B',
      connect: jest.fn()
    };
    ethers.Wallet.mockReturnValue(mockWallet);

    // Mock contract
    mockContract = {
      name: jest.fn().mockResolvedValue('PropertyToken'),
      symbol: jest.fn().mockResolvedValue('PROP'),
      tokenizeProperty: {
        estimateGas: jest.fn().mockResolvedValue(BigInt(300000))
      },
      purchaseTokens: {
        estimateGas: jest.fn().mockResolvedValue(BigInt(200000))
      },
      tokenBalances: jest.fn(),
      properties: jest.fn(),
      interface: {
        parseLog: jest.fn()
      }
    };
    ethers.Contract.mockReturnValue(mockContract);

    // Mock environment variables
    process.env.FLARE_NETWORK = 'coston';
    process.env.FLARE_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.FLARE_PROPERTY_CONTRACT_ADDRESS = '0x748447CCcDe0C94436Ca6200a703683a41e83913';

    flareService = new FlareService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.FLARE_NETWORK;
    delete process.env.FLARE_PRIVATE_KEY;
    delete process.env.FLARE_PROPERTY_CONTRACT_ADDRESS;
    delete process.env.FLARE_RPC_URL;
  });

  describe('Initialization', () => {
    describe('initialize', () => {
      it('should initialize successfully with all configurations', async () => {
        const result = await flareService.initialize();

        expect(result).toBe(true);
        expect(ethers.JsonRpcProvider).toHaveBeenCalled();
        expect(ethers.Wallet).toHaveBeenCalledWith(
          process.env.FLARE_PRIVATE_KEY,
          mockProvider
        );
        expect(ethers.Contract).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Connected to Flare network',
          expect.objectContaining({
            network: 'Flare Coston Testnet',
            blockNumber: 12345,
            chainId: 16
          })
        );
      });

      it('should initialize with custom RPC URL', async () => {
        process.env.FLARE_RPC_URL = 'https://custom-rpc.flare.network';

        await flareService.initialize();

        expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(
          'https://custom-rpc.flare.network'
        );
      });

      it('should throw error for unsupported network', async () => {
        process.env.FLARE_NETWORK = 'unsupported';

        await expect(flareService.initialize()).rejects.toThrow(
          'Unsupported network: unsupported'
        );
      });

      it('should initialize without wallet if no private key', async () => {
        delete process.env.FLARE_PRIVATE_KEY;

        const result = await flareService.initialize();

        expect(result).toBe(true);
        expect(ethers.Wallet).not.toHaveBeenCalled();
      });

      it('should initialize without contract if no address provided', async () => {
        delete process.env.FLARE_PROPERTY_CONTRACT_ADDRESS;

        const result = await flareService.initialize();

        expect(result).toBe(true);
        // Contract should still be called for wallet initialization
        expect(ethers.Contract).toHaveBeenCalledTimes(1);
      });

      it('should handle provider connection errors', async () => {
        mockProvider.getBlockNumber.mockRejectedValue(new Error('Connection failed'));

        await expect(flareService.initialize()).rejects.toThrow('Connection failed');
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to initialize Flare service',
          expect.objectContaining({
            error: 'Connection failed'
          })
        );
      });
    });
  });

  describe('Property Tokenization', () => {
    beforeEach(async () => {
      await flareService.initialize();
    });

    describe('tokenizeProperty', () => {
      it('should tokenize property successfully', async () => {
        const mockTx = {
          hash: '0xabc123',
          wait: jest.fn().mockResolvedValue({
            hash: '0xabc123',
            blockNumber: 12346,
            gasUsed: BigInt(280000),
            status: 1,
            logs: [{
              topics: ['0x...'],
              data: '0x...'
            }]
          })
        };

        mockContract.tokenizeProperty = jest.fn().mockResolvedValue(mockTx);
        mockContract.interface.parseLog.mockReturnValue({
          name: 'PropertyTokenized',
          args: { tokenId: BigInt(1) }
        });

        const result = await flareService.tokenizeProperty(
          'QmTestIPFSHash',
          10000000,
          1000000,
          'user123'
        );

        expect(result.success).toBe(true);
        expect(result.transactionHash).toBe('0xabc123');
        expect(result.tokenId).toBe('1');
        expect(result.ipfsHash).toBe('QmTestIPFSHash');
        expect(result.totalValue).toBe(10000000);
        expect(result.totalTokens).toBe(1000000);
        expect(result.status).toBe('confirmed');

        expect(mockContract.tokenizeProperty).toHaveBeenCalledWith(
          'QmTestIPFSHash',
          10000000,
          1000000,
          expect.objectContaining({
            gasLimit: expect.any(BigInt),
            gasPrice: expect.any(BigInt)
          })
        );
      });

      it('should validate required inputs', async () => {
        await expect(
          flareService.tokenizeProperty('', 10000000, 1000000, 'user123')
        ).rejects.toThrow('IPFS hash is required');

        await expect(
          flareService.tokenizeProperty('QmTest', 0, 1000000, 'user123')
        ).rejects.toThrow('Total value must be greater than 0');

        await expect(
          flareService.tokenizeProperty('QmTest', 10000000, 0, 'user123')
        ).rejects.toThrow('Total tokens must be greater than 0');
      });

      it('should throw error if contract not initialized', async () => {
        flareService.propertyContract = null;

        await expect(
          flareService.tokenizeProperty('QmTest', 10000000, 1000000, 'user123')
        ).rejects.toThrow('PropertyToken contract not initialized');
      });

      it('should throw error if wallet not initialized', async () => {
        flareService.wallet = null;

        await expect(
          flareService.tokenizeProperty('QmTest', 10000000, 1000000, 'user123')
        ).rejects.toThrow('Wallet not initialized - FLARE_PRIVATE_KEY required');
      });

      it('should handle gas estimation errors', async () => {
        mockContract.tokenizeProperty.estimateGas.mockRejectedValue(
          new Error('Gas estimation failed')
        );

        await expect(
          flareService.tokenizeProperty('QmTest', 10000000, 1000000, 'user123')
        ).rejects.toThrow('Gas estimation failed');
      });

      it('should handle insufficient funds error', async () => {
        const error = new Error('Insufficient funds');
        error.code = 'INSUFFICIENT_FUNDS';
        mockContract.tokenizeProperty.mockRejectedValue(error);

        await expect(
          flareService.tokenizeProperty('QmTest', 10000000, 1000000, 'user123')
        ).rejects.toThrow('Insufficient balance for gas fees');
      });

      it('should handle unpredictable gas limit error', async () => {
        const error = new Error('Cannot estimate gas');
        error.code = 'UNPREDICTABLE_GAS_LIMIT';
        mockContract.tokenizeProperty.mockRejectedValue(error);

        await expect(
          flareService.tokenizeProperty('QmTest', 10000000, 1000000, 'user123')
        ).rejects.toThrow('Transaction would fail - check contract permissions');
      });

      it('should handle contract revert error', async () => {
        mockContract.tokenizeProperty.mockRejectedValue(
          new Error('execution reverted: insufficient permissions')
        );

        await expect(
          flareService.tokenizeProperty('QmTest', 10000000, 1000000, 'user123')
        ).rejects.toThrow('Smart contract execution failed - check tokenization permissions');
      });
    });
  });

  describe('Property Token Purchase', () => {
    beforeEach(async () => {
      await flareService.initialize();
    });

    describe('purchasePropertyTokens', () => {
      it('should purchase property tokens successfully', async () => {
        const mockTx = {
          hash: '0xdef456',
          wait: jest.fn().mockResolvedValue({
            hash: '0xdef456',
            blockNumber: 12347,
            gasUsed: BigInt(180000),
            status: 1
          })
        };

        mockContract.purchaseTokens = jest.fn().mockResolvedValue(mockTx);
        mockContract.tokenBalances.mockResolvedValue(BigInt(150));

        const result = await flareService.purchasePropertyTokens(
          '1',
          100,
          '0.5',
          'user123'
        );

        expect(result.success).toBe(true);
        expect(result.transactionHash).toBe('0xdef456');
        expect(result.tokenId).toBe('1');
        expect(result.amount).toBe(100);
        expect(result.paymentValue).toBe('0.5');
        expect(result.newBalance).toBe('150');

        expect(mockContract.purchaseTokens).toHaveBeenCalledWith(
          '1',
          100,
          expect.objectContaining({
            value: ethers.parseEther('0.5'),
            gasLimit: expect.any(BigInt),
            gasPrice: expect.any(BigInt)
          })
        );
      });

      it('should validate purchase inputs', async () => {
        await expect(
          flareService.purchasePropertyTokens(0, 100, '0.5', 'user123')
        ).rejects.toThrow('Valid token ID is required');

        await expect(
          flareService.purchasePropertyTokens('1', 0, '0.5', 'user123')
        ).rejects.toThrow('Amount must be greater than 0');

        await expect(
          flareService.purchasePropertyTokens('1', 100, '0', 'user123')
        ).rejects.toThrow('Payment value must be greater than 0');
      });

      it('should handle insufficient funds for purchase', async () => {
        const error = new Error('Insufficient funds');
        error.code = 'INSUFFICIENT_FUNDS';
        mockContract.purchaseTokens.mockRejectedValue(error);

        await expect(
          flareService.purchasePropertyTokens('1', 100, '0.5', 'user123')
        ).rejects.toThrow('Insufficient balance for purchase or gas fees');
      });
    });
  });

  describe('Property Information Queries', () => {
    beforeEach(async () => {
      await flareService.initialize();
    });

    describe('getPropertyTokenBalance', () => {
      it('should return property token balance', async () => {
        mockContract.tokenBalances.mockResolvedValue(BigInt(250));

        const result = await flareService.getPropertyTokenBalance(
          '1',
          '0x566DFE7324EBe4c3f62ca826ABD85c625eB3434B'
        );

        expect(result.tokenId).toBe('1');
        expect(result.address).toBe('0x566DFE7324EBe4c3f62ca826ABD85c625eB3434B');
        expect(result.balance).toBe('250');
      });

      it('should validate address format', async () => {
        await expect(
          flareService.getPropertyTokenBalance('1', 'invalid-address')
        ).rejects.toThrow('Invalid address');
      });

      it('should handle contract query errors', async () => {
        mockContract.tokenBalances.mockRejectedValue(new Error('Contract error'));

        await expect(
          flareService.getPropertyTokenBalance('1', '0x566DFE7324EBe4c3f62ca826ABD85c625eB3434B')
        ).rejects.toThrow('Contract error');
      });
    });

    describe('getPropertyInfo', () => {
      it('should return property information', async () => {
        mockContract.properties.mockResolvedValue([
          'QmTestIPFSHash',
          BigInt(10000000),
          BigInt(1000000),
          BigInt(500000),
          '0xDeveloperAddress',
          true
        ]);

        const result = await flareService.getPropertyInfo('1');

        expect(result.tokenId).toBe('1');
        expect(result.ipfsHash).toBe('QmTestIPFSHash');
        expect(result.totalValue).toBe('10000000');
        expect(result.totalTokens).toBe('1000000');
        expect(result.tokensSold).toBe('500000');
        expect(result.developer).toBe('0xDeveloperAddress');
        expect(result.isActive).toBe(true);
      });

      it('should handle property query errors', async () => {
        mockContract.properties.mockRejectedValue(new Error('Property not found'));

        await expect(flareService.getPropertyInfo('999')).rejects.toThrow('Property not found');
      });
    });
  });

  describe('Transaction Queries', () => {
    beforeEach(async () => {
      await flareService.initialize();
    });

    describe('getTransaction', () => {
      it('should return transaction details', async () => {
        const mockTx = {
          hash: '0xabc123',
          from: '0xSender',
          to: '0xReceiver',
          value: ethers.parseEther('1'),
          gasLimit: BigInt(300000),
          gasPrice: ethers.parseUnits('20', 'gwei'),
          confirmations: jest.fn().mockResolvedValue(10)
        };

        const mockReceipt = {
          gasUsed: BigInt(280000),
          blockNumber: 12345,
          status: 1
        };

        mockProvider.getTransaction.mockResolvedValue(mockTx);
        mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt);

        const result = await flareService.getTransaction('0xabc123');

        expect(result.hash).toBe('0xabc123');
        expect(result.from).toBe('0xSender');
        expect(result.to).toBe('0xReceiver');
        expect(result.value).toBe('1.0');
        expect(result.blockNumber).toBe(12345);
        expect(result.confirmations).toBe(10);
        expect(result.status).toBe('success');
      });

      it('should handle failed transactions', async () => {
        const mockTx = {
          hash: '0xfailed123',
          from: '0xSender',
          to: '0xReceiver',
          value: ethers.parseEther('1'),
          gasLimit: BigInt(300000),
          gasPrice: ethers.parseUnits('20', 'gwei'),
          confirmations: jest.fn().mockResolvedValue(5)
        };

        const mockReceipt = {
          gasUsed: BigInt(21000),
          blockNumber: 12345,
          status: 0
        };

        mockProvider.getTransaction.mockResolvedValue(mockTx);
        mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt);

        const result = await flareService.getTransaction('0xfailed123');

        expect(result.status).toBe('failed');
      });

      it('should handle pending transactions', async () => {
        const mockTx = {
          hash: '0xpending123',
          from: '0xSender',
          to: '0xReceiver',
          value: ethers.parseEther('1'),
          gasLimit: BigInt(300000),
          gasPrice: ethers.parseUnits('20', 'gwei'),
          confirmations: jest.fn().mockResolvedValue(0)
        };

        mockProvider.getTransaction.mockResolvedValue(mockTx);
        mockProvider.getTransactionReceipt.mockResolvedValue(null);

        const result = await flareService.getTransaction('0xpending123');

        expect(result.confirmations).toBe(0);
        expect(result.blockNumber).toBeUndefined();
      });
    });
  });

  describe('Network Information', () => {
    beforeEach(async () => {
      await flareService.initialize();
    });

    describe('getNetworkInfo', () => {
      it('should return network information', async () => {
        const result = await flareService.getNetworkInfo();

        expect(result.name).toBe('flare-coston');
        expect(result.chainId).toBe(16);
        expect(result.blockNumber).toBe(12345);
        expect(result.gasPrice).toBe(ethers.parseUnits('20', 'gwei').toString());
        expect(result.maxFeePerGas).toBe(ethers.parseUnits('25', 'gwei').toString());
        expect(result.maxPriorityFeePerGas).toBe(ethers.parseUnits('2', 'gwei').toString());
      });

      it('should handle network query errors', async () => {
        mockProvider.getNetwork.mockRejectedValue(new Error('Network error'));

        await expect(flareService.getNetworkInfo()).rejects.toThrow('Network error');
      });
    });
  });

  describe('Token Deployment', () => {
    beforeEach(async () => {
      await flareService.initialize();
    });

    describe('deployToken', () => {
      it('should throw error for unimplemented deployment', async () => {
        await expect(
          flareService.deployToken('TestToken', 'TT', 18, '1000000')
        ).rejects.toThrow('Contract deployment requires proper Solidity compilation setup');
      });

      it('should validate wallet requirement', async () => {
        flareService.wallet = null;

        await expect(
          flareService.deployToken('TestToken', 'TT', 18, '1000000')
        ).rejects.toThrow('Wallet not initialized - FLARE_PRIVATE_KEY required');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle contract not initialized errors', async () => {
      const flareServiceNoContract = new FlareService();
      flareServiceNoContract.propertyContract = null;

      await expect(
        flareServiceNoContract.getPropertyInfo('1')
      ).rejects.toThrow('PropertyToken contract not initialized');
    });

    it('should log detailed error information', async () => {
      await flareService.initialize();
      mockContract.tokenizeProperty.mockRejectedValue(new Error('Test error'));

      await expect(
        flareService.tokenizeProperty('QmTest', 10000000, 1000000, 'user123')
      ).rejects.toThrow('Test error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Property tokenization failed',
        expect.objectContaining({
          userId: 'user123',
          ipfsHash: 'QmTest',
          error: 'Test error'
        })
      );
    });
  });
});