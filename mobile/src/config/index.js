import {
  API_BASE_URL,
  AI_SERVICE_URL,
  WEBSOCKET_URL,
  API_BASE_URL_PROD,
  AI_SERVICE_URL_PROD,
  WEBSOCKET_URL_PROD,
  XUMM_API_KEY,
  XUMM_API_SECRET,
  XUMM_REDIRECT_URL,
  FLARE_RPC_URL,
  FLARE_EXPLORER_URL,
  FLARE_CHAIN_ID,
  JWT_SECRET,
  ENCRYPTION_KEY,
  ENABLE_BIOMETRICS,
  ENABLE_NOTIFICATIONS,
  ENABLE_ANALYTICS,
  DEBUG_MODE,
  APP_NAME,
  APP_VERSION,
  BUNDLE_ID,
} from '@env';

const isDevelopment = __DEV__;

export const config = {
  // API Configuration
  API_BASE_URL: isDevelopment ? API_BASE_URL : API_BASE_URL_PROD,
  AI_SERVICE_URL: isDevelopment ? AI_SERVICE_URL : AI_SERVICE_URL_PROD,
  WEBSOCKET_URL: isDevelopment ? WEBSOCKET_URL : WEBSOCKET_URL_PROD,
  
  // XUMM Configuration
  XUMM: {
    API_KEY: XUMM_API_KEY,
    API_SECRET: XUMM_API_SECRET,
    REDIRECT_URL: XUMM_REDIRECT_URL,
  },
  
  // Flare Network Configuration
  FLARE: {
    RPC_URL: FLARE_RPC_URL,
    EXPLORER_URL: FLARE_EXPLORER_URL,
    CHAIN_ID: parseInt(FLARE_CHAIN_ID, 10),
  },
  
  // Security
  SECURITY: {
    JWT_SECRET,
    ENCRYPTION_KEY,
  },
  
  // Features
  FEATURES: {
    BIOMETRICS: ENABLE_BIOMETRICS === 'true',
    NOTIFICATIONS: ENABLE_NOTIFICATIONS === 'true',
    ANALYTICS: ENABLE_ANALYTICS === 'true',
  },
  
  // App Info
  APP: {
    NAME: APP_NAME,
    VERSION: APP_VERSION,
    BUNDLE_ID: BUNDLE_ID,
    DEBUG_MODE: DEBUG_MODE === 'true' || isDevelopment,
  },
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH_TOKEN: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    
    // User Management
    USER_PROFILE: '/api/user/profile',
    UPDATE_PROFILE: '/api/user/profile',
    
    // Properties
    PROPERTIES: '/api/properties',
    PROPERTY_DETAILS: '/api/properties/:id',
    PROPERTY_DOCUMENTS: '/api/properties/:id/documents',
    
    // Trading
    TRADING_PAIRS: '/api/trading/pairs',
    PLACE_ORDER: '/api/trading/order',
    ORDER_HISTORY: '/api/trading/orders',
    MARKET_DATA: '/api/trading/market-data',
    
    // Wallet
    WALLET_BALANCE: '/api/wallet/balance',
    TRANSACTIONS: '/api/wallet/transactions',
    SEND_TRANSACTION: '/api/wallet/send',
    
    // Flare Network
    FLARE_TOKENIZE: '/api/flare/tokenize',
    FLARE_PURCHASE: '/api/flare/purchase',
    FLARE_BALANCE: '/api/flare/balance/:tokenId',
    FLARE_PROPERTY: '/api/flare/property/:tokenId',
    FLARE_NETWORK: '/api/flare/network',
    FLARE_MINT: '/api/flare/mint',
    
    // XUMM
    XUMM_CREDENTIALS: '/api/xumm/credentials',
    XUMM_SIGN: '/api/xumm/sign',
    
    // AI Services
    AI_ANALYZE_DOCUMENT: '/analyze-document',
    AI_HEALTH: '/health',
    
    // Notifications
    NOTIFICATIONS: '/api/notifications',
    MARK_READ: '/api/notifications/:id/read',
  },
  
  // WebSocket Events
  WS_EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    PRICE_UPDATE: 'price_update',
    ORDER_UPDATE: 'order_update',
    BALANCE_UPDATE: 'balance_update',
    NOTIFICATION: 'notification',
    TRANSACTION_UPDATE: 'transaction_update',
  },
  
  // Storage Keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',
    WALLET_ADDRESS: 'wallet_address',
    XUMM_SESSION: 'xumm_session',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    THEME_PREFERENCE: 'theme_preference',
    LAST_SYNC: 'last_sync',
  },
  
  // Error Codes
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUTH_FAILED: 'AUTH_FAILED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
  },
  
  // Request Timeouts (milliseconds)
  TIMEOUTS: {
    API_REQUEST: 30000,
    WEBSOCKET_CONNECTION: 10000,
    FILE_UPLOAD: 60000,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  
  // Chart Configuration
  CHART: {
    DEFAULT_TIMEFRAME: '1D',
    AVAILABLE_TIMEFRAMES: ['1H', '4H', '1D', '1W', '1M'],
    UPDATE_INTERVAL: 5000, // 5 seconds
  },
};

export default config;