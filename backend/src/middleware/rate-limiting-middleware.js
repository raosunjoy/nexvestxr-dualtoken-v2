// NexVestXR Rate Limiting Middleware Integration
// Express middleware for intelligent rate limiting

const IntelligentRateLimiter = require('../security/intelligent-rate-limiter');

class RateLimitingMiddleware {
    constructor() {
        this.rateLimiter = new IntelligentRateLimiter();
        this.auditLogger = require('../security/audit-logger');
        
        // System monitoring for dynamic adjustments
        this.systemMetrics = {
            cpu: 0,
            memory: 0,
            connections: 0,
            lastUpdate: 0
        };
        
        // Start system monitoring
        this.startSystemMonitoring();
    }

    // ============================================================================
    // MIDDLEWARE FACTORIES
    // ============================================================================

    // Generic rate limiting middleware
    rateLimit(endpoint, customConfig = {}) {
        return this.rateLimiter.createRateLimiter(endpoint, customConfig);
    }

    // Authentication rate limiting
    authRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/auth/login');
    }

    // Registration rate limiting
    registerRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/auth/register');
    }

    // Password reset rate limiting
    passwordResetRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/auth/forgot-password');
    }

    // Payment processing rate limiting
    paymentRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/payments/process');
    }

    // Webhook rate limiting
    webhookRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/payments/webhook');
    }

    // User API rate limiting
    userApiRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/user');
    }

    // Property creation rate limiting
    propertyCreationRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/properties/create');
    }

    // Admin API rate limiting
    adminApiRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/admin');
    }

    // File upload rate limiting
    uploadRateLimit() {
        return this.rateLimiter.createRateLimiter('/api/upload');
    }

    // Default API rate limiting
    defaultApiRateLimit() {
        return this.rateLimiter.createRateLimiter('default');
    }

    // ============================================================================
    // SPECIALIZED MIDDLEWARE
    // ============================================================================

    // Adaptive rate limiting based on user tier
    adaptiveUserRateLimit() {
        return async (req, res, next) => {
            try {
                const user = req.user;
                let config = {};

                if (user) {
                    // Adjust limits based on user tier/subscription
                    switch (user.tier) {
                        case 'premium':
                            config.maxRequests = 200;
                            break;
                        case 'professional':
                            config.maxRequests = 150;
                            break;
                        case 'basic':
                            config.maxRequests = 100;
                            break;
                        default:
                            config.maxRequests = 60;
                    }

                    // VIP users get higher limits
                    if (user.isVip) {
                        config.maxRequests *= 2;
                    }

                    // Verified users get slightly higher limits
                    if (user.isVerified) {
                        config.maxRequests = Math.floor(config.maxRequests * 1.2);
                    }
                }

                const rateLimitMiddleware = this.rateLimiter.createRateLimiter('default', config);
                return rateLimitMiddleware(req, res, next);

            } catch (error) {
                console.error('Adaptive rate limiting error:', error);
                next(); // Fail open
            }
        };
    }

    // Geographic rate limiting
    geographicRateLimit() {
        return async (req, res, next) => {
            try {
                const country = req.get('CF-IPCountry') || req.get('X-Country-Code') || 'unknown';
                let config = {};

                // Adjust limits based on geographic location
                if (['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'IN'].includes(country)) {
                    // Higher limits for primary markets
                    config.maxRequests = 100;
                } else if (['CN', 'RU', 'IR', 'KP'].includes(country)) {
                    // Lower limits for restricted regions
                    config.maxRequests = 20;
                } else {
                    // Standard limits for other countries
                    config.maxRequests = 60;
                }

                config.keyGenerator = (req) => `geo:${country}:${req.ip}`;

                const rateLimitMiddleware = this.rateLimiter.createRateLimiter('default', config);
                return rateLimitMiddleware(req, res, next);

            } catch (error) {
                console.error('Geographic rate limiting error:', error);
                next(); // Fail open
            }
        };
    }

    // Time-based rate limiting (different limits for different times)
    timeBasedRateLimit() {
        return async (req, res, next) => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const isWeekend = now.getDay() === 0 || now.getDay() === 6;
                
                let config = {};

                // Business hours (9 AM - 6 PM on weekdays)
                if (!isWeekend && hour >= 9 && hour <= 18) {
                    config.maxRequests = 120; // Higher limits during business hours
                } else if (!isWeekend && (hour >= 6 && hour < 9 || hour > 18 && hour <= 22)) {
                    config.maxRequests = 80; // Medium limits during extended hours
                } else {
                    config.maxRequests = 40; // Lower limits during off-hours
                }

                config.keyGenerator = (req) => `time:${hour}:${req.user?.id || req.ip}`;

                const rateLimitMiddleware = this.rateLimiter.createRateLimiter('default', config);
                return rateLimitMiddleware(req, res, next);

            } catch (error) {
                console.error('Time-based rate limiting error:', error);
                next(); // Fail open
            }
        };
    }

    // Circuit breaker rate limiting
    circuitBreakerRateLimit(options = {}) {
        const {
            failureThreshold = 10,
            recoveryTime = 60000, // 1 minute
            halfOpenRequests = 3
        } = options;

        let state = 'closed'; // closed, open, half-open
        let failures = 0;
        let lastFailureTime = 0;
        let halfOpenAttempts = 0;

        return async (req, res, next) => {
            try {
                const now = Date.now();

                // Check if we should transition from open to half-open
                if (state === 'open' && (now - lastFailureTime) >= recoveryTime) {
                    state = 'half-open';
                    halfOpenAttempts = 0;
                }

                // If circuit is open, reject requests
                if (state === 'open') {
                    this.auditLogger.log('circuit_breaker_blocked', {
                        ip: req.ip,
                        path: req.path,
                        state: state,
                        failures: failures,
                        timestamp: new Date().toISOString()
                    });

                    return res.status(503).json({
                        error: 'Service temporarily unavailable',
                        message: 'Circuit breaker is open',
                        retryAfter: Math.ceil((recoveryTime - (now - lastFailureTime)) / 1000)
                    });
                }

                // If half-open, limit requests
                if (state === 'half-open') {
                    halfOpenAttempts++;
                    if (halfOpenAttempts > halfOpenRequests) {
                        state = 'open';
                        lastFailureTime = now;
                        return res.status(503).json({
                            error: 'Service temporarily unavailable',
                            message: 'Circuit breaker reopened',
                            retryAfter: Math.ceil(recoveryTime / 1000)
                        });
                    }
                }

                // Apply normal rate limiting
                const rateLimitMiddleware = this.rateLimiter.createRateLimiter('default');
                
                // Wrap the next function to detect failures
                const wrappedNext = (error) => {
                    if (error || res.statusCode >= 500) {
                        failures++;
                        lastFailureTime = now;
                        
                        if (failures >= failureThreshold) {
                            state = 'open';
                            this.auditLogger.log('circuit_breaker_opened', {
                                failures: failures,
                                threshold: failureThreshold,
                                timestamp: new Date().toISOString()
                            });
                        }
                    } else if (state === 'half-open') {
                        // Success in half-open state
                        state = 'closed';
                        failures = 0;
                        this.auditLogger.log('circuit_breaker_closed', {
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    next(error);
                };

                return rateLimitMiddleware(req, res, wrappedNext);

            } catch (error) {
                console.error('Circuit breaker rate limiting error:', error);
                next(); // Fail open
            }
        };
    }

    // ============================================================================
    // SYSTEM MONITORING
    // ============================================================================

    startSystemMonitoring() {
        setInterval(async () => {
            try {
                await this.updateSystemMetrics();
                await this.rateLimiter.adjustRateLimits(this.systemMetrics);
            } catch (error) {
                console.error('System monitoring error:', error);
            }
        }, 30000); // Every 30 seconds
    }

    async updateSystemMetrics() {
        try {
            const now = Date.now();
            
            // Get CPU usage (simplified)
            const loadavg = require('os').loadavg();
            const cpuCount = require('os').cpus().length;
            this.systemMetrics.cpu = Math.min(100, (loadavg[0] / cpuCount) * 100);

            // Get memory usage
            const totalMem = require('os').totalmem();
            const freeMem = require('os').freemem();
            this.systemMetrics.memory = ((totalMem - freeMem) / totalMem) * 100;

            // Active connections would be tracked by the application
            // This is a placeholder for demonstration
            this.systemMetrics.connections = 0;
            
            this.systemMetrics.lastUpdate = now;

        } catch (error) {
            console.error('Failed to update system metrics:', error);
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    // Whitelist management
    addToWhitelist(ip) {
        return this.rateLimiter.addToWhitelist(ip);
    }

    removeFromWhitelist(ip) {
        return this.rateLimiter.removeFromWhitelist(ip);
    }

    // Rate limit status
    async getRateLimitStatus(key) {
        return await this.rateLimiter.getRateLimitStatus(key);
    }

    // Clear rate limits
    async clearRateLimit(key) {
        return await this.rateLimiter.clearRateLimit(key);
    }

    // Get system metrics
    getSystemMetrics() {
        return { ...this.systemMetrics };
    }

    // Graceful shutdown
    async shutdown() {
        await this.rateLimiter.shutdown();
    }
}

module.exports = RateLimitingMiddleware;