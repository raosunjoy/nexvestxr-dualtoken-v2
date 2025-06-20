# XUMM Wallet Integration

NexVestXR v2 integrates with XUMM wallet for secure XRPL transactions, seamless user authentication, and decentralized wallet management across mobile and web platforms.

## 🔐 XUMM Integration Overview

### Integration Architecture

```javascript
const XummIntegration = {
  core: {
    authentication: 'XUMM-based user authentication',
    transactions: 'Transaction signing and submission',
    walletConnect: 'Deep linking and wallet connection',
    payloads: 'Payment request and transaction payloads'
  },
  services: {
    authService: 'User authentication and verification',
    transactionService: 'Transaction creation and monitoring',
    payloadService: 'Payload management and tracking',
    webhookService: 'Real-time transaction updates'
  },
  platforms: {
    mobile: 'React Native XUMM SDK integration',
    web: 'Web-based XUMM connectivity',
    backend: 'Server-side payload management'
  }
};
```

### XUMM Configuration

**API Configuration:**
```javascript
const xummConfig = {
  api: {
    baseURL: 'https://xumm.app/api/v1',
    websocket: 'wss://xumm.app',
    credentials: {
      apiKey: process.env.XUMM_API_KEY,
      apiSecret: process.env.XUMM_API_SECRET
    }
  },
  application: {
    name: 'NexVestXR',
    description: 'Real Estate Investment Platform',
    icon: 'https://nexvestxr.com/assets/icon.png',
    deepLink: 'nexvestxr://',
    webhook: 'https://api.nexvestxr.com/webhooks/xumm'
  },
  networks: {
    mainnet: {
      server: 'wss://xrplcluster.com',
      networkId: 0
    },
    testnet: {
      server: 'wss://s.altnet.rippletest.net:51233',
      networkId: 1
    }
  }
};
```

## 🔑 Authentication Service

### User Authentication Flow

**XUMM Authentication Implementation:**
```javascript
class XummAuthService {
  constructor() {
    this.xumm = new XummSdk(xummConfig.api.apiKey, xummConfig.api.apiSecret);
    this.activeSessions = new Map();
  }

  async initiateAuth(userIdentifier) {
    try {
      // Create signin payload
      const authPayload = {
        TransactionType: 'SignIn',
        custom_meta: {
          identifier: userIdentifier,
          instruction: 'Sign in to NexVestXR platform'
        },
        options: {
          submit: false,
          multisign: false,
          expire: 5 // 5 minutes
        }
      };

      const payload = await this.xumm.payload.create(authPayload);
      
      // Store session
      this.activeSessions.set(payload.uuid, {
        userIdentifier,
        created: new Date().toISOString(),
        status: 'pending'
      });

      return {
        payloadUuid: payload.uuid,
        qrCode: payload.refs.qr_png,
        deepLink: payload.next.always,
        websocket: payload.refs.websocket_status
      };
    } catch (error) {
      console.error('XUMM auth initiation failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async verifyAuth(payloadUuid) {
    try {
      const payloadData = await this.xumm.payload.get(payloadUuid);
      
      if (payloadData.meta.signed && payloadData.meta.resolved) {
        const userAccount = payloadData.response.account;
        const publicKey = payloadData.response.public_key;
        
        // Generate JWT token
        const authToken = await this.generateAuthToken({
          account: userAccount,
          publicKey: publicKey,
          payloadUuid: payloadUuid
        });

        // Update session
        this.activeSessions.set(payloadUuid, {
          ...this.activeSessions.get(payloadUuid),
          status: 'verified',
          account: userAccount,
          verifiedAt: new Date().toISOString()
        });

        return {
          success: true,
          account: userAccount,
          authToken: authToken,
          expiresIn: 3600 // 1 hour
        };
      } else {
        return {
          success: false,
          status: payloadData.meta.expired ? 'expired' : 'pending',
          message: 'Authentication not completed'
        };
      }
    } catch (error) {
      console.error('XUMM auth verification failed:', error);
      throw error;
    }
  }

  async generateAuthToken(userData) {
    const payload = {
      account: userData.account,
      publicKey: userData.publicKey,
      payloadUuid: userData.payloadUuid,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };

    return jwt.sign(payload, process.env.JWT_SECRET);
  }

  async refreshToken(authToken) {
    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      
      // Verify account still exists and is valid
      const accountInfo = await this.getAccountInfo(decoded.account);
      
      if (accountInfo) {
        return this.generateAuthToken(decoded);
      } else {
        throw new Error('Account no longer valid');
      }
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }
}
```

