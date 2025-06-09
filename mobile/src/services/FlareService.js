import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';
import { apiService } from './ApiService';

// Property Token ABI (simplified - should match smart contract)
const PROPERTY_TOKEN_ABI = [
  'function mint(address to, uint256 tokenId, string memory propertyData) external',
  'function transfer(address to, uint256 tokenId) external',
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function getPropertyData(uint256 tokenId) external view returns (string memory)',
  'function totalSupply() external view returns (uint256)',
  'function tokenByIndex(uint256 index) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event PropertyTokenized(uint256 indexed tokenId, address indexed owner, string propertyData)',
];

class FlareService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.isConnected = false;
    this.networkInfo = null;
    this.contracts = {};
    this.listeners = [];
  }

  // Initialize Flare connection
  async initialize() {
    try {
      // Create provider
      this.provider = new ethers.providers.JsonRpcProvider(config.FLARE.RPC_URL);
      
      // Test connection
      const network = await this.provider.getNetwork();
      
      if (network.chainId !== config.FLARE.CHAIN_ID) {
        throw new Error(`Wrong network. Expected ${config.FLARE.CHAIN_ID}, got ${network.chainId}`);
      }

      this.networkInfo = network;
      this.isConnected = true;

      console.log('Flare Network connected:', network);
      this.notifyListeners('network_connected', network);

      return true;
    } catch (error) {
      console.error('Flare Network initialization error:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Event listener management
  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => listener(event, data));
  }

  // Get network info
  async getNetworkInfo() {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const response = await apiService.getNetworkInfo();
      
      if (response.success) {
        return {
          success: true,
          data: {
            ...response.data,
            chainId: this.networkInfo?.chainId,
            networkName: this.networkInfo?.name,
          },
        };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Get network info error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get network info',
      };
    }
  }

  // Connect wallet to Flare Network
  async connectWallet(privateKey) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      // Create wallet from private key
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Get wallet address
      const address = await this.signer.getAddress();
      
      // Get balance
      const balance = await this.provider.getBalance(address);
      
      // Store wallet info
      await AsyncStorage.setItem(config.STORAGE_KEYS.WALLET_ADDRESS, address);
      
      this.notifyListeners('wallet_connected', {
        address,
        balance: ethers.utils.formatEther(balance),
      });

      return {
        success: true,
        address,
        balance: ethers.utils.formatEther(balance),
      };
    } catch (error) {
      console.error('Wallet connection error:', error);
      return {
        success: false,
        message: error.message || 'Wallet connection failed',
      };
    }
  }

  // Get wallet balance
  async getWalletBalance(address = null) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const targetAddress = address || await AsyncStorage.getItem(config.STORAGE_KEYS.WALLET_ADDRESS);
      
      if (!targetAddress) {
        throw new Error('No wallet address found');
      }

      const balance = await this.provider.getBalance(targetAddress);
      
      return {
        success: true,
        data: {
          address: targetAddress,
          balance: ethers.utils.formatEther(balance),
          balanceWei: balance.toString(),
        },
      };
    } catch (error) {
      console.error('Get wallet balance error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get wallet balance',
      };
    }
  }

  // Get property token contract
  getPropertyTokenContract(contractAddress) {
    if (!this.contracts[contractAddress]) {
      this.contracts[contractAddress] = new ethers.Contract(
        contractAddress,
        PROPERTY_TOKEN_ABI,
        this.signer || this.provider
      );
    }
    return this.contracts[contractAddress];
  }

  // Tokenize property
  async tokenizeProperty(propertyData) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      // Call backend API to handle tokenization
      const response = await apiService.tokenizeProperty(propertyData);
      
      if (!response.success) {
        throw new Error(response.message || 'Tokenization failed');
      }

      this.notifyListeners('property_tokenized', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Property tokenization error:', error);
      return {
        success: false,
        message: error.message || 'Property tokenization failed',
      };
    }
  }

  // Purchase property tokens
  async purchaseTokens(purchaseData) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      // Call backend API to handle purchase
      const response = await apiService.purchaseTokens(purchaseData);
      
      if (!response.success) {
        throw new Error(response.message || 'Token purchase failed');
      }

      this.notifyListeners('tokens_purchased', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Token purchase error:', error);
      return {
        success: false,
        message: error.message || 'Token purchase failed',
      };
    }
  }

  // Get token balance for specific property
  async getTokenBalance(tokenId, address = null) {
    try {
      const targetAddress = address || await AsyncStorage.getItem(config.STORAGE_KEYS.WALLET_ADDRESS);
      
      if (!targetAddress) {
        throw new Error('No wallet address found');
      }

      const response = await apiService.getTokenBalance(tokenId, targetAddress);
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Get token balance error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get token balance',
      };
    }
  }

  // Get property information
  async getPropertyInfo(tokenId) {
    try {
      const response = await apiService.getPropertyInfo(tokenId);
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Get property info error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get property info',
      };
    }
  }

  // Mint tokens (for authorized users)
  async mintTokens(mintData) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      const response = await apiService.mintTokens(mintData);
      
      if (!response.success) {
        throw new Error(response.message || 'Token minting failed');
      }

      this.notifyListeners('tokens_minted', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Token minting error:', error);
      return {
        success: false,
        message: error.message || 'Token minting failed',
      };
    }
  }

  // Transfer tokens
  async transferTokens(contractAddress, to, tokenId) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      const contract = this.getPropertyTokenContract(contractAddress);
      
      // Check if we're connected with signer
      if (!contract.signer) {
        throw new Error('Contract not connected with signer');
      }

      // Estimate gas
      const gasLimit = await contract.estimateGas.transfer(to, tokenId);
      
      // Execute transfer
      const tx = await contract.transfer(to, tokenId, {
        gasLimit: gasLimit.mul(110).div(100), // Add 10% buffer
      });

      this.notifyListeners('transfer_initiated', {
        txHash: tx.hash,
        to,
        tokenId,
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      this.notifyListeners('transfer_completed', {
        txHash: receipt.transactionHash,
        to,
        tokenId,
        blockNumber: receipt.blockNumber,
      });

      return {
        success: true,
        data: {
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        },
      };
    } catch (error) {
      console.error('Token transfer error:', error);
      return {
        success: false,
        message: error.message || 'Token transfer failed',
      };
    }
  }

  // Get user's token portfolio
  async getUserTokens(address = null) {
    try {
      const targetAddress = address || await AsyncStorage.getItem(config.STORAGE_KEYS.WALLET_ADDRESS);
      
      if (!targetAddress) {
        throw new Error('No wallet address found');
      }

      // Get tokens from backend API
      const response = await apiService.get('/api/user/tokens', { address: targetAddress });
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Get user tokens error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get user tokens',
      };
    }
  }

  // Get transaction history
  async getTransactionHistory(address = null, page = 1, limit = 20) {
    try {
      const targetAddress = address || await AsyncStorage.getItem(config.STORAGE_KEYS.WALLET_ADDRESS);
      
      if (!targetAddress) {
        throw new Error('No wallet address found');
      }

      const response = await apiService.get('/api/user/transactions', {
        address: targetAddress,
        page,
        limit,
      });
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Get transaction history error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get transaction history',
      };
    }
  }

  // Listen to contract events
  async listenToEvents(contractAddress, eventFilter = {}) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const contract = this.getPropertyTokenContract(contractAddress);
      
      // Listen to Transfer events
      contract.on('Transfer', (from, to, tokenId, event) => {
        this.notifyListeners('token_transfer', {
          from,
          to,
          tokenId: tokenId.toString(),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });

      // Listen to PropertyTokenized events
      contract.on('PropertyTokenized', (tokenId, owner, propertyData, event) => {
        this.notifyListeners('property_tokenized_event', {
          tokenId: tokenId.toString(),
          owner,
          propertyData,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Event listening error:', error);
      return {
        success: false,
        message: error.message || 'Failed to setup event listening',
      };
    }
  }

  // Stop listening to events
  stopListening(contractAddress) {
    try {
      if (this.contracts[contractAddress]) {
        this.contracts[contractAddress].removeAllListeners();
      }
    } catch (error) {
      console.error('Stop listening error:', error);
    }
  }

  // Utility functions
  formatFlareAmount(amount, decimals = 18) {
    return ethers.utils.formatUnits(amount, decimals);
  }

  parseFlareAmount(amount, decimals = 18) {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  isValidFlareAddress(address) {
    return ethers.utils.isAddress(address);
  }

  // Get gas price
  async getGasPrice() {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const gasPrice = await this.provider.getGasPrice();
      
      return {
        success: true,
        data: {
          gasPrice: gasPrice.toString(),
          gasPriceGwei: ethers.utils.formatUnits(gasPrice, 'gwei'),
        },
      };
    } catch (error) {
      console.error('Get gas price error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get gas price',
      };
    }
  }

  // Estimate transaction cost
  async estimateTransactionCost(contractAddress, method, params = []) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected');
      }

      const contract = this.getPropertyTokenContract(contractAddress);
      const gasLimit = await contract.estimateGas[method](...params);
      const gasPrice = await this.provider.getGasPrice();
      const cost = gasLimit.mul(gasPrice);

      return {
        success: true,
        data: {
          gasLimit: gasLimit.toString(),
          gasPrice: gasPrice.toString(),
          cost: ethers.utils.formatEther(cost),
          costWei: cost.toString(),
        },
      };
    } catch (error) {
      console.error('Estimate transaction cost error:', error);
      return {
        success: false,
        message: error.message || 'Failed to estimate transaction cost',
      };
    }
  }
}

// Create and export singleton instance
export const flareService = new FlareService();
export default flareService;