// NexVestXR Example Rate Limited Routes
// Demonstrates integration of intelligent rate limiting with Express routes

const express = require('express');
const RateLimitingMiddleware = require('../middleware/rate-limiting-middleware');

const router = express.Router();
const rateLimiter = new RateLimitingMiddleware();

// ============================================================================
// AUTHENTICATION ROUTES WITH RATE LIMITING
// ============================================================================

// Login endpoint with aggressive rate limiting
router.post('/auth/login', 
    rateLimiter.authRateLimit(),
    async (req, res) => {
        try {
            // Authentication logic here
            const { username, password } = req.body;
            
            // Simulate authentication
            const authResult = await authenticateUser(username, password);
            
            if (authResult.success) {
                res.json({
                    success: true,
                    token: authResult.token,
                    user: authResult.user
                });
            } else {
                res.status(401).json({
                    error: 'Authentication failed',
                    message: 'Invalid credentials'
                });
            }
        } catch (error) {
            res.status(500).json({
                error: 'Authentication error',
                message: error.message
            });
        }
    }
);

// Registration with rate limiting
router.post('/auth/register',
    rateLimiter.registerRateLimit(),
    async (req, res) => {
        try {
            // Registration logic
            const registrationData = req.body;
            const result = await registerUser(registrationData);
            
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                userId: result.userId
            });
        } catch (error) {
            res.status(400).json({
                error: 'Registration failed',
                message: error.message
            });
        }
    }
);

// Password reset with rate limiting
router.post('/auth/forgot-password',
    rateLimiter.passwordResetRateLimit(),
    async (req, res) => {
        try {
            const { email } = req.body;
            await sendPasswordResetEmail(email);
            
            res.json({
                success: true,
                message: 'Password reset email sent'
            });
        } catch (error) {
            res.status(400).json({
                error: 'Password reset failed',
                message: error.message
            });
        }
    }
);

// ============================================================================
// PAYMENT ROUTES WITH SPECIALIZED RATE LIMITING
// ============================================================================

// Payment processing with token bucket rate limiting
router.post('/payments/process',
    rateLimiter.paymentRateLimit(),
    async (req, res) => {
        try {
            const paymentData = req.body;
            const result = await processPayment(paymentData);
            
            res.json({
                success: true,
                transactionId: result.transactionId,
                status: result.status
            });
        } catch (error) {
            res.status(400).json({
                error: 'Payment processing failed',
                message: error.message
            });
        }
    }
);

// Webhook endpoint with leaky bucket rate limiting
router.post('/payments/webhook',
    rateLimiter.webhookRateLimit(),
    async (req, res) => {
        try {
            const webhookData = req.body;
            await processWebhook(webhookData);
            
            res.status(200).json({ received: true });
        } catch (error) {
            res.status(400).json({
                error: 'Webhook processing failed',
                message: error.message
            });
        }
    }
);

// ============================================================================
// API ROUTES WITH ADAPTIVE RATE LIMITING
// ============================================================================

// User API with adaptive rate limiting based on user tier
router.get('/user/profile',
    rateLimiter.adaptiveUserRateLimit(),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const profile = await getUserProfile(userId);
            
            res.json(profile);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch profile',
                message: error.message
            });
        }
    }
);

// Property creation with daily limits
router.post('/properties/create',
    rateLimiter.propertyCreationRateLimit(),
    async (req, res) => {
        try {
            const propertyData = req.body;
            propertyData.ownerId = req.user.id;
            
            const result = await createProperty(propertyData);
            
            res.status(201).json({
                success: true,
                propertyId: result.propertyId,
                message: 'Property created successfully'
            });
        } catch (error) {
            res.status(400).json({
                error: 'Property creation failed',
                message: error.message
            });
        }
    }
);

// File upload with token bucket limiting
router.post('/upload/document',
    rateLimiter.uploadRateLimit(),
    async (req, res) => {
        try {
            // File upload logic
            const uploadResult = await uploadFile(req.file);
            
            res.json({
                success: true,
                fileId: uploadResult.fileId,
                url: uploadResult.url
            });
        } catch (error) {
            res.status(400).json({
                error: 'File upload failed',
                message: error.message
            });
        }
    }
);

// ============================================================================
// ADMIN ROUTES WITH HIGH RATE LIMITS
// ============================================================================

// Admin API with elevated rate limits
router.get('/admin/stats',
    rateLimiter.adminApiRateLimit(),
    async (req, res) => {
        try {
            const stats = await getSystemStats();
            res.json(stats);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch stats',
                message: error.message
            });
        }
    }
);

// Admin rate limit management
router.post('/admin/rate-limits/clear',
    rateLimiter.adminApiRateLimit(),
    async (req, res) => {
        try {
            const { key } = req.body;
            const result = await rateLimiter.clearRateLimit(key);
            
            res.json({
                success: result,
                message: result ? 'Rate limit cleared' : 'Failed to clear rate limit'
            });
        } catch (error) {
            res.status(500).json({
                error: 'Rate limit management failed',
                message: error.message
            });
        }
    }
);

