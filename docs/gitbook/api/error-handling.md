# Error Handling Guide

## Overview

The NexVestXR API implements comprehensive error handling with consistent response formats, detailed error messages, and actionable guidance for developers. This guide covers all error scenarios, response formats, and recovery strategies.

## Error Response Format

All API errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": "Additional technical details",
  "timestamp": "2023-12-01T10:30:00.000Z",
  "requestId": "req_1640995200_abc123",
  "path": "/api/properties",
  "method": "POST",
  "statusCode": 400
}
```

## HTTP Status Codes

### 2xx Success
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `202 Accepted` - Request accepted for processing

### 4xx Client Errors
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

### 5xx Server Errors
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - Gateway error
- `503 Service Unavailable` - Service temporarily unavailable
- `504 Gateway Timeout` - Gateway timeout

## Error Categories

### Authentication Errors

#### Invalid Token
```json
{
  "success": false,
  "error": "INVALID_TOKEN",
  "message": "The provided authentication token is invalid or expired",
  "details": "JWT token validation failed",
  "statusCode": 401,
  "recovery": {
    "action": "refresh_token",
    "endpoint": "/auth/refresh"
  }
}
```

#### Missing Token
```json
{
  "success": false,
  "error": "MISSING_TOKEN",
  "message": "Authentication token is required for this endpoint",
  "details": "Authorization header not found",
  "statusCode": 401,
  "recovery": {
    "action": "login",
    "endpoint": "/auth/login"
  }
}
```

#### Insufficient Permissions
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "User does not have permission to perform this action",
  "details": "Requires 'institutional' subscription plan",
  "statusCode": 403,
  "recovery": {
    "action": "upgrade_subscription",
    "endpoint": "/subscription/upgrade"
  }
}
```

### Validation Errors

#### Missing Required Fields
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Required fields are missing",
  "details": {
    "missingFields": ["name", "totalValue"],
    "providedFields": ["location", "propertyType"]
  },
  "statusCode": 422,
  "recovery": {
    "action": "provide_required_fields",
    "requiredFields": ["name", "totalValue"]
  }
}
```

#### Invalid Field Values
```json
{
  "success": false,
  "error": "INVALID_FIELD_VALUE",
  "message": "One or more field values are invalid",
  "details": {
    "errors": [
      {
        "field": "totalValue",
        "value": -1000000,
        "message": "Total value must be greater than 0",
        "constraint": "min:1"
      },
      {
        "field": "email",
        "value": "invalid-email",
        "message": "Invalid email format",
        "constraint": "email"
      }
    ]
  },
  "statusCode": 422
}
```

### Business Logic Errors

#### Insufficient Funds
```json
{
  "success": false,
  "error": "INSUFFICIENT_FUNDS",
  "message": "Insufficient balance to complete transaction",
  "details": {
    "required": 100000,
    "available": 50000,
    "currency": "INR",
    "shortfall": 50000
  },
  "statusCode": 400,
  "recovery": {
    "action": "add_funds",
    "endpoint": "/payment/deposit",
    "minimumAmount": 50000
  }
}
```

#### Property Not Available
```json
{
  "success": false,
  "error": "PROPERTY_NOT_AVAILABLE",
  "message": "Property is not available for investment",
  "details": {
    "propertyId": "PROP_123",
    "status": "funding_complete",
    "reason": "Property has reached maximum funding"
  },
  "statusCode": 409,
  "recovery": {
    "action": "browse_alternatives",
    "endpoint": "/properties/similar"
  }
}
```

#### KYC Required
```json
{
  "success": false,
  "error": "KYC_REQUIRED",
  "message": "KYC verification is required for this action",
  "details": {
    "currentStatus": "pending",
    "requiredLevel": "enhanced",
    "missingDocuments": ["income_proof", "address_proof"]
  },
  "statusCode": 403,
  "recovery": {
    "action": "complete_kyc",
    "endpoint": "/kyc/submit",
    "documents": ["income_proof", "address_proof"]
  }
}
```

### Rate Limiting Errors

#### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded for this endpoint",
  "details": {
    "limit": 100,
    "window": "1 hour",
    "resetTime": "2023-12-01T11:30:00.000Z",
    "retryAfter": 1800
  },
  "statusCode": 429,
  "headers": {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": "1640999400",
    "Retry-After": "1800"
  }
}
```

### Trading Errors

#### Invalid Order Parameters
```json
{
  "success": false,
  "error": "INVALID_ORDER_PARAMETERS",
  "message": "Order parameters are invalid",
  "details": {
    "errors": [
      {
        "field": "amount",
        "value": 0,
        "message": "Amount must be greater than 0"
      },
      {
        "field": "price",
        "value": 999999,
        "message": "Price exceeds maximum allowed value of 10000"
      }
    ]
  },
  "statusCode": 422
}
```