### Multi-Platform Authentication

**React Native Integration:**
```javascript
class XummReactNativeAuth {
  constructor() {
    this.authService = new XummAuthService();
  }

  async authenticate() {
    try {
      // Initiate authentication
      const authData = await this.authService.initiateAuth(deviceId);
      
      // Check if XUMM app is installed
      const xummInstalled = await this.checkXummInstalled();
      
      if (xummInstalled) {
        // Open XUMM app directly
        await Linking.openURL(authData.deepLink);
      } else {
        // Show QR code for web XUMM
        this.showQRCodeModal(authData.qrCode);
      }

      // Monitor authentication status
      return this.monitorAuth(authData.payloadUuid);
    } catch (error) {
      console.error('Mobile authentication failed:', error);
      throw error;
    }
  }

  async checkXummInstalled() {
    try {
      const canOpen = await Linking.canOpenURL('xumm://');
      return canOpen;
    } catch (error) {
      return false;
    }
  }

  async monitorAuth(payloadUuid) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const result = await this.authService.verifyAuth(payloadUuid);
          
          if (result.success) {
            clearInterval(interval);
            resolve(result);
          } else if (result.status === 'expired') {
            clearInterval(interval);
            reject(new Error('Authentication expired'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2000); // Check every 2 seconds

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Authentication timeout'));
      }, 300000);
    });
  }
}
```

## 💸 Transaction Management

### Payment Processing

**XUMM Payment Service:**
```javascript
class XummPaymentService {
  constructor() {
    this.xumm = new XummSdk(xummConfig.api.apiKey, xummConfig.api.apiSecret);
    this.pendingPayments = new Map();
  }

  async createPayment(paymentDetails) {
    try {
      const {
        fromAccount,
        toAccount,
        amount,
        currency,
        memo,
        destinationTag
      } = paymentDetails;

      // Create payment payload
      const paymentPayload = {
        TransactionType: 'Payment',
        Account: fromAccount,
        Destination: toAccount,
        Amount: currency === 'XRP' 
          ? this.xrpToDrops(amount)
          : {
              currency: currency,
              value: amount.toString(),
              issuer: this.getTokenIssuer(currency)
            },
        Fee: '12', // 12 drops
        DestinationTag: destinationTag,
        Memos: memo ? [{
          Memo: {
            MemoType: this.convertToHex('payment'),
            MemoData: this.convertToHex(memo)
          }
        }] : undefined,
        custom_meta: {
          identifier: `payment_${Date.now()}`,
          instruction: `Pay ${amount} ${currency} for property investment`
        },
        options: {
          submit: true,
          multisign: false,
          expire: 10 // 10 minutes
        }
      };

      const payload = await this.xumm.payload.create(paymentPayload);
      
      // Store payment tracking
      this.pendingPayments.set(payload.uuid, {
        ...paymentDetails,
        payloadUuid: payload.uuid,
        status: 'pending',
        created: new Date().toISOString()
      });

      return {
        payloadUuid: payload.uuid,
        qrCode: payload.refs.qr_png,
        deepLink: payload.next.always,
        websocket: payload.refs.websocket_status,
        expires: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };
    } catch (error) {
      console.error('Payment creation failed:', error);
      throw error;
    }
  }

  async trackPayment(payloadUuid) {
    try {
      const payloadData = await this.xumm.payload.get(payloadUuid);
      const paymentInfo = this.pendingPayments.get(payloadUuid);

      if (payloadData.meta.signed && payloadData.meta.resolved) {
        const txHash = payloadData.response.txid;
        
        // Update payment status
        this.pendingPayments.set(payloadUuid, {
          ...paymentInfo,
          status: 'completed',
          txHash: txHash,
          completedAt: new Date().toISOString()
        });

        // Verify transaction on ledger
        const txVerification = await this.verifyTransaction(txHash);
        
        return {
          status: 'completed',
          txHash: txHash,
          verification: txVerification,
          amount: paymentInfo.amount,
          currency: paymentInfo.currency
        };
      } else if (payloadData.meta.expired) {
        this.pendingPayments.set(payloadUuid, {
          ...paymentInfo,
          status: 'expired',
          expiredAt: new Date().toISOString()
        });

        return {
          status: 'expired',
          message: 'Payment request expired'
        };
      } else {
        return {
          status: 'pending',
          message: 'Waiting for user confirmation'
        };
      }
    } catch (error) {
      console.error('Payment tracking failed:', error);
      throw error;
    }
  }

  async verifyTransaction(txHash) {
    try {
      // Get transaction from XRPL
      const client = new xrpl.Client('wss://xrplcluster.com');
      await client.connect();
      
      const tx = await client.request({
        command: 'tx',
        transaction: txHash
      });

      await client.disconnect();

      return {
        validated: tx.result.validated,
        successful: tx.result.meta.TransactionResult === 'tesSUCCESS',
        ledgerIndex: tx.result.ledger_index,
        date: tx.result.date,
        fee: tx.result.Fee,
        sequence: tx.result.Sequence
      };
    } catch (error) {
      console.error('Transaction verification failed:', error);
      return { verified: false, error: error.message };
    }
  }
}
```

