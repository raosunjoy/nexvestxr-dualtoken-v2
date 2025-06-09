import { XummSdk } from 'xumm-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import config from '../config';
import { apiService } from './ApiService';

class XummService {
  constructor() {
    this.sdk = null;
    this.isInitialized = false;
    this.currentSession = null;
    this.listeners = [];
  }

  // Initialize XUMM SDK
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Get XUMM credentials from backend for security
      const credentials = await apiService.getXummCredentials();
      
      if (!credentials.success) {
        throw new Error('Failed to get XUMM credentials');
      }

      this.sdk = new XummSdk(credentials.data.apiKey, credentials.data.apiSecret);
      
      // Test connection
      const ping = await this.sdk.ping();
      
      if (ping.pong) {
        this.isInitialized = true;
        console.log('XUMM SDK initialized successfully');
        return true;
      } else {
        throw new Error('XUMM SDK ping failed');
      }
    } catch (error) {
      console.error('XUMM initialization error:', error);
      this.isInitialized = false;
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

  // Check if user has an active XUMM session
  async hasActiveSession() {
    try {
      const sessionData = await AsyncStorage.getItem(config.STORAGE_KEYS.XUMM_SESSION);
      if (sessionData) {
        this.currentSession = JSON.parse(sessionData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking XUMM session:', error);
      return false;
    }
  }

  // Store XUMM session data
  async storeSession(sessionData) {
    try {
      this.currentSession = sessionData;
      await AsyncStorage.setItem(config.STORAGE_KEYS.XUMM_SESSION, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error storing XUMM session:', error);
      throw error;
    }
  }

  // Clear XUMM session
  async clearSession() {
    try {
      this.currentSession = null;
      await AsyncStorage.removeItem(config.STORAGE_KEYS.XUMM_SESSION);
    } catch (error) {
      console.error('Error clearing XUMM session:', error);
    }
  }

  // Get current session data
  getCurrentSession() {
    return this.currentSession;
  }

  // Connect to XUMM wallet
  async connectWallet() {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize XUMM SDK');
        }
      }

      // Create sign request for wallet connection
      const request = {
        txjson: {
          TransactionType: 'SignIn',
        },
        options: {
          submit: false,
          return_url: {
            app: config.XUMM.REDIRECT_URL,
          },
        },
      };

      const payload = await this.sdk.payload.create(request);

      if (!payload.uuid) {
        throw new Error('Failed to create XUMM payload');
      }

      // Open XUMM app
      const canOpen = await Linking.canOpenURL(payload.next.always);
      if (canOpen) {
        await Linking.openURL(payload.next.always);
      } else {
        // Fallback to browser
        await Linking.openURL(payload.refs.qr_uri);
      }

      // Poll for result
      const result = await this.pollPayloadResult(payload.uuid);
      
      if (result.response.resolved && result.response.signed) {
        const sessionData = {
          account: result.response.account,
          uuid: payload.uuid,
          connected: true,
          connectedAt: new Date().toISOString(),
        };

        await this.storeSession(sessionData);
        this.notifyListeners('wallet_connected', sessionData);

        return {
          success: true,
          account: result.response.account,
          session: sessionData,
        };
      } else {
        throw new Error('Wallet connection was not signed');
      }
    } catch (error) {
      console.error('XUMM wallet connection error:', error);
      this.notifyListeners('wallet_error', { error: error.message });
      return {
        success: false,
        message: error.message || 'Wallet connection failed',
      };
    }
  }

  // Disconnect wallet
  async disconnectWallet() {
    try {
      await this.clearSession();
      this.notifyListeners('wallet_disconnected', {});
      return { success: true };
    } catch (error) {
      console.error('Wallet disconnect error:', error);
      return {
        success: false,
        message: error.message || 'Wallet disconnect failed',
      };
    }
  }

  // Sign transaction with XUMM
  async signTransaction(txjson, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('XUMM SDK not initialized');
      }

      if (!this.currentSession || !this.currentSession.connected) {
        throw new Error('No active wallet session');
      }

      const request = {
        txjson,
        options: {
          submit: options.submit !== false, // Default to true
          return_url: {
            app: config.XUMM.REDIRECT_URL,
          },
          ...options,
        },
      };

      const payload = await this.sdk.payload.create(request);

      if (!payload.uuid) {
        throw new Error('Failed to create XUMM payload');
      }

      // Open XUMM app
      const canOpen = await Linking.canOpenURL(payload.next.always);
      if (canOpen) {
        await Linking.openURL(payload.next.always);
      } else {
        await Linking.openURL(payload.refs.qr_uri);
      }

      // Poll for result
      const result = await this.pollPayloadResult(payload.uuid);

      if (result.response.resolved && result.response.signed) {
        this.notifyListeners('transaction_signed', {
          txid: result.response.txid,
          account: result.response.account,
          payload: payload.uuid,
        });

        return {
          success: true,
          txid: result.response.txid,
          account: result.response.account,
          dispatched: result.response.dispatched,
        };
      } else {
        throw new Error('Transaction was not signed');
      }
    } catch (error) {
      console.error('XUMM transaction signing error:', error);
      this.notifyListeners('transaction_error', { error: error.message });
      return {
        success: false,
        message: error.message || 'Transaction signing failed',
      };
    }
  }

  // Poll payload result
  async pollPayloadResult(uuid, maxAttempts = 30, interval = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.sdk.payload.get(uuid);
        
        if (result.meta.resolved) {
          return result;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error('Polling error:', error);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error('Polling timeout - payload not resolved');
  }

  // Get account info
  async getAccountInfo(account = null) {
    try {
      const targetAccount = account || this.currentSession?.account;
      
      if (!targetAccount) {
        throw new Error('No account specified');
      }

      if (!this.isInitialized) {
        throw new Error('XUMM SDK not initialized');
      }

      const accountInfo = await this.sdk.storage.account.get(targetAccount);
      
      return {
        success: true,
        data: accountInfo,
      };
    } catch (error) {
      console.error('Get account info error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get account info',
      };
    }
  }

  // Send XRP payment
  async sendXRPPayment(destination, amount, destinationTag = null, memo = null) {
    try {
      if (!this.currentSession || !this.currentSession.account) {
        throw new Error('No active wallet session');
      }

      const txjson = {
        TransactionType: 'Payment',
        Account: this.currentSession.account,
        Destination: destination,
        Amount: String(Math.floor(amount * 1000000)), // Convert XRP to drops
      };

      if (destinationTag) {
        txjson.DestinationTag = destinationTag;
      }

      if (memo) {
        txjson.Memos = [{
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
          },
        }];
      }

      return await this.signTransaction(txjson);
    } catch (error) {
      console.error('Send XRP payment error:', error);
      return {
        success: false,
        message: error.message || 'XRP payment failed',
      };
    }
  }

  // Send token payment (IOU)
  async sendTokenPayment(destination, amount, currency, issuer, destinationTag = null, memo = null) {
    try {
      if (!this.currentSession || !this.currentSession.account) {
        throw new Error('No active wallet session');
      }

      const txjson = {
        TransactionType: 'Payment',
        Account: this.currentSession.account,
        Destination: destination,
        Amount: {
          currency: currency,
          value: String(amount),
          issuer: issuer,
        },
      };

      if (destinationTag) {
        txjson.DestinationTag = destinationTag;
      }

      if (memo) {
        txjson.Memos = [{
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
          },
        }];
      }

      return await this.signTransaction(txjson);
    } catch (error) {
      console.error('Send token payment error:', error);
      return {
        success: false,
        message: error.message || 'Token payment failed',
      };
    }
  }

  // Create trust line for token
  async createTrustLine(currency, issuer, limit = '1000000000') {
    try {
      if (!this.currentSession || !this.currentSession.account) {
        throw new Error('No active wallet session');
      }

      const txjson = {
        TransactionType: 'TrustSet',
        Account: this.currentSession.account,
        LimitAmount: {
          currency: currency,
          value: limit,
          issuer: issuer,
        },
      };

      return await this.signTransaction(txjson);
    } catch (error) {
      console.error('Create trust line error:', error);
      return {
        success: false,
        message: error.message || 'Trust line creation failed',
      };
    }
  }

  // Get wallet balance
  async getWalletBalance(account = null) {
    try {
      const targetAccount = account || this.currentSession?.account;
      
      if (!targetAccount) {
        throw new Error('No account specified');
      }

      // Use backend API to get comprehensive balance info
      const response = await apiService.getWalletBalance();
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || 'Failed to get balance');
      }
    } catch (error) {
      console.error('Get wallet balance error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get wallet balance',
      };
    }
  }

  // Validate XRP address
  isValidXRPAddress(address) {
    try {
      return /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address);
    } catch (error) {
      return false;
    }
  }

  // Convert XRP to drops
  xrpToDrops(xrp) {
    return Math.floor(xrp * 1000000);
  }

  // Convert drops to XRP
  dropsToXrp(drops) {
    return parseFloat(drops) / 1000000;
  }

  // Format amount for display
  formatAmount(amount, currency = 'XRP') {
    if (currency === 'XRP') {
      return `${parseFloat(amount).toFixed(6)} XRP`;
    } else {
      return `${parseFloat(amount).toFixed(2)} ${currency}`;
    }
  }
}

// Create and export singleton instance
export const xummService = new XummService();
export default xummService;