#### Market Closed
```json
{
  "success": false,
  "error": "MARKET_CLOSED",
  "message": "Trading is not available during market hours",
  "details": {
    "currentTime": "2023-12-01T02:30:00.000Z",
    "marketOpenTime": "2023-12-01T09:00:00.000Z",
    "marketCloseTime": "2023-12-01T17:00:00.000Z",
    "timezone": "Asia/Kolkata"
  },
  "statusCode": 400,
  "recovery": {
    "action": "wait_for_market_open",
    "nextOpenTime": "2023-12-01T09:00:00.000Z"
  }
}
```

#### Order Not Found
```json
{
  "success": false,
  "error": "ORDER_NOT_FOUND",
  "message": "Order not found or does not belong to user",
  "details": {
    "orderId": "order_123456789",
    "userId": "user_abc123"
  },
  "statusCode": 404
}
```

### Payment Errors

#### Payment Failed
```json
{
  "success": false,
  "error": "PAYMENT_FAILED",
  "message": "Payment processing failed",
  "details": {
    "paymentId": "pay_123456789",
    "gateway": "stripe",
    "reason": "card_declined",
    "gatewayMessage": "Your card was declined"
  },
  "statusCode": 400,
  "recovery": {
    "action": "retry_payment",
    "suggestions": [
      "Check card details",
      "Try different payment method",
      "Contact your bank"
    ]
  }
}
```

#### Currency Not Supported
```json
{
  "success": false,
  "error": "CURRENCY_NOT_SUPPORTED",
  "message": "The specified currency is not supported",
  "details": {
    "requestedCurrency": "XYZ",
    "supportedCurrencies": ["INR", "USD", "AED", "EUR"]
  },
  "statusCode": 400
}
```

### Blockchain Errors

#### Transaction Failed
```json
{
  "success": false,
  "error": "BLOCKCHAIN_TRANSACTION_FAILED",
  "message": "Blockchain transaction failed",
  "details": {
    "network": "xrpl",
    "transactionHash": "A1B2C3D4E5F6...",
    "error": "tecPATH_DRY",
    "reason": "Insufficient liquidity in order book"
  },
  "statusCode": 400,
  "recovery": {
    "action": "retry_with_different_parameters",
    "suggestions": [
      "Adjust price",
      "Reduce amount",
      "Try different token pair"
    ]
  }
}
```

#### Network Congestion
```json
{
  "success": false,
  "error": "NETWORK_CONGESTION",
  "message": "Blockchain network is congested",
  "details": {
    "network": "flare",
    "averageConfirmationTime": "5 minutes",
    "recommendedGasPrice": "20 gwei"
  },
  "statusCode": 503,
  "recovery": {
    "action": "retry_later",
    "estimatedRetryTime": "2023-12-01T10:45:00.000Z"
  }
}
```

### System Errors

#### Service Unavailable
```json
{
  "success": false,
  "error": "SERVICE_UNAVAILABLE",
  "message": "Service is temporarily unavailable",
  "details": {
    "service": "property_tokenization",
    "reason": "maintenance",
    "estimatedDowntime": "30 minutes"
  },
  "statusCode": 503,
  "recovery": {
    "action": "retry_later",
    "retryAfter": 1800,
    "statusPage": "https://status.nexvestxr.com"
  }
}
```

#### Internal Server Error
```json
{
  "success": false,
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred",
  "details": "Please contact support if this persists",
  "statusCode": 500,
  "recovery": {
    "action": "contact_support",
    "supportEmail": "api-support@nexvestxr.com",
    "supportTicketUrl": "/support/ticket"
  }
}
```

## Error Handling Strategies

### Client-Side Error Handling

```javascript
class NexVestXRAPIClient {
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json();
      throw new APIError(errorData);
    }
    return response.json();
  }

  async makeRequest(endpoint, options) {
    try {
      const response = await fetch(endpoint, options);
      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof APIError) {
        return this.handleAPIError(error);
      }
      throw error;
    }
  }

  handleAPIError(error) {
    switch (error.code) {
      case 'INVALID_TOKEN':
        return this.refreshTokenAndRetry();
      
      case 'RATE_LIMIT_EXCEEDED':
        return this.retryAfterDelay(error.retryAfter);
      
      case 'INSUFFICIENT_FUNDS':
        this.showFundingOptions(error.details);
        break;
      
      case 'KYC_REQUIRED':
        this.redirectToKYC(error.recovery.endpoint);
        break;
      
      case 'SERVICE_UNAVAILABLE':
        this.showMaintenanceMessage(error.details);
        break;
      
      default:
        this.showGenericError(error.message);
    }
  }

  async refreshTokenAndRetry() {
    try {
      const newToken = await this.refreshToken();
      this.setAuthToken(newToken);
      // Retry original request
    } catch (refreshError) {
      this.redirectToLogin();
    }
  }

  async retryAfterDelay(seconds) {
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    // Retry original request
  }
}

class APIError extends Error {
  constructor(errorData) {
    super(errorData.message);
    this.code = errorData.error;
    this.details = errorData.details;
    this.statusCode = errorData.statusCode;
    this.recovery = errorData.recovery;
    this.retryAfter = errorData.details?.retryAfter;
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Don't retry client errors (4xx) except rate limiting
      if (error.statusCode >= 400 && error.statusCode < 500 && 
          error.code !== 'RATE_LIMIT_EXCEEDED') {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
try {
  const result = await retryWithBackoff(
    () => api.createProperty(propertyData),
    3,
    1000
  );
} catch (error) {
  handleFinalError(error);
}
```