### Token Operations

**XERA Token Management:**
```javascript
class XummTokenService {
  async createTokenTransfer(fromAccount, toAccount, tokenAmount, tokenCurrency) {
    const transferPayload = {
      TransactionType: 'Payment',
      Account: fromAccount,
      Destination: toAccount,
      Amount: {
        currency: tokenCurrency,
        value: tokenAmount.toString(),
        issuer: this.getTokenIssuer(tokenCurrency)
      },
      custom_meta: {
        identifier: `token_transfer_${Date.now()}`,
        instruction: `Transfer ${tokenAmount} ${tokenCurrency} tokens`
      },
      options: {
        submit: true,
        expire: 5
      }
    };

    return await this.xumm.payload.create(transferPayload);
  }

  async createTrustLine(userAccount, tokenCurrency, trustLimit) {
    const trustPayload = {
      TransactionType: 'TrustSet',
      Account: userAccount,
      LimitAmount: {
        currency: tokenCurrency,
        issuer: this.getTokenIssuer(tokenCurrency),
        value: trustLimit.toString()
      },
      custom_meta: {
        identifier: `trustline_${tokenCurrency}_${Date.now()}`,
        instruction: `Enable ${tokenCurrency} tokens on your account`
      },
      options: {
        submit: true,
        expire: 10
      }
    };

    return await this.xumm.payload.create(trustPayload);
  }

  async stakingTransaction(userAccount, stakingAmount, cityPool) {
    const stakingPayload = {
      TransactionType: 'EscrowCreate',
      Account: userAccount,
      Destination: this.getStakingPoolAccount(cityPool),
      Amount: {
        currency: 'XERA',
        value: stakingAmount.toString(),
        issuer: xeraTokenConfig.issuer
      },
      FinishAfter: this.calculateStakingEndTime(cityPool),
      custom_meta: {
        identifier: `staking_${cityPool}_${Date.now()}`,
        instruction: `Stake ${stakingAmount} XERA in ${cityPool} pool`
      },
      options: {
        submit: true,
        expire: 15
      }
    };

    return await this.xumm.payload.create(stakingPayload);
  }
}
```

## 🌐 Web Integration

### Browser Wallet Connect