// ============================================================================
// ADVANCED RATE LIMITING EXAMPLES
// ============================================================================

// Geographic rate limiting example
router.get('/api/geo-sensitive',
    rateLimiter.geographicRateLimit(),
    async (req, res) => {
        try {
            const data = await getGeoSensitiveData(req.user.id);
            res.json(data);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch data',
                message: error.message
            });
        }
    }
);

// Time-based rate limiting example
router.get('/api/time-sensitive',
    rateLimiter.timeBasedRateLimit(),
    async (req, res) => {
        try {
            const data = await getTimeSensitiveData();
            res.json(data);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch data',
                message: error.message
            });
        }
    }
);

// Circuit breaker rate limiting example
router.get('/api/unreliable-service',
    rateLimiter.circuitBreakerRateLimit({
        failureThreshold: 5,
        recoveryTime: 30000,
        halfOpenRequests: 2
    }),
    async (req, res) => {
        try {
            // Simulate potentially unreliable external service
            const data = await callUnreliableService();
            res.json(data);
        } catch (error) {
            res.status(500).json({
                error: 'Service unavailable',
                message: error.message
            });
        }
    }
);

// ============================================================================
// CUSTOM RATE LIMITING EXAMPLES
// ============================================================================

// Custom rate limiting for heavy operations
router.post('/api/heavy-computation',
    rateLimiter.rateLimit('default', {
        algorithm: 'token_bucket',
        capacity: 5,
        refillRate: 0.5, // 1 token every 2 minutes
        cost: 3, // Each request costs 3 tokens
        keyGenerator: (req) => `heavy:${req.user.id}`,
        message: 'Heavy operation rate limit exceeded'
    }),
    async (req, res) => {
        try {
            const result = await performHeavyComputation(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: 'Computation failed',
                message: error.message
            });
        }
    }
);

// Burst rate limiting for API calls
router.get('/api/burst-allowed',
    rateLimiter.rateLimit('default', {
        algorithm: 'leaky_bucket',
        capacity: 50,
        leakRate: 10, // 10 requests per minute steady state
        keyGenerator: (req) => `burst:${req.user.id}`,
        message: 'Burst rate limit exceeded'
    }),
    async (req, res) => {
        try {
            const data = await getBurstData();
            res.json(data);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch data',
                message: error.message
            });
        }
    }
);

// ============================================================================
// RATE LIMIT MONITORING ROUTES
// ============================================================================

// Get rate limit status for current user
router.get('/rate-limits/status',
    rateLimiter.defaultApiRateLimit(),
    async (req, res) => {
        try {
            const userKey = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
            const status = await rateLimiter.getRateLimitStatus(userKey);
            
            res.json({
                success: true,
                rateLimitStatus: status,
                systemMetrics: rateLimiter.getSystemMetrics()
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to fetch rate limit status',
                message: error.message
            });
        }
    }
);

// ============================================================================
// PLACEHOLDER FUNCTIONS (Replace with actual implementations)
// ============================================================================

async function authenticateUser(username, password) {
    // Placeholder authentication logic
    return {
        success: username === 'admin' && password === 'password',
        token: 'jwt-token-here',
        user: { id: 1, username: username, tier: 'premium' }
    };
}

async function registerUser(registrationData) {
    // Placeholder registration logic
    return { userId: Math.floor(Math.random() * 10000) };
}

async function sendPasswordResetEmail(email) {
    // Placeholder password reset logic
    console.log(`Password reset email sent to ${email}`);
}

async function processPayment(paymentData) {
    // Placeholder payment processing
    return {
        transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
        status: 'completed'
    };
}

async function processWebhook(webhookData) {
    // Placeholder webhook processing
    console.log('Webhook processed:', webhookData);
}

async function getUserProfile(userId) {
    // Placeholder profile fetch
    return { id: userId, name: 'John Doe', tier: 'premium' };
}

async function createProperty(propertyData) {
    // Placeholder property creation
    return { propertyId: Math.floor(Math.random() * 10000) };
}

async function uploadFile(file) {
    // Placeholder file upload
    return {
        fileId: `file_${Math.random().toString(36).substr(2, 9)}`,
        url: 'https://example.com/file.pdf'
    };
}

async function getSystemStats() {
    // Placeholder system stats
    return {
        users: 1000,
        properties: 500,
        transactions: 2000
    };
}

async function getGeoSensitiveData(userId) {
    // Placeholder geo-sensitive data
    return { message: 'Geo-sensitive data', userId: userId };
}

async function getTimeSensitiveData() {
    // Placeholder time-sensitive data
    return { message: 'Time-sensitive data', timestamp: new Date() };
}

async function callUnreliableService() {
    // Placeholder unreliable service call
    if (Math.random() < 0.3) { // 30% chance of failure
        throw new Error('Service temporarily unavailable');
    }
    return { message: 'Service response', data: 'success' };
}

async function performHeavyComputation(data) {
    // Placeholder heavy computation
    return { result: 'computed', input: data };
}

async function getBurstData() {
    // Placeholder burst data
    return { message: 'Burst data', timestamp: new Date() };
}

module.exports = router;