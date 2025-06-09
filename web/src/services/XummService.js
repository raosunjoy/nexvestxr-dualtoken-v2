import { XummSdk } from 'xumm-sdk';
import api from './api';

class XummService {
  constructor() {
    this.sdk = null;
    this.isInitialized = false;
    this.currentSession = null;
    this.listeners = [];
    this.storageKey = 'nexvestxr_xumm_session';
  }

  // Initialize XUMM SDK for web
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Get XUMM credentials from backend
      let credentials;
      try {
        credentials = await api.getXummCredentials();
        
        if (!credentials.success || !credentials.data.apiKey) {
          console.warn('⚠️ XUMM credentials not available, using mock mode');
          return this.initializeMockMode();
        }
      } catch (error) {
        console.warn('⚠️ Cannot reach XUMM credentials endpoint, using mock mode');
        return this.initializeMockMode();
      }

      try {
        // Initialize XUMM SDK for web environment (read-only with API key)
        this.sdk = new XummSdk(credentials.data.apiKey);
        
        // Test connection
        const ping = await this.sdk.ping();
        
        if (ping.pong) {
          this.isInitialized = true;
          console.log('✅ XUMM SDK initialized successfully');
          
          // Restore session if exists
          await this.restoreSession();
          
          return true;
        } else {
          console.warn('⚠️ XUMM SDK ping failed, falling back to mock mode');
          return this.initializeMockMode();
        }
      } catch (sdkError) {
        console.warn('⚠️ XUMM SDK initialization failed, using mock mode:', sdkError.message);
        return this.initializeMockMode();
      }
    } catch (error) {
      console.error('❌ XUMM initialization error:', error);
      return this.initializeMockMode();
    }
  }
  
  // Initialize mock mode for development/testing
  initializeMockMode() {
    console.log('🧪 XUMM Service initialized in MOCK mode');
    this.isInitialized = true;
    this.mockMode = true;
    return true;
  }

  // Event listener management
  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Session management for web
  async hasActiveSession() {
    try {
      const sessionData = localStorage.getItem(this.storageKey);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        // Check if session is still valid (24 hours)
        const sessionAge = Date.now() - new Date(session.connectedAt).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge < maxAge) {
          this.currentSession = session;
          return true;
        } else {
          // Session expired, clear it
          await this.clearSession();
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking XUMM session:', error);
      return false;
    }
  }

  async storeSession(sessionData) {
    try {
      this.currentSession = sessionData;
      localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error storing XUMM session:', error);
      throw error;
    }
  }

  async clearSession() {
    try {
      this.currentSession = null;
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing XUMM session:', error);
    }
  }

  async restoreSession() {
    try {
      if (await this.hasActiveSession()) {
        this.notifyListeners('session_restored', this.currentSession);
        return this.currentSession;
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
    return null;
  }

  getCurrentSession() {
    return this.currentSession;
  }

  // Connect to XUMM wallet (web-specific implementation)
  async connectWallet() {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize XUMM SDK');
        }
      }

      // Handle mock mode
      if (this.mockMode) {
        return this.connectMockWallet();
      }

      // Create sign request for wallet connection
      const request = {
        txjson: {
          TransactionType: 'SignIn',
        },
        options: {
          submit: false,
          return_url: {
            web: window.location.origin + '/wallet-callback',
          },
        },
      };

      const payload = await this.sdk.payload.create(request);

      if (!payload.uuid) {
        throw new Error('Failed to create XUMM payload');
      }

      this.notifyListeners('wallet_connecting', { payloadId: payload.uuid });

      // For web, open XUMM in new window/tab
      const xummUrl = payload.next.always;
      
      // Try to open in a popup first
      const popup = window.open(
        xummUrl,
        'xumm-wallet',
        'width=400,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        // Fallback to opening in same tab
        window.open(xummUrl, '_blank');
      }

      // Poll for result
      const result = await this.pollPayloadResult(payload.uuid);
      
      if (popup && !popup.closed) {
        popup.close();
      }

      if (result.response.resolved && result.response.signed) {
        const sessionData = {
          account: result.response.account,
          uuid: payload.uuid,
          connected: true,
          connectedAt: new Date().toISOString(),
          payloadData: result,
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
      console.error('❌ XUMM wallet connection error:', error);
      this.notifyListeners('wallet_error', { error: error.message });
      return {
        success: false,
        message: error.message || 'Wallet connection failed',
      };
    }
  }
  
  // Mock wallet connection for development
  async connectMockWallet() {
    try {
      this.notifyListeners('wallet_connecting', { mock: true });
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAccount = 'rMockWalletAddress123456789ABCDEF';
      const sessionData = {
        account: mockAccount,
        uuid: 'mock-uuid-' + Date.now(),
        connected: true,
        connectedAt: new Date().toISOString(),
        mock: true,
      };

      await this.storeSession(sessionData);
      this.notifyListeners('wallet_connected', sessionData);

      return {
        success: true,
        account: mockAccount,
        session: sessionData,
      };
    } catch (error) {
      console.error('❌ Mock wallet connection error:', error);
      this.notifyListeners('wallet_error', { error: error.message });
      return {
        success: false,
        message: error.message || 'Mock wallet connection failed',
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
            web: window.location.origin + '/transaction-callback',
          },
          ...options,
        },
      };

      const payload = await this.sdk.payload.create(request);

      if (!payload.uuid) {
        throw new Error('Failed to create XUMM payload');
      }

      this.notifyListeners('transaction_signing', { payloadId: payload.uuid });

      // Open XUMM for signing
      const popup = window.open(
        payload.next.always,
        'xumm-transaction',
        'width=400,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        window.open(payload.next.always, '_blank');
      }

      // Poll for result
      const result = await this.pollPayloadResult(payload.uuid);

      if (popup && !popup.closed) {
        popup.close();
      }

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
      console.error('❌ XUMM transaction signing error:', error);
      this.notifyListeners('transaction_error', { error: error.message });
      return {
        success: false,
        message: error.message || 'Transaction signing failed',
      };
    }
  }

  // Poll payload result with web-optimized timing
  async pollPayloadResult(uuid, maxAttempts = 60, interval = 2000) {
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
        // Continue polling on error
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

      // Handle mock mode
      if (this.mockMode || this.currentSession?.mock) {
        return {
          success: true,
          data: {
            account: targetAccount,
            balance: '1000000000', // 1000 XRP in drops
            sequence: 1,
            ownerCount: 0,
            validated: true
          },
        };
      }

      // Use backend API for account info to avoid CORS issues
      const response = await api.getAccountInfo(targetAccount);
      
      return {
        success: true,
        data: response.data,
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

      // Handle mock mode
      if (this.mockMode || this.currentSession?.mock) {
        return {
          success: true,
          data: {
            xrp: 1000.0,
            tokens: [],
            totalValue: 1000.0
          },
        };
      }

      // Use backend API to get comprehensive balance info
      const response = await api.getWalletBalance(targetAccount);
      
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

  // Utility functions
  isValidXRPAddress(address) {
    try {
      return /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address);
    } catch (error) {
      return false;
    }
  }

  xrpToDrops(xrp) {
    return Math.floor(xrp * 1000000);
  }

  dropsToXrp(drops) {
    return parseFloat(drops) / 1000000;
  }

  formatAmount(amount, currency = 'XRP') {
    if (currency === 'XRP') {
      return `${parseFloat(amount).toFixed(6)} XRP`;
    } else {
      return `${parseFloat(amount).toFixed(2)} ${currency}`;
    }
  }

  // Get connection status
  isConnected() {
    return !!(this.currentSession && this.currentSession.connected);
  }

  getConnectedAccount() {
    return this.currentSession?.account || null;
  }

  // Web-specific helper for QR code display
  async getPayloadQR(payloadId) {
    try {
      if (!this.sdk) {
        throw new Error('XUMM SDK not initialized');
      }

      const payload = await this.sdk.payload.get(payloadId);
      return {
        success: true,
        qrUrl: payload.refs.qr_png,
        websocketUrl: payload.refs.websocket_status,
      };
    } catch (error) {
      console.error('Get payload QR error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get QR code',
      };
    }
  }
}

// Create and export singleton instance
export const xummService = new XummService();
export default xummService;