**Web XUMM Integration:**
```javascript
class XummWebConnect {
  constructor() {
    this.paymentService = new XummPaymentService();
    this.authService = new XummAuthService();
    this.connectionStatus = 'disconnected';
  }

  async connectWallet() {
    try {
      // Create connection payload
      const authResult = await this.authService.initiateAuth('web_user');
      
      // Display QR code and deep link
      this.displayConnectionUI({
        qrCode: authResult.qrCode,
        deepLink: authResult.deepLink,
        payloadUuid: authResult.payloadUuid
      });

      // Monitor connection
      const connection = await this.monitorConnection(authResult.payloadUuid);
      
      if (connection.success) {
        this.connectionStatus = 'connected';
        this.connectedAccount = connection.account;
        
        // Store connection in session
        sessionStorage.setItem('xumm_auth', JSON.stringify({
          account: connection.account,
          token: connection.authToken,
          expires: Date.now() + 3600000 // 1 hour
        }));

        return connection;
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }

  displayConnectionUI(connectionData) {
    // Create modal with QR code
    const modal = document.createElement('div');
    modal.className = 'xumm-connection-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Connect XUMM Wallet</h3>
        <div class="qr-container">
          <img src="${connectionData.qrCode}" alt="XUMM QR Code" />
        </div>
        <div class="connection-options">
          <button onclick="window.open('${connectionData.deepLink}')" class="open-xumm-btn">
            Open XUMM App
          </button>
          <p>Or scan QR code with XUMM mobile app</p>
        </div>
        <div class="status">Waiting for wallet connection...</div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.activeModal = modal;
  }

  async disconnectWallet() {
    this.connectionStatus = 'disconnected';
    this.connectedAccount = null;
    
    // Clear session storage
    sessionStorage.removeItem('xumm_auth');
    
    // Close any active modals
    if (this.activeModal) {
      document.body.removeChild(this.activeModal);
      this.activeModal = null;
    }
  }

  async getConnectedAccount() {
    const storedAuth = sessionStorage.getItem('xumm_auth');
    
    if (storedAuth) {
      const auth = JSON.parse(storedAuth);
      
      // Check if token is expired
      if (Date.now() < auth.expires) {
        this.connectionStatus = 'connected';
        this.connectedAccount = auth.account;
        return auth.account;
      } else {
        // Token expired, remove from storage
        sessionStorage.removeItem('xumm_auth');
      }
    }
    
    return null;
  }
}
```

### Transaction UI Components

**React Components for XUMM:**
```javascript
const XummPaymentButton = ({ amount, currency, onSuccess, onError }) => {
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentData, setPaymentData] = useState(null);

  const handlePayment = async () => {
    try {
      setPaymentStatus('initiating');
      
      const payment = await xummPaymentService.createPayment({
        fromAccount: connectedAccount,
        toAccount: destinationAccount,
        amount,
        currency,
        memo: 'Property investment payment'
      });

      setPaymentData(payment);
      setPaymentStatus('pending');

      // Monitor payment
      const result = await xummPaymentService.trackPayment(payment.payloadUuid);
      
      if (result.status === 'completed') {
        setPaymentStatus('completed');
        onSuccess(result);
      } else {
        setPaymentStatus('failed');
        onError(new Error(result.message));
      }
    } catch (error) {
      setPaymentStatus('failed');
      onError(error);
    }
  };

  return (
    <div className="xumm-payment-component">
      {paymentStatus === 'idle' && (
        <button onClick={handlePayment} className="payment-button">
          Pay {amount} {currency} with XUMM
        </button>
      )}
      
      {paymentStatus === 'pending' && paymentData && (
        <div className="payment-pending">
          <h4>Complete Payment in XUMM</h4>
          <img src={paymentData.qrCode} alt="Payment QR Code" />
          <button onClick={() => window.open(paymentData.deepLink)}>
            Open XUMM App
          </button>
          <p>Status: Waiting for confirmation...</p>
        </div>
      )}
      
      {paymentStatus === 'completed' && (
        <div className="payment-success">
          <h4>Payment Successful!</h4>
          <p>Transaction confirmed on XRPL</p>
        </div>
      )}
      
      {paymentStatus === 'failed' && (
        <div className="payment-failed">
          <h4>Payment Failed</h4>
          <button onClick={handlePayment}>Try Again</button>
        </div>
      )}
    </div>
  );
};
```

