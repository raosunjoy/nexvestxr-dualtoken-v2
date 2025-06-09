const { ethers } = require('ethers');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// PropertyToken Contract ABI (ERC721 with property tokenization)
const PROPERTY_TOKEN_ABI = [
  // ERC721 standard functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data)",
  
  // PropertyToken specific functions
  "function tokenizeProperty(string memory ipfsHash, uint256 totalValue, uint256 totalTokens) returns (uint256)",
  "function purchaseTokens(uint256 tokenId, uint256 amount) payable",
  "function sellTokens(uint256 tokenId, uint256 amount)",
  "function deactivateProperty(uint256 tokenId)",
  "function properties(uint256) view returns (string, uint256, uint256, uint256, address, bool)",
  "function tokenBalances(uint256, address) view returns (uint256)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  "event PropertyTokenized(uint256 tokenId, string ipfsHash, uint256 totalValue, uint256 totalTokens, address developer)",
  "event TokensPurchased(uint256 tokenId, address buyer, uint256 amount)",
  "event TokensSold(uint256 tokenId, address seller, uint256 amount)"
];

class FlareService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.propertyContract = null;
    this.networkConfig = {
      // Flare Coston Testnet
      coston: {
        name: 'Flare Coston Testnet',
        chainId: 16,
        rpcUrl: 'https://coston-api.flare.network/ext/bc/C/rpc',
        blockExplorer: 'https://coston-explorer.flare.network',
        nativeCurrency: {
          name: 'Coston Flare',
          symbol: 'CFLR',
          decimals: 18
        }
      },
      // Flare Mainnet
      flare: {
        name: 'Flare Mainnet',
        chainId: 14,
        rpcUrl: 'https://flare-api.flare.network/ext/bc/C/rpc',
        blockExplorer: 'https://flare-explorer.flare.network',
        nativeCurrency: {
          name: 'Flare',
          symbol: 'FLR',
          decimals: 18
        }
      }
    };
  }

  /**
   * Initialize the Flare service with network configuration
   */
  async initialize() {
    try {
      const network = process.env.FLARE_NETWORK || 'coston';
      const config = this.networkConfig[network];
      
      if (!config) {
        throw new Error(`Unsupported network: ${network}`);
      }

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(
        process.env.FLARE_RPC_URL || config.rpcUrl
      );

      // Test provider connection
      const blockNumber = await this.provider.getBlockNumber();
      logger.info('Connected to Flare network', { 
        network: config.name, 
        blockNumber,
        chainId: config.chainId 
      });

      // Initialize wallet if private key is provided
      if (process.env.FLARE_PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.FLARE_PRIVATE_KEY, this.provider);
        logger.info('Wallet initialized', { 
          address: this.wallet.address 
        });

        // Check wallet balance
        const balance = await this.provider.getBalance(this.wallet.address);
        logger.info('Wallet balance', { 
          address: this.wallet.address,
          balance: ethers.formatEther(balance),
          symbol: config.nativeCurrency.symbol
        });
      }

      // Initialize PropertyToken contract if address is provided
      if (process.env.FLARE_PROPERTY_CONTRACT_ADDRESS) {
        this.propertyContract = new ethers.Contract(
          process.env.FLARE_PROPERTY_CONTRACT_ADDRESS,
          PROPERTY_TOKEN_ABI,
          this.wallet || this.provider
        );

        // Get contract info
        const [name, symbol] = await Promise.all([
          this.propertyContract.name(),
          this.propertyContract.symbol()
        ]);

        logger.info('PropertyToken contract initialized', {
          address: process.env.FLARE_PROPERTY_CONTRACT_ADDRESS,
          name,
          symbol
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize Flare service', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Tokenize a property (create a new property NFT)
   * @param {string} ipfsHash - IPFS hash containing property documents
   * @param {number} totalValue - Total property value in INR
   * @param {number} totalTokens - Total number of fractional tokens
   * @param {string} userId - User ID for logging
   * @returns {Object} Transaction result
   */
  async tokenizeProperty(ipfsHash, totalValue, totalTokens, userId) {
    try {
      if (!this.propertyContract) {
        throw new Error('PropertyToken contract not initialized');
      }

      if (!this.wallet) {
        throw new Error('Wallet not initialized - FLARE_PRIVATE_KEY required');
      }

      // Validate inputs
      if (!ipfsHash || ipfsHash.trim() === '') {
        throw new Error('IPFS hash is required');
      }

      if (totalValue <= 0) {
        throw new Error('Total value must be greater than 0');
      }

      if (totalTokens <= 0) {
        throw new Error('Total tokens must be greater than 0');
      }

      logger.info('Initiating property tokenization', {
        userId,
        ipfsHash,
        totalValue,
        totalTokens
      });

      // Estimate gas
      const gasEstimate = await this.propertyContract.tokenizeProperty.estimateGas(
        ipfsHash, 
        totalValue, 
        totalTokens
      );
      const gasPrice = await this.provider.getFeeData();

      logger.info('Gas estimation for tokenization', {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.gasPrice?.toString()
      });

      // Execute tokenization transaction
      const tx = await this.propertyContract.tokenizeProperty(ipfsHash, totalValue, totalTokens, {
        gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
        gasPrice: gasPrice.gasPrice
      });

      logger.info('Tokenization transaction submitted', {
        userId,
        txHash: tx.hash,
        ipfsHash,
        totalValue,
        totalTokens
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      // Parse logs to get the token ID
      let tokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.propertyContract.interface.parseLog(log);
          if (parsedLog.name === 'PropertyTokenized') {
            tokenId = parsedLog.args.tokenId.toString();
            break;
          }
        } catch (e) {
          // Ignore parsing errors for logs that don't match our interface
        }
      }

      logger.info('Property tokenization confirmed', {
        userId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        tokenId,
        status: receipt.status
      });

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        tokenId,
        ipfsHash,
        totalValue,
        totalTokens,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      };

    } catch (error) {
      logger.error('Property tokenization failed', {
        userId,
        ipfsHash,
        totalValue,
        totalTokens,
        error: error.message,
        stack: error.stack
      });

      // Handle specific error types
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient balance for gas fees');
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error('Transaction would fail - check contract permissions');
      } else if (error.message.includes('revert')) {
        throw new Error('Smart contract execution failed - check tokenization permissions');
      }

      throw error;
    }
  }

  /**
   * Purchase fractional tokens of a property
   * @param {string} tokenId - Property token ID
   * @param {number} amount - Number of fractional tokens to purchase
   * @param {string} paymentValue - Payment value in FLR (native currency)
   * @param {string} userId - User ID for logging
   * @returns {Object} Transaction result
   */
  async purchasePropertyTokens(tokenId, amount, paymentValue, userId) {
    try {
      if (!this.propertyContract) {
        throw new Error('PropertyToken contract not initialized');
      }

      if (!this.wallet) {
        throw new Error('Wallet not initialized - FLARE_PRIVATE_KEY required');
      }

      // Validate inputs
      if (!tokenId || tokenId <= 0) {
        throw new Error('Valid token ID is required');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (!paymentValue || parseFloat(paymentValue) <= 0) {
        throw new Error('Payment value must be greater than 0');
      }

      const paymentInWei = ethers.parseEther(paymentValue.toString());

      logger.info('Initiating property token purchase', {
        userId,
        tokenId,
        amount,
        paymentValue,
        paymentInWei: paymentInWei.toString()
      });

      // Estimate gas
      const gasEstimate = await this.propertyContract.purchaseTokens.estimateGas(
        tokenId, 
        amount,
        { value: paymentInWei }
      );
      const gasPrice = await this.provider.getFeeData();

      logger.info('Gas estimation for purchase', {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.gasPrice?.toString()
      });

      // Execute purchase transaction
      const tx = await this.propertyContract.purchaseTokens(tokenId, amount, {
        value: paymentInWei,
        gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
        gasPrice: gasPrice.gasPrice
      });

      logger.info('Purchase transaction submitted', {
        userId,
        txHash: tx.hash,
        tokenId,
        amount,
        paymentValue
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      logger.info('Property token purchase confirmed', {
        userId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        tokenId,
        amount,
        status: receipt.status
      });

      // Get updated token balance for the user
      const newBalance = await this.propertyContract.tokenBalances(tokenId, this.wallet.address);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        tokenId,
        amount,
        paymentValue,
        newBalance: newBalance.toString(),
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      };

    } catch (error) {
      logger.error('Property token purchase failed', {
        userId,
        tokenId,
        amount,
        paymentValue,
        error: error.message,
        stack: error.stack
      });

      // Handle specific error types
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient balance for purchase or gas fees');
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error('Transaction would fail - check token availability');
      } else if (error.message.includes('revert')) {
        throw new Error('Smart contract execution failed - check purchase conditions');
      }

      throw error;
    }
  }

  /**
   * Get property token balance for an address
   * @param {string} tokenId - Property token ID
   * @param {string} address - Address to check
   * @returns {Object} Balance information
   */
  async getPropertyTokenBalance(tokenId, address) {
    try {
      if (!this.propertyContract) {
        throw new Error('PropertyToken contract not initialized');
      }

      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address');
      }

      const balance = await this.propertyContract.tokenBalances(tokenId, address);
      
      return {
        tokenId,
        address,
        balance: balance.toString()
      };
    } catch (error) {
      logger.error('Failed to get property token balance', {
        tokenId,
        address,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get property information
   * @param {string} tokenId - Property token ID
   * @returns {Object} Property information
   */
  async getPropertyInfo(tokenId) {
    try {
      if (!this.propertyContract) {
        throw new Error('PropertyToken contract not initialized');
      }

      const property = await this.propertyContract.properties(tokenId);
      
      return {
        tokenId,
        ipfsHash: property[0],
        totalValue: property[1].toString(),
        totalTokens: property[2].toString(),
        tokensSold: property[3].toString(),
        developer: property[4],
        isActive: property[5]
      };
    } catch (error) {
      logger.error('Failed to get property info', {
        tokenId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get transaction details
   * @param {string} txHash - Transaction hash
   * @returns {Object} Transaction details
   */
  async getTransaction(txHash) {
    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash)
      ]);

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        gasUsed: receipt?.gasUsed?.toString(),
        blockNumber: receipt?.blockNumber,
        confirmations: receipt ? await tx.confirmations() : 0,
        status: receipt?.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      logger.error('Failed to get transaction', {
        txHash,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Deploy a new ERC20 token contract
   * @param {string} name - Token name
   * @param {string} symbol - Token symbol
   * @param {number} decimals - Token decimals
   * @param {string} initialSupply - Initial supply (in token units)
   * @returns {Object} Deployment result
   */
  async deployToken(name, symbol, decimals = 18, initialSupply = '0') {
    try {
      if (!this.wallet) {
        throw new Error('Wallet not initialized - FLARE_PRIVATE_KEY required');
      }

      // Simple ERC20 contract bytecode with minting capability
      // Note: In production, you should use a proper build system like Hardhat
      const contractFactory = new ethers.ContractFactory(
        TOKEN_ABI,
        // This is a simplified bytecode - in production, compile from Solidity source
        "0x608060405234801561001057600080fd5b50", // Placeholder bytecode
        this.wallet
      );

      logger.info('Deploying token contract', {
        name,
        symbol,
        decimals,
        initialSupply
      });

      // Note: This is a simplified example
      // In production, use proper contract compilation and deployment
      throw new Error('Contract deployment requires proper Solidity compilation setup');
      
    } catch (error) {
      logger.error('Token deployment failed', {
        name,
        symbol,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get network information
   * @returns {Object} Network details
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getFeeData();

      return {
        name: network.name,
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
      };
    } catch (error) {
      logger.error('Failed to get network info', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = FlareService;