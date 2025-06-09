import React, { createContext, useState, useEffect, useContext } from 'react';
import xummService from '../services/XummService';

const XummContext = createContext();

// Custom hook to use XUMM context
export const useXumm = () => {
  const context = useContext(XummContext);
  if (!context) {
    throw new Error('useXumm must be used within a XummProvider');
  }
  return context;
};

export const XummProvider = ({ children }) => {
  // Connection state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState(null);
  const [session, setSession] = useState(null);
  
  // Transaction state
  const [isTransacting, setIsTransacting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  
  // Balance and account info
  const [balance, setBalance] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  
  // Error handling
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Add notification helper
  const addNotification = (type, title, message, duration = 5000) => {
    const id = Date.now();
    const notification = { id, type, title, message };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Initialize XUMM service
  useEffect(() => {
    const initializeXumm = async () => {
      try {
        setError(null);
        console.log('🔄 Initializing XUMM service...');
        
        const initialized = await xummService.initialize();
        setIsInitialized(initialized);
        
        if (initialized) {
          console.log('✅ XUMM Context: Service initialized successfully');
          
          // Check for existing session
          const existingSession = await xummService.restoreSession();
          if (existingSession) {
            setSession(existingSession);
            setAccount(existingSession.account);
            setIsConnected(true);
            console.log('✅ XUMM Context: Session restored', existingSession.account);
            
            // Load account info and balance
            await loadAccountData(existingSession.account);
          }
        } else {
          console.warn('⚠️ XUMM service initialization failed, but service is available in mock mode');
          // Don't set error for mock mode
        }
      } catch (error) {
        console.error('❌ XUMM Context initialization error:', error);
        setError(error.message);
      }
    };

    initializeXumm();
  }, []);

  // Set up XUMM service listeners
  useEffect(() => {
    if (!isInitialized) return;

    const handleWalletEvent = (event, data) => {
      console.log('📡 XUMM Event:', event, data);

      switch (event) {
        case 'wallet_connecting':
          setIsConnecting(true);
          setError(null);
          addNotification('info', 'Connecting Wallet', 'Please sign in with your XUMM wallet...');
          break;

        case 'wallet_connected':
          setIsConnecting(false);
          setIsConnected(true);
          setAccount(data.account);
          setSession(data);
          addNotification('success', 'Wallet Connected', `Successfully connected to ${data.account.substring(0, 10)}...`);
          loadAccountData(data.account);
          break;

        case 'wallet_disconnected':
          setIsConnecting(false);
          setIsConnected(false);
          setAccount(null);
          setSession(null);
          setBalance(null);
          setAccountInfo(null);
          addNotification('info', 'Wallet Disconnected', 'Your XUMM wallet has been disconnected.');
          break;

        case 'wallet_error':
          setIsConnecting(false);
          setError(data.error);
          addNotification('error', 'Connection Error', data.error);
          break;

        case 'session_restored':
          setIsConnected(true);
          setAccount(data.account);
          setSession(data);
          console.log('🔄 Session restored for:', data.account);
          break;

        case 'transaction_signing':
          setIsTransacting(true);
          setError(null);
          addNotification('info', 'Signing Transaction', 'Please sign the transaction in your XUMM wallet...');
          break;

        case 'transaction_signed':
          setIsTransacting(false);
          setLastTransaction(data);
          addNotification('success', 'Transaction Signed', `Transaction ${data.txid.substring(0, 10)}... completed successfully!`);
          // Refresh balance after transaction
          if (account) {
            setTimeout(() => loadAccountData(account), 2000);
          }
          break;

        case 'transaction_error':
          setIsTransacting(false);
          setError(data.error);
          addNotification('error', 'Transaction Error', data.error);
          break;

        default:
          console.log('🔔 Unhandled XUMM event:', event, data);
      }
    };

    xummService.addListener(handleWalletEvent);

    return () => {
      xummService.removeListener(handleWalletEvent);
    };
  }, [isInitialized, account]);

  // Load account data (balance and info)
  const loadAccountData = async (accountAddress) => {
    try {
      // Load balance
      const balanceResult = await xummService.getWalletBalance(accountAddress);
      if (balanceResult.success) {
        setBalance(balanceResult.data);
      }

      // Load account info
      const infoResult = await xummService.getAccountInfo(accountAddress);
      if (infoResult.success) {
        setAccountInfo(infoResult.data);
      }
    } catch (error) {
      console.error('Error loading account data:', error);
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    try {
      console.log('🔗 Attempting to connect wallet...');
      
      if (!isInitialized) {
        console.log('⚠️ XUMM service not initialized, attempting to initialize...');
        const initialized = await xummService.initialize();
        if (!initialized) {
          throw new Error('XUMM service failed to initialize');
        }
        setIsInitialized(true);
      }

      if (isConnected) {
        addNotification('info', 'Already Connected', 'Your wallet is already connected.');
        return { success: true };
      }

      setError(null);
      console.log('📱 Calling XUMM service connect...');
      const result = await xummService.connectWallet();
      console.log('📝 XUMM connect result:', result);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to connect wallet';
      console.error('❌ Wallet connection error:', error);
      setError(errorMessage);
      addNotification('error', 'Connection Failed', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Disconnect wallet function
  const disconnectWallet = async () => {
    try {
      const result = await xummService.disconnectWallet();
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to disconnect wallet';
      setError(errorMessage);
      addNotification('error', 'Disconnect Failed', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Sign transaction function
  const signTransaction = async (txjson, options = {}) => {
    try {
      if (!isConnected) {
        throw new Error('No wallet connected');
      }

      setError(null);
      const result = await xummService.signTransaction(txjson, options);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to sign transaction';
      setError(errorMessage);
      addNotification('error', 'Transaction Failed', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Send XRP payment
  const sendXRPPayment = async (destination, amount, destinationTag = null, memo = null) => {
    try {
      if (!isConnected) {
        throw new Error('No wallet connected');
      }

      setError(null);
      const result = await xummService.sendXRPPayment(destination, amount, destinationTag, memo);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to send XRP payment';
      setError(errorMessage);
      addNotification('error', 'Payment Failed', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Send token payment
  const sendTokenPayment = async (destination, amount, currency, issuer, destinationTag = null, memo = null) => {
    try {
      if (!isConnected) {
        throw new Error('No wallet connected');
      }

      setError(null);
      const result = await xummService.sendTokenPayment(destination, amount, currency, issuer, destinationTag, memo);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to send token payment';
      setError(errorMessage);
      addNotification('error', 'Payment Failed', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Create trust line
  const createTrustLine = async (currency, issuer, limit = '1000000000') => {
    try {
      if (!isConnected) {
        throw new Error('No wallet connected');
      }

      setError(null);
      const result = await xummService.createTrustLine(currency, issuer, limit);
      return result;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create trust line';
      setError(errorMessage);
      addNotification('error', 'Trust Line Failed', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Refresh account data
  const refreshAccountData = async () => {
    if (account) {
      await loadAccountData(account);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Utility functions
  const formatXRPAmount = (amount) => {
    return xummService.formatAmount(amount, 'XRP');
  };

  const isValidXRPAddress = (address) => {
    return xummService.isValidXRPAddress(address);
  };

  const xrpToDrops = (xrp) => {
    return xummService.xrpToDrops(xrp);
  };

  const dropsToXrp = (drops) => {
    return xummService.dropsToXrp(drops);
  };

  // Context value
  const value = {
    // State
    isInitialized,
    isConnected,
    isConnecting,
    isTransacting,
    account,
    session,
    balance,
    accountInfo,
    error,
    notifications,
    lastTransaction,

    // Functions
    connectWallet,
    disconnectWallet,
    signTransaction,
    sendXRPPayment,
    sendTokenPayment,
    createTrustLine,
    refreshAccountData,
    clearError,
    addNotification,
    removeNotification,

    // Utilities
    formatXRPAmount,
    isValidXRPAddress,
    xrpToDrops,
    dropsToXrp,

    // Service instance (for advanced use)
    xummService,
  };

  return (
    <XummContext.Provider value={value}>
      {children}
    </XummContext.Provider>
  );
};

export default XummContext;