## 📱 Mobile Deep Linking

### Deep Link Handling

**React Native Deep Link Service:**
```javascript
class XummDeepLinkService {
  constructor() {
    this.linkingSubscription = null;
  }

  async initializeDeepLinking() {
    // Handle app launch from deep link
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      this.handleDeepLink(initialUrl);
    }

    // Handle deep links while app is running
    this.linkingSubscription = Linking.addEventListener('url', (event) => {
      this.handleDeepLink(event.url);
    });
  }

  handleDeepLink(url) {
    try {
      const parsed = new URL(url);
      
      if (parsed.pathname === '/xumm/auth') {
        // Handle authentication response
        const payloadUuid = parsed.searchParams.get('payload');
        const success = parsed.searchParams.get('success') === 'true';
        
        this.handleAuthResponse(payloadUuid, success);
      } else if (parsed.pathname === '/xumm/payment') {
        // Handle payment response
        const payloadUuid = parsed.searchParams.get('payload');
        const txHash = parsed.searchParams.get('txid');
        
        this.handlePaymentResponse(payloadUuid, txHash);
      }
    } catch (error) {
      console.error('Deep link handling failed:', error);
    }
  }

  async handleAuthResponse(payloadUuid, success) {
    if (success) {
      try {
        const authResult = await xummAuthService.verifyAuth(payloadUuid);
        
        if (authResult.success) {
          // Store authentication
          await AsyncStorage.setItem('xumm_auth', JSON.stringify(authResult));
          
          // Navigate to main app
          NavigationService.navigate('Dashboard');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
      }
    } else {
      // Handle authentication failure
      Alert.alert('Authentication Failed', 'Please try again');
    }
  }

  async handlePaymentResponse(payloadUuid, txHash) {
    try {
      const paymentResult = await xummPaymentService.trackPayment(payloadUuid);
      
      if (paymentResult.status === 'completed') {
        // Show success message
        Alert.alert('Payment Successful', `Transaction: ${txHash}`);
        
        // Update app state
        this.notifyPaymentSuccess(paymentResult);
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
    }
  }

  cleanup() {
    if (this.linkingSubscription) {
      this.linkingSubscription.remove();
    }
  }
}
```

## 🔄 Webhook Integration

### Real-time Updates

**Webhook Service:**
```javascript
class XummWebhookService {
  constructor() {
    this.activeSubscriptions = new Map();
    this.eventHandlers = new Map();
  }

  async setupWebhooks() {
    // Configure webhook endpoint
    const webhookConfig = {
      url: xummConfig.application.webhook,
      events: ['payload:resolved', 'payload:expired', 'user:signin', 'user:signout']
    };

    try {
      const webhook = await this.xumm.webhook.create(webhookConfig);
      console.log('Webhook configured:', webhook.uuid);
      return webhook;
    } catch (error) {
      console.error('Webhook setup failed:', error);
      throw error;
    }
  }

  handleWebhookEvent(req, res) {
    try {
      const event = req.body;
      const eventType = event.meta.event;
      
      // Verify webhook signature
      if (!this.verifyWebhookSignature(req)) {
        return res.status(401).send('Invalid signature');
      }

      switch (eventType) {
        case 'payload:resolved':
          this.handlePayloadResolved(event);
          break;
        case 'payload:expired':
          this.handlePayloadExpired(event);
          break;
        case 'user:signin':
          this.handleUserSignin(event);
          break;
        case 'user:signout':
          this.handleUserSignout(event);
          break;
        default:
          console.log('Unknown webhook event:', eventType);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook handling failed:', error);
      res.status(500).send('Internal error');
    }
  }

  handlePayloadResolved(event) {
    const payloadUuid = event.meta.payload_uuidv4;
    const payloadData = event.payload;

    if (payloadData.meta.signed) {
      // Notify relevant services
      this.notifyPayloadSuccess(payloadUuid, payloadData);
    } else {
      // Handle rejected payload
      this.notifyPayloadRejected(payloadUuid, payloadData);
    }
  }

  verifyWebhookSignature(req) {
    const signature = req.headers['x-xumm-signature'];
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha1', xummConfig.api.apiSecret)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  }
}
```

