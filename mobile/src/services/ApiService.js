import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

class ApiService {
  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.timeout = config.TIMEOUTS.API_REQUEST;
    this.setupAxiosInstance();
  }

  setupAxiosInstance() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.api.interceptors.request.use(
      async (requestConfig) => {
        try {
          const token = await AsyncStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
          if (token) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        
        if (config.APP.DEBUG_MODE) {
          console.log('API Request:', {
            url: requestConfig.url,
            method: requestConfig.method,
            headers: requestConfig.headers,
            data: requestConfig.data,
          });
        }
        
        return requestConfig;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        if (config.APP.DEBUG_MODE) {
          console.log('API Response:', {
            url: response.config.url,
            status: response.status,
            data: response.data,
          });
        }
        return response;
      },
      async (error) => {
        console.error('API Error:', error);
        
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          try {
            const refreshToken = await AsyncStorage.getItem(config.STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
              // Use direct API call to avoid circular dependency
              const refreshResponse = await axios.post(
                `${this.baseURL}${config.ENDPOINTS.REFRESH_TOKEN}`,
                { refreshToken }
              );
              
              if (refreshResponse.data.success) {
                const newTokens = refreshResponse.data.data;
                await AsyncStorage.multiSet([
                  [config.STORAGE_KEYS.ACCESS_TOKEN, newTokens.accessToken],
                  [config.STORAGE_KEYS.REFRESH_TOKEN, newTokens.refreshToken],
                ]);
                
                // Retry the original request with new token
                error.config.headers.Authorization = `Bearer ${newTokens.accessToken}`;
                return this.api.request(error.config);
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear tokens and notify app to logout
            await AsyncStorage.multiRemove([
              config.STORAGE_KEYS.ACCESS_TOKEN,
              config.STORAGE_KEYS.REFRESH_TOKEN,
              config.STORAGE_KEYS.USER_DATA,
            ]);
          }
        }
        
        return Promise.reject(this.handleError(error));
      }
    );
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        code: error.response.status,
        message: error.response.data?.message || 'Server error occurred',
        data: error.response.data,
        type: config.ERROR_CODES.SERVER_ERROR,
      };
    } else if (error.request) {
      // Network error
      return {
        code: 0,
        message: 'Network connection failed',
        type: config.ERROR_CODES.NETWORK_ERROR,
      };
    } else {
      // Other error
      return {
        code: -1,
        message: error.message || 'Unknown error occurred',
        type: config.ERROR_CODES.UNKNOWN_ERROR,
      };
    }
  }

  // Generic API methods
  async get(endpoint, params = {}) {
    try {
      const response = await this.api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post(endpoint, data = {}) {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async put(endpoint, data = {}) {
    try {
      const response = await this.api.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const response = await this.api.delete(endpoint);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async patch(endpoint, data = {}) {
    try {
      const response = await this.api.patch(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // File upload method
  async uploadFile(endpoint, file, additionalData = {}) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });

      // Add additional form data
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });

      const response = await this.api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: config.TIMEOUTS.FILE_UPLOAD,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Authentication APIs
  async login(credentials) {
    return this.post(config.ENDPOINTS.LOGIN, credentials);
  }

  async register(userData) {
    return this.post(config.ENDPOINTS.REGISTER, userData);
  }

  async refreshToken(refreshToken) {
    return this.post(config.ENDPOINTS.REFRESH_TOKEN, { refreshToken });
  }

  async logout() {
    return this.post(config.ENDPOINTS.LOGOUT);
  }

  // User APIs
  async getUserProfile() {
    return this.get(config.ENDPOINTS.USER_PROFILE);
  }

  async updateUserProfile(userData) {
    return this.put(config.ENDPOINTS.UPDATE_PROFILE, userData);
  }

  // Property APIs
  async getProperties(filters = {}) {
    return this.get(config.ENDPOINTS.PROPERTIES, filters);
  }

  async getPropertyDetails(propertyId) {
    const endpoint = config.ENDPOINTS.PROPERTY_DETAILS.replace(':id', propertyId);
    return this.get(endpoint);
  }

  async getPropertyDocuments(propertyId) {
    const endpoint = config.ENDPOINTS.PROPERTY_DOCUMENTS.replace(':id', propertyId);
    return this.get(endpoint);
  }

  // Trading APIs
  async getTradingPairs() {
    return this.get(config.ENDPOINTS.TRADING_PAIRS);
  }

  async placeOrder(orderData) {
    return this.post(config.ENDPOINTS.PLACE_ORDER, orderData);
  }

  async getOrderHistory(filters = {}) {
    return this.get(config.ENDPOINTS.ORDER_HISTORY, filters);
  }

  async getMarketData(symbol) {
    return this.get(config.ENDPOINTS.MARKET_DATA, { symbol });
  }

  // Wallet APIs
  async getWalletBalance() {
    return this.get(config.ENDPOINTS.WALLET_BALANCE);
  }

  async getTransactions(filters = {}) {
    return this.get(config.ENDPOINTS.TRANSACTIONS, filters);
  }

  async sendTransaction(transactionData) {
    return this.post(config.ENDPOINTS.SEND_TRANSACTION, transactionData);
  }

  // Flare Network APIs
  async tokenizeProperty(tokenizeData) {
    return this.post(config.ENDPOINTS.FLARE_TOKENIZE, tokenizeData);
  }

  async purchaseTokens(purchaseData) {
    return this.post(config.ENDPOINTS.FLARE_PURCHASE, purchaseData);
  }

  async getTokenBalance(tokenId, address) {
    const endpoint = config.ENDPOINTS.FLARE_BALANCE.replace(':tokenId', tokenId);
    return this.get(endpoint, { address });
  }

  async getPropertyInfo(tokenId) {
    const endpoint = config.ENDPOINTS.FLARE_PROPERTY.replace(':tokenId', tokenId);
    return this.get(endpoint);
  }

  async getNetworkInfo() {
    return this.get(config.ENDPOINTS.FLARE_NETWORK);
  }

  async mintTokens(mintData) {
    return this.post(config.ENDPOINTS.FLARE_MINT, mintData);
  }

  // XUMM APIs
  async getXummCredentials() {
    return this.get(config.ENDPOINTS.XUMM_CREDENTIALS);
  }

  async signWithXumm(signData) {
    return this.post(config.ENDPOINTS.XUMM_SIGN, signData);
  }

  // Notification APIs
  async getNotifications(filters = {}) {
    return this.get(config.ENDPOINTS.NOTIFICATIONS, filters);
  }

  async markNotificationAsRead(notificationId) {
    const endpoint = config.ENDPOINTS.MARK_READ.replace(':id', notificationId);
    return this.patch(endpoint);
  }

  // KYC APIs
  async setKYCStatus(orgId, status) {
    return this.post(`/api/organizations/${orgId}/kyc-status`, { status });
  }

  async getKYCStatus(orgId) {
    return this.get(`/api/organizations/${orgId}/kyc-status`);
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;