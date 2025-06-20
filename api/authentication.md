# Authentication API Reference

## Overview

The NexVestXR platform uses JWT (JSON Web Token) based authentication with role-based access control and API key support for institutional users. This document covers all authentication methods, security features, and implementation guidelines.

## Authentication Methods

### 1. JWT Token Authentication

Used for web and mobile applications:

```bash
Authorization: Bearer <jwt-token>
```

### 2. API Key Authentication

Used for server-to-server communication (Institutional users only):

```bash
X-API-Key: <api-key>
```

## Endpoints

### User Registration

Register a new user account with email verification.

**Endpoint:** `POST /auth/register`

**Rate Limit:** 5 requests/minute per IP

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "acceptTerms": true,
  "acceptPrivacy": true,
  "referralCode": "REF123456" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "user_1640995200_abc123",
  "verificationRequired": true,
  "verificationEmail": "john@example.com"
}
```

**Validation Rules:**
- Username: 3-30 characters, alphanumeric and underscore only
- Email: Valid email format, unique in system
- Password: Minimum 8 characters, must contain uppercase, lowercase, number, and special character
- Confirm Password: Must match password
- Terms and Privacy: Must be accepted (true)

**Error Examples:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Password does not meet security requirements",
  "details": {
    "field": "password",
    "requirements": [
      "Minimum 8 characters",
      "At least one uppercase letter",
      "At least one lowercase letter", 
      "At least one number",
      "At least one special character"
    ]
  },
  "statusCode": 422
}
```

---

### User Login

Authenticate user and receive JWT token.

**Endpoint:** `POST /auth/login`

**Rate Limit:** 5 requests/minute per IP (increases to 1/minute after 3 failed attempts)

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true // Optional, extends token expiry
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_1640995200_def456",
  "expiresIn": 86400,
  "user": {
    "id": "user_1640995200_abc123",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "investor",
    "subscriptionTier": "basic",
    "kycStatus": "pending",
    "twoFactorEnabled": false,
    "lastLogin": "2023-12-01T10:30:00.000Z"
  }
}
```

**Security Features:**
- Account lockout after 5 failed attempts (30 minutes)
- Password attempt logging
- Suspicious activity detection
- Optional 2FA requirement

**Error Examples:**
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password",
  "statusCode": 401,
  "attemptsRemaining": 3,
  "lockoutTime": null
}
```

---

### Token Refresh

Refresh an expired JWT token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Rate Limit:** 20 requests/minute per user

**Request:**
```json
{
  "refreshToken": "rt_1640995200_def456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_1640995300_ghi789",
  "expiresIn": 86400
}
```

**Implementation Example:**
```javascript
async function refreshToken(refreshToken) {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (response.status === 401) {
      // Refresh token expired, redirect to login
      redirectToLogin();
      return null;
    }

    const data = await response.json();
    
    // Store new tokens
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    return data.token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    redirectToLogin();
    return null;
  }
}
```

---

### Logout

Invalidate current session and tokens.

**Endpoint:** `POST /auth/logout`

**Authentication:** Required

**Request:**
```json
{
  "allDevices": false // Optional: logout from all devices
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Implementation:**
```javascript
async function logout(allDevices = false) {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ allDevices })
    });
  } finally {
    // Clear local storage regardless of API response
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    redirectToLogin();
  }
}
```

---

### API Key Generation

Generate API key for institutional users.

**Endpoint:** `POST /auth/api-key`

**Authentication:** Required (Institutional plan only)

**Rate Limit:** 10 requests/hour per user

**Request:**
```json
{
  "name": "Production API Key",
  "permissions": ["read", "trade", "manage_properties"],
  "ipWhitelist": ["203.0.113.1", "198.51.100.0/24"], // Optional
  "expiresIn": "1y" // Optional: 30d, 90d, 1y, never
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": "ak_live_1640995200abcdef123456789",
  "keyId": "key_abc123def456",
  "name": "Production API Key",
  "permissions": ["read", "trade", "manage_properties"],
  "createdAt": "2023-12-01T10:30:00.000Z",
  "expiresAt": "2024-12-01T10:30:00.000Z",
  "ipWhitelist": ["203.0.113.1", "198.51.100.0/24"]
}
```

**Security Notes:**
- API keys are only shown once during creation
- Keys can be revoked immediately
- All API key usage is logged
- Rate limits apply per API key

---

### Password Reset

Initiate password reset process.

**Endpoint:** `POST /auth/forgot-password`

**Rate Limit:** 3 requests/hour per email

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent",
  "emailSent": true
}
```

**Reset Password with Token:**

**Endpoint:** `POST /auth/reset-password`

**Request:**
```json
{
  "token": "reset_token_abc123def456",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### Two-Factor Authentication

#### Enable 2FA

**Endpoint:** `POST /auth/2fa/enable`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "backupCodes": [
    "123456789",
    "987654321",
    "456789123"
  ]
}
```

#### Verify 2FA Setup

**Endpoint:** `POST /auth/2fa/verify`