## 📊 Analytics & Monitoring

### Usage Analytics

**XUMM Integration Metrics:**
```javascript
class XummAnalyticsService {
  async getIntegrationMetrics() {
    return {
      authentication: {
        totalLogins: await this.getTotalLogins(),
        successRate: await this.getAuthSuccessRate(),
        averageTime: await this.getAverageAuthTime(),
        uniqueUsers: await this.getUniqueUsers()
      },
      payments: {
        totalPayments: await this.getTotalPayments(),
        successRate: await this.getPaymentSuccessRate(),
        totalVolume: await this.getTotalPaymentVolume(),
        averageAmount: await this.getAveragePaymentAmount()
      },
      errors: {
        authErrors: await this.getAuthErrors(),
        paymentErrors: await this.getPaymentErrors(),
        commonIssues: await this.getCommonIssues()
      }
    };
  }

  async trackUserInteraction(event, metadata) {
    const analyticsEvent = {
      event: `xumm_${event}`,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        platform: this.detectPlatform(),
        userAgent: metadata.userAgent
      }
    };

    await this.sendAnalytics(analyticsEvent);
  }

  async generateUsageReport(timeframe) {
    const startDate = this.getStartDate(timeframe);
    const endDate = new Date();

    return {
      period: { start: startDate, end: endDate },
      summary: await this.getSummaryMetrics(startDate, endDate),
      trends: await this.getTrendData(startDate, endDate),
      userBehavior: await this.getUserBehaviorData(startDate, endDate),
      performance: await this.getPerformanceMetrics(startDate, endDate)
    };
  }
}
```

## 🛡️ Security & Best Practices

### Security Implementation

**Security Measures:**
```javascript
const xummSecurityMeasures = {
  authentication: {
    tokenValidation: 'JWT token validation with signature verification',
    sessionManagement: 'Secure session handling with timeout',
    accountVerification: 'XRPL account ownership verification'
  },
  transactions: {
    payloadValidation: 'Payload integrity verification',
    amountValidation: 'Transaction amount verification',
    destinationVerification: 'Destination account validation'
  },
  communication: {
    tlsEncryption: 'TLS 1.3 for all API communications',
    webhookSecurity: 'HMAC signature verification',
    apiRateLimit: 'Rate limiting for API endpoints'
  }
};
```

### Error Handling

**Comprehensive Error Management:**
```javascript
class XummErrorHandler {
  static handleAuthError(error) {
    const errorMap = {
      'PAYLOAD_EXPIRED': {
        message: 'Authentication request expired. Please try again.',
        action: 'retry'
      },
      'USER_REJECTED': {
        message: 'Authentication was cancelled.',
        action: 'retry'
      },
      'NETWORK_ERROR': {
        message: 'Network connection failed. Please check your connection.',
        action: 'retry'
      },
      'INVALID_ACCOUNT': {
        message: 'Invalid XRPL account. Please check your wallet.',
        action: 'contact_support'
      }
    };

    return errorMap[error.code] || {
      message: 'An unexpected error occurred.',
      action: 'contact_support'
    };
  }

  static handlePaymentError(error) {
    const errorMap = {
      'INSUFFICIENT_FUNDS': {
        message: 'Insufficient balance for this transaction.',
        action: 'add_funds'
      },
      'INVALID_DESTINATION': {
        message: 'Invalid destination address.',
        action: 'verify_address'
      },
      'PAYMENT_FAILED': {
        message: 'Payment failed. Please try again.',
        action: 'retry'
      },
      'NETWORK_CONGESTION': {
        message: 'Network is busy. Please try again later.',
        action: 'retry_later'
      }
    };

    return errorMap[error.code] || {
      message: 'Payment could not be completed.',
      action: 'contact_support'
    };
  }
}
```

---

*XUMM integration provides NexVestXR v2 users with a secure, user-friendly way to interact with the XRPL blockchain for authentication, payments, and token management across all platforms.*