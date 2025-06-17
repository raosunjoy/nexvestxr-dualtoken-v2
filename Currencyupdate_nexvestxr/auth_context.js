// frontend/src/context/AuthContext.js - Complete authentication context
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexvestxr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add currency preference if available
    const currency = localStorage.getItem('nexvestxr_currency');
    if (currency) {
      config.headers['X-Preferred-Currency'] = currency;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('nexvestxr_token');
      localStorage.removeItem('nexvestxr_user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('nexvestxr_token');
      const savedUser = localStorage.getItem('nexvestxr_user');

      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          
          // Verify token is still valid by fetching profile
          const response = await api.get('/auth/profile');
          
          setUser(response.data.data.user);
          setIsAuthenticated(true);
          
          console.log('✅ Auth initialized successfully');
        } catch (error) {
          console.warn('⚠️ Token validation failed:', error);
          // Clear invalid token
          localStorage.removeItem('nexvestxr_token');
          localStorage.removeItem('nexvestxr_user');
        }
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        const { user: newUser, token } = response.data.data;
        
        // Store auth data
        localStorage.setItem('nexvestxr_token', token);
        localStorage.setItem('nexvestxr_user', JSON.stringify(newUser));
        
        setUser(newUser);
        setIsAuthenticated(true);
        
        toast.success('Account created successfully!');
        
        return { success: true, user: newUser };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      toast.error(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage,
        details: error.response?.data?.details 
      };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.success) {
        // Check if 2FA is required
        if (response.data.requiresTwoFactor) {
          return { 
            success: true, 
            requiresTwoFactor: true,
            message: response.data.message 
          };
        }
        
        const { user: loggedInUser, token } = response.data.data;
        
        // Store auth data
        localStorage.setItem('nexvestxr_token', token);
        localStorage.setItem('nexvestxr_user', JSON.stringify(loggedInUser));
        
        setUser(loggedInUser);
        setIsAuthenticated(true);
        
        toast.success(`Welcome back, ${loggedInUser.email}!`);
        
        return { success: true, user: loggedInUser };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast.error(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  // Login with 2FA
  const loginWith2FA = async (credentials, twoFactorCode) => {
    try {
      setLoading(true);
      
      const response = await api.post('/auth/login', {
        ...credentials,
        twoFactorCode
      });
      
      if (response.data.success) {
        const { user: loggedInUser, token } = response.data.data;
        
        localStorage.setItem('nexvestxr_token', token);
        localStorage.setItem('nexvestxr_user', JSON.stringify(loggedInUser));
        
        setUser(loggedInUser);
        setIsAuthenticated(true);
        
        toast.success('Login successful!');
        
        return { success: true, user: loggedInUser };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || '2FA verification failed';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call logout endpoint to track the logout
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('nexvestxr_token');
      localStorage.removeItem('nexvestxr_user');
      localStorage.removeItem('nexvestxr_currency');
      
      setUser(null);
      setIsAuthenticated(false);
      
      toast.success('Logged out successfully');
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/auth/profile', updates);
      
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        
        // Update local storage
        localStorage.setItem('nexvestxr_user', JSON.stringify(updatedUser));
        
        setUser(updatedUser);
        
        toast.success('Profile updated successfully');
        
        return { success: true, user: updatedUser };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        toast.success('Password changed successfully');
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password change failed';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  // Setup 2FA
  const setup2FA = async () => {
    try {
      const response = await api.post('/auth/setup-2fa');
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data 
        };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || '2FA setup failed';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  // Verify and enable 2FA
  const verify2FA = async (token) => {
    try {
      const response = await api.post('/auth/verify-2fa', { token });
      
      if (response.data.success) {
        // Update user state to reflect 2FA is enabled
        const updatedUser = { ...user, twoFactorEnabled: true };
        setUser(updatedUser);
        localStorage.setItem('nexvestxr_user', JSON.stringify(updatedUser));
        
        toast.success('Two-factor authentication enabled successfully');
        
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || '2FA verification failed';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  // Disable 2FA
  const disable2FA = async (password, token) => {
    try {
      const response = await api.post('/auth/disable-2fa', { password, token });
      
      if (response.data.success) {
        // Update user state to reflect 2FA is disabled
        const updatedUser = { ...user, twoFactorEnabled: false };
        setUser(updatedUser);
        localStorage.setItem('nexvestxr_user', JSON.stringify(updatedUser));
        
        toast.success('Two-factor authentication disabled');
        
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || '2FA disable failed';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      
      if (response.data.success) {
        const { user: refreshedUser, token } = response.data.data;
        
        localStorage.setItem('nexvestxr_token', token);
        localStorage.setItem('nexvestxr_user', JSON.stringify(refreshedUser));
        
        setUser(refreshedUser);
        
        return { success: true };
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout on refresh failure
      logout();
      return { success: false };
    }
  };

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    return user?.userType === requiredRole;
  };

  // Check if user has KYC approved
  const hasKYC = () => {
    return user?.kycStatus === 'approved';
  };

  // Get user's preferred currency
  const getUserCurrency = () => {
    return user?.preferredCurrency || localStorage.getItem('nexvestxr_currency') || 'USD';
  };

  // Get user's investment capacity based on type
  const getInvestmentCapacity = () => {
    if (!user) return 'consumer';
    
    const capacities = {
      'consumer': 'retail',
      'property_owner': 'b2b',
      'developer': 'institutional'
    };
    
    return capacities[user.userType] || 'retail';
  };

  // Check if user can access feature
  const canAccess = (feature) => {
    if (!user) return false;
    
    const permissions = {
      'basic_investing': true,
      'advanced_trading': hasKYC(),
      'property_tokenization': ['property_owner', 'developer'].includes(user.userType),
      'developer_portal': user.userType === 'developer',
      'institutional_features': user.userType === 'developer' && hasKYC()
    };
    
    return permissions[feature] || false;
  };

  const value = {
    // State
    user,
    loading,
    isAuthenticated,
    
    // Actions
    register,
    login,
    loginWith2FA,
    logout,
    updateProfile,
    changePassword,
    setup2FA,
    verify2FA,
    disable2FA,
    refreshToken,
    
    // Utilities
    hasRole,
    hasKYC,
    getUserCurrency,
    getInvestmentCapacity,
    canAccess,
    
    // API instance for other components
    api
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for role-based access
export const withAuth = (WrappedComponent, requiredRole = null, requireKYC = false) => {
  return function AuthenticatedComponent(props) {
    const { user, loading, hasRole, hasKYC } = useAuth();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access this page.</p>
            <button 
              onClick={() => window.location.href = '/auth'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
            <p className="text-sm text-gray-500">Required role: {requiredRole}</p>
          </div>
        </div>
      );
    }

    if (requireKYC && !hasKYC()) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">KYC Verification Required</h2>
            <p className="text-gray-600 mb-6">Please complete KYC verification to access this feature.</p>
            <button 
              onClick={() => window.location.href = '/profile?tab=kyc'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Complete KYC
            </button>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default AuthContext;