### React Error Boundary

```javascript
class APIErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('API Error:', error, errorInfo);
    
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }

  logErrorToService(error, errorInfo) {
    // Send error to monitoring service
    fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    });
  }
}

function ErrorFallback({ error }) {
  if (error?.code === 'NETWORK_ERROR') {
    return (
      <div className="error-boundary">
        <h2>Connection Problem</h2>
        <p>Please check your internet connection and try again.</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="error-boundary">
      <h2>Something went wrong</h2>
      <p>{error?.message || 'An unexpected error occurred'}</p>
      <button onClick={() => window.location.reload()}>
        Refresh Page
      </button>
    </div>
  );
}
```

## Best Practices

### 1. Graceful Degradation

```javascript
async function getPropertyData(propertyId) {
  try {
    const data = await api.getProperty(propertyId);
    return data;
  } catch (error) {
    if (error.code === 'PROPERTY_NOT_FOUND') {
      return null; // Handle gracefully
    }
    
    if (error.code === 'SERVICE_UNAVAILABLE') {
      // Return cached data if available
      return getCachedPropertyData(propertyId);
    }
    
    throw error; // Re-throw unexpected errors
  }
}
```

### 2. User-Friendly Error Messages

```javascript
const ERROR_MESSAGES = {
  'INSUFFICIENT_FUNDS': 'You don\'t have enough funds for this transaction. Please add money to your account.',
  'KYC_REQUIRED': 'Please complete your identity verification to continue.',
  'PROPERTY_NOT_AVAILABLE': 'This property is no longer available for investment.',
  'RATE_LIMIT_EXCEEDED': 'You\'re making requests too quickly. Please wait a moment and try again.',
  'NETWORK_CONGESTION': 'The blockchain network is busy. Your transaction may take longer than usual.'
};

function getErrorMessage(error) {
  return ERROR_MESSAGES[error.code] || error.message || 'An unexpected error occurred';
}
```

### 3. Error Recovery Actions

```javascript
function getRecoveryAction(error) {
  switch (error.code) {
    case 'INSUFFICIENT_FUNDS':
      return {
        text: 'Add Funds',
        action: () => navigateToFunding(),
        primary: true
      };
    
    case 'KYC_REQUIRED':
      return {
        text: 'Complete Verification',
        action: () => navigateToKYC(),
        primary: true
      };
    
    case 'RATE_LIMIT_EXCEEDED':
      return {
        text: 'Try Again',
        action: () => retryAfterDelay(error.retryAfter),
        disabled: true,
        countdown: error.retryAfter
      };
    
    default:
      return {
        text: 'Dismiss',
        action: () => dismissError()
      };
  }
}
```

### 4. Monitoring and Alerting

```javascript
class ErrorMonitor {
  static logError(error, context = {}) {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack
      },
      context: {
        userId: context.userId,
        endpoint: context.endpoint,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    // Send to monitoring service
    fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport)
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', errorReport);
    }
  }

  static trackErrorRate() {
    // Track error rate metrics
    const errorCount = this.getErrorCount();
    const totalRequests = this.getTotalRequests();
    const errorRate = errorCount / totalRequests;

    if (errorRate > 0.05) { // 5% error rate threshold
      this.alertHighErrorRate(errorRate);
    }
  }
}
```

## Testing Error Scenarios

### Unit Tests for Error Handling

```javascript
describe('API Error Handling', () => {
  test('should handle invalid token error', async () => {
    mockAPI.mockRejectedValueOnce(new APIError({
      error: 'INVALID_TOKEN',
      message: 'Token is invalid',
      statusCode: 401
    }));

    const result = await apiClient.getProperties();
    
    expect(mockRefreshToken).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('should handle rate limit with retry', async () => {
    mockAPI
      .mockRejectedValueOnce(new APIError({
        error: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        details: { retryAfter: 1 }
      }))
      .mockResolvedValueOnce({ properties: [] });

    const result = await apiClient.getPropertiesWithRetry();
    
    expect(mockAPI).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });

  test('should not retry client errors', async () => {
    mockAPI.mockRejectedValueOnce(new APIError({
      error: 'VALIDATION_ERROR',
      statusCode: 422
    }));

    await expect(
      apiClient.createPropertyWithRetry({})
    ).rejects.toThrow('VALIDATION_ERROR');

    expect(mockAPI).toHaveBeenCalledTimes(1);
  });
});
```

---

*For more information on specific API endpoints and their error responses, see the [API Overview](README.md) and endpoint-specific documentation.*