**Authentication:** Required

**Request:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication enabled",
  "backupCodes": [
    "123456789",
    "987654321"
  ]
}
```

#### 2FA Login

When 2FA is enabled, login process becomes two-step:

**Step 1:** Regular login returns temporary token
```json
{
  "success": true,
  "requires2FA": true,
  "tempToken": "temp_abc123def456",
  "message": "Please provide 2FA code"
}
```

**Step 2:** Verify 2FA code

**Endpoint:** `POST /auth/2fa/verify-login`

**Request:**
```json
{
  "tempToken": "temp_abc123def456",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

## JWT Token Structure

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload
```json
{
  "sub": "user_1640995200_abc123",
  "email": "john@example.com",
  "role": "investor",
  "tier": "premium",
  "permissions": ["read", "trade"],
  "iat": 1640995200,
  "exp": 1641081600,
  "iss": "nexvestxr.com",
  "aud": "nexvestxr-api"
}
```

### Token Validation

```javascript
function validateToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check expiration
    if (decoded.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    // Check issuer
    if (decoded.iss !== 'nexvestxr.com') {
      throw new Error('Invalid issuer');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

## Middleware Implementation

### Express.js Authentication Middleware

```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];
  
  // Check for API key first (institutional users)
  if (apiKey) {
    return authenticateAPIKey(apiKey, req, res, next);
  }
  
  // Check for JWT token
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'ACCESS_TOKEN_REQUIRED',
      message: 'Access token is required' 
    });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        details: 'Please refresh your token'
      });
    }
    
    return res.status(403).json({ 
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid access token' 
    });
  }
};

const authenticateAPIKey = async (apiKey, req, res, next) => {
  try {
    // Validate API key format
    if (!apiKey.startsWith('ak_')) {
      throw new Error('Invalid API key format');
    }
    
    // Look up API key in database
    const keyData = await APIKey.findOne({ 
      key: apiKey, 
      active: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!keyData) {
      throw new Error('Invalid or expired API key');
    }
    
    // Check IP whitelist if configured
    if (keyData.ipWhitelist.length > 0) {
      const clientIP = req.ip;
      if (!isIPAllowed(clientIP, keyData.ipWhitelist)) {
        throw new Error('IP not whitelisted');
      }
    }
    
    // Add user and permissions to request
    req.user = {
      id: keyData.userId,
      role: 'institutional',
      permissions: keyData.permissions,
      apiKeyId: keyData._id
    };
    
    // Log API key usage
    await logAPIKeyUsage(keyData._id, req);
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_API_KEY',
      message: error.message
    });
  }
};

module.exports = { authenticateToken };
```

### Role-Based Access Control

```javascript
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'User does not have required permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required'
      });
    }
    
    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: `Permission '${permission}' is required`,
        userPermissions
      });
    }
    
    next();
  };
};

// Usage examples
app.post('/properties', 
  authenticateToken,
  requireRole(['developer', 'admin']),
  createProperty
);

app.post('/admin/users',
  authenticateToken,
  requirePermission('admin:users:create'),
  createUser
);
```

## Client-Side Implementation

### React Hook for Authentication

```javascript
import { useState, useEffect, useContext, createContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      validateAndSetUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateAndSetUser = async (token) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requires2FA) {
          return { requires2FA: true, tempToken: data.tempToken };
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setToken(data.token);
        setUser(data.user);
        
        return { success: true, user: data.user };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const verify2FA = async (tempToken, code) => {
    try {
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tempToken, code })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setToken(data.token);
        setUser(data.user);
        
        return { success: true, user: data.user };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async (allDevices = false) => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ allDevices })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setUser(null);
    }
  };

  const refreshTokenIfNeeded = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setToken(data.token);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      logout();
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    verify2FA,
    logout,
    refreshTokenIfNeeded,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Automatic Token Refresh

```javascript
// Axios interceptor for automatic token refresh
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', {
          refreshToken
        });

        const { token } = response.data;
        localStorage.setItem('token', token);
        
        // Retry original request with new token
        original.headers.Authorization = `Bearer ${token}`;
        return axios(original);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Security Best Practices

### 1. Token Storage

**Web Applications:**
- Store JWT tokens in memory (React state)
- Store refresh tokens in httpOnly cookies
- Avoid localStorage for sensitive tokens

**Mobile Applications:**
- Use secure storage (Keychain on iOS, Keystore on Android)
- Encrypt tokens before storage

### 2. Token Expiration

- Access tokens: 15 minutes - 1 hour
- Refresh tokens: 7-30 days
- API keys: 1 year or never (with rotation)

### 3. Rate Limiting

- Failed login attempts: Progressive delays
- Token refresh: Prevent abuse
- API key usage: Per-minute/hour limits

### 4. Security Headers

```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### 5. CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://app.nexvestxr.com', 'https://www.nexvestxr.com'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

---

*For more information on API usage and error handling, see the [API Overview](README.md) and [Error Handling](error-handling.md) documentation.*