import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import CryptoJS from 'crypto-js';
import config from '../config';

const rnBiometrics = new ReactNativeBiometrics();

class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authListeners = [];
  }

  // Authentication state management
  addAuthListener(listener) {
    this.authListeners.push(listener);
  }

  removeAuthListener(listener) {
    this.authListeners = this.authListeners.filter(l => l !== listener);
  }

  notifyAuthListeners(isAuthenticated, user = null) {
    this.isAuthenticated = isAuthenticated;
    this.currentUser = user;
    this.authListeners.forEach(listener => listener(isAuthenticated, user));
  }

  // Token management
  async storeTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        [config.STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ]);
      
      // Store refresh token securely in keychain
      if (config.FEATURES.BIOMETRICS) {
        await Keychain.setInternetCredentials(
          'nexvestxr_refresh_token',
          'user',
          refreshToken
        );
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  async getTokens() {
    try {
      const tokens = await AsyncStorage.multiGet([
        config.STORAGE_KEYS.ACCESS_TOKEN,
        config.STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      
      return {
        accessToken: tokens[0][1],
        refreshToken: tokens[1][1],
      };
    } catch (error) {
      console.error('Error getting tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        config.STORAGE_KEYS.ACCESS_TOKEN,
        config.STORAGE_KEYS.REFRESH_TOKEN,
        config.STORAGE_KEYS.USER_DATA,
      ]);
      
      // Clear from keychain
      await Keychain.resetInternetCredentials('nexvestxr_refresh_token');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // User data management
  async storeUserData(userData) {
    try {
      const encryptedData = this.encryptData(JSON.stringify(userData));
      await AsyncStorage.setItem(config.STORAGE_KEYS.USER_DATA, encryptedData);
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  }

  async getUserData() {
    try {
      const encryptedData = await AsyncStorage.getItem(config.STORAGE_KEYS.USER_DATA);
      if (encryptedData) {
        const decryptedData = this.decryptData(encryptedData);
        return JSON.parse(decryptedData);
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Encryption utilities
  encryptData(data) {
    return CryptoJS.AES.encrypt(data, config.SECURITY.ENCRYPTION_KEY).toString();
  }

  decryptData(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, config.SECURITY.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Biometric authentication
  async isBiometricSupported() {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      return available;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  async enableBiometricAuth() {
    try {
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      
      if (!keysExist) {
        const { publicKey } = await rnBiometrics.createKeys();
        console.log('Biometric keys created:', publicKey);
      }
      
      await AsyncStorage.setItem(config.STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      return true;
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return false;
    }
  }

  async disableBiometricAuth() {
    try {
      await rnBiometrics.deleteKeys();
      await AsyncStorage.setItem(config.STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
      return true;
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      return false;
    }
  }

  async authenticateWithBiometric() {
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Authenticate to access NexVestXR',
        cancelButtonText: 'Cancel',
      });
      
      return success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(config.STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  // Authentication methods
  async login(credentials) {
    try {
      // Import apiService here to avoid circular dependency
      const { apiService } = await import('./ApiService');
      
      const response = await apiService.login(credentials);
      
      if (response.success) {
        await this.storeTokens(response.data.accessToken, response.data.refreshToken);
        await this.storeUserData(response.data.user);
        
        this.notifyAuthListeners(true, response.data.user);
        
        return {
          success: true,
          user: response.data.user,
        };
      } else {
        return {
          success: false,
          message: response.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  async register(userData) {
    try {
      const { apiService } = await import('./ApiService');
      
      const response = await apiService.register(userData);
      
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Registration successful',
        };
      } else {
        return {
          success: false,
          message: response.message || 'Registration failed',
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }
  }

  async refreshToken(refreshToken) {
    try {
      const { apiService } = await import('./ApiService');
      
      const response = await apiService.refreshToken(refreshToken);
      
      if (response.success) {
        await this.storeTokens(response.data.accessToken, response.data.refreshToken);
        return response.data;
      } else {
        await this.logout();
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      return null;
    }
  }

  async logout() {
    try {
      const { apiService } = await import('./ApiService');
      
      // Notify server about logout
      try {
        await apiService.logout();
      } catch (error) {
        console.error('Server logout error:', error);
      }
      
      // Clear local data
      await this.clearTokens();
      
      this.notifyAuthListeners(false, null);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: error.message || 'Logout failed',
      };
    }
  }

  async checkAuthStatus() {
    try {
      const { accessToken, refreshToken } = await this.getTokens();
      
      if (!accessToken) {
        this.notifyAuthListeners(false, null);
        return false;
      }
      
      // Check if token is valid by making a test request
      const userData = await this.getUserData();
      
      if (userData) {
        this.notifyAuthListeners(true, userData);
        return true;
      } else {
        // Try to refresh token
        if (refreshToken) {
          const newTokens = await this.refreshToken(refreshToken);
          if (newTokens) {
            const freshUserData = await this.getUserData();
            this.notifyAuthListeners(true, freshUserData);
            return true;
          }
        }
        
        await this.logout();
        return false;
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      await this.logout();
      return false;
    }
  }

  async loginWithBiometric() {
    try {
      if (!await this.isBiometricEnabled()) {
        return {
          success: false,
          message: 'Biometric authentication not enabled',
        };
      }
      
      const biometricResult = await this.authenticateWithBiometric();
      
      if (biometricResult) {
        // Get refresh token from keychain
        const credentials = await Keychain.getInternetCredentials('nexvestxr_refresh_token');
        
        if (credentials && credentials.password) {
          const newTokens = await this.refreshToken(credentials.password);
          
          if (newTokens) {
            const userData = await this.getUserData();
            this.notifyAuthListeners(true, userData);
            
            return {
              success: true,
              user: userData,
            };
          }
        }
        
        return {
          success: false,
          message: 'Failed to authenticate with stored credentials',
        };
      } else {
        return {
          success: false,
          message: 'Biometric authentication failed',
        };
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      return {
        success: false,
        message: error.message || 'Biometric login failed',
      };
    }
  }

  // Utility methods
  getCurrentUser() {
    return this.currentUser;
  }

  isUserAuthenticated() {
    return this.isAuthenticated;
  }
}

// Create and export singleton instance
const authServiceInstance = new AuthService();
export { authServiceInstance as AuthService };
export default authServiceInstance;