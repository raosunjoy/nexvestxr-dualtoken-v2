// NexVestXR Intelligent Rate Limiting System
// Advanced distributed rate limiting with Redis backend

const Redis = require('redis');
const crypto = require('crypto');

class IntelligentRateLimiter {
    constructor() {
        this.auditLogger = require('./audit-logger');
        
        // Redis connection
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_RATE_LIMIT_DB || 2,
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            lazyConnect: true
        });

        // Rate limiting algorithms
        this.algorithms = {
            FIXED_WINDOW: 'fixed_window',
            SLIDING_WINDOW: 'sliding_window',
            TOKEN_BUCKET: 'token_bucket',
            LEAKY_BUCKET: 'leaky_bucket'
        };

        // Default rate limit configurations
        this.rateLimitConfigs = {
            // Authentication endpoints
            '/api/auth/login': {
                algorithm: this.algorithms.SLIDING_WINDOW,
                windowMs: 15 * 60 * 1000, // 15 minutes
                maxRequests: 5,
                skipSuccessfulRequests: true,
                keyGenerator: (req) => `login:${req.ip}:${req.body?.username || 'unknown'}`,
                message: 'Too many login attempts',
                headers: true,
                standardHeaders: true,
                legacyHeaders: false
            },
            '/api/auth/register': {
                algorithm: this.algorithms.FIXED_WINDOW,
                windowMs: 60 * 60 * 1000, // 1 hour
                maxRequests: 3,
                keyGenerator: (req) => `register:${req.ip}`,
                message: 'Registration limit exceeded'
            },
            '/api/auth/forgot-password': {
                algorithm: this.algorithms.SLIDING_WINDOW,
                windowMs: 60 * 60 * 1000, // 1 hour
                maxRequests: 3,
                keyGenerator: (req) => `forgot:${req.ip}:${req.body?.email || 'unknown'}`,
                message: 'Password reset limit exceeded'
            },

            // Payment endpoints
            '/api/payments/process': {
                algorithm: this.algorithms.TOKEN_BUCKET,
                capacity: 10,
                refillRate: 1, // tokens per minute
                keyGenerator: (req) => `payment:${req.user?.id || req.ip}`,
                message: 'Payment processing rate limit exceeded',
                cost: 5 // Each payment costs 5 tokens
            },
            '/api/payments/webhook': {
                algorithm: this.algorithms.LEAKY_BUCKET,
                capacity: 100,
                leakRate: 10, // requests per minute
                keyGenerator: (req) => `webhook:${req.get('x-forwarded-for') || req.ip}`,
                message: 'Webhook rate limit exceeded'
            },

            // API endpoints by user
            '/api/user': {
                algorithm: this.algorithms.SLIDING_WINDOW,
                windowMs: 60 * 1000, // 1 minute
                maxRequests: 100,
                keyGenerator: (req) => `user_api:${req.user?.id || req.ip}`,
                message: 'API rate limit exceeded'
            },

            // Property management
            '/api/properties/create': {
                algorithm: this.algorithms.FIXED_WINDOW,
                windowMs: 24 * 60 * 60 * 1000, // 24 hours
                maxRequests: 5,
                keyGenerator: (req) => `property_create:${req.user?.id}`,
                message: 'Property creation limit exceeded'
            },

            // Admin endpoints
            '/api/admin': {
                algorithm: this.algorithms.SLIDING_WINDOW,
                windowMs: 60 * 1000, // 1 minute
                maxRequests: 200,
                keyGenerator: (req) => `admin_api:${req.user?.id}`,
                message: 'Admin API rate limit exceeded'
            },

            // File uploads
            '/api/upload': {
                algorithm: this.algorithms.TOKEN_BUCKET,
                capacity: 50,
                refillRate: 5, // tokens per minute
                keyGenerator: (req) => `upload:${req.user?.id || req.ip}`,
                message: 'File upload rate limit exceeded',
                cost: 10 // Each upload costs 10 tokens
            },

            // General API
            'default': {
                algorithm: this.algorithms.SLIDING_WINDOW,
                windowMs: 60 * 1000, // 1 minute
                maxRequests: 60,
                keyGenerator: (req) => `general:${req.ip}`,
                message: 'Rate limit exceeded'
            }
        };

        // Suspicious activity thresholds
        this.suspiciousThresholds = {
            rapidFireRequests: 20, // requests in 10 seconds
            multipleEndpoints: 10, // different endpoints in 30 seconds
            failedAuthAttempts: 10, // failed attempts in 5 minutes
            largePayloadSize: 10 * 1024 * 1024 // 10MB
        };

        // Whitelist for rate limiting bypass
        this.whitelist = new Set([
            '127.0.0.1',
            '::1',
            // Add trusted IPs here
        ]);

        // Connect to Redis
        this.connectRedis();
    }

    // ============================================================================
    // REDIS CONNECTION MANAGEMENT
    // ============================================================================

    async connectRedis() {
        try {
            await this.redis.connect();
            console.log('Redis connected for rate limiting');

            // Set up Redis event listeners
            this.redis.on('error', (err) => {
                console.error('Redis rate limiter error:', err);
                this.auditLogger.log('redis_rate_limiter_error', {
                    error: err.message,
                    timestamp: new Date().toISOString()
                });
            });

            this.redis.on('reconnecting', () => {
                console.log('Redis rate limiter reconnecting...');
            });

        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            // Fallback to memory-based rate limiting
            this.memoryLimiter = new Map();
        }
    }

    // ============================================================================
    // MAIN RATE LIMITING MIDDLEWARE
    // ============================================================================

    // Create rate limiting middleware
    createRateLimiter(endpoint = 'default', customConfig = {}) {
        return async (req, res, next) => {
            try {
                // Skip if IP is whitelisted
                if (this.whitelist.has(req.ip)) {
                    return next();
                }

                // Get configuration for this endpoint
                const config = this.getRateLimitConfig(endpoint, customConfig);
                
                // Generate unique key for this request
                const key = config.keyGenerator(req);
                
                // Check rate limit based on algorithm
                const result = await this.checkRateLimit(key, config, req);
                
                if (!result.allowed) {
                    // Log rate limit violation
                    this.auditLogger.log('rate_limit_exceeded', {
                        endpoint: endpoint,
                        key: this.hashKey(key),
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                        algorithm: config.algorithm,
                        limit: config.maxRequests || config.capacity,
                        current: result.current,
                        resetTime: result.resetTime,
                        timestamp: new Date().toISOString()
                    });

                    // Set rate limit headers
                    if (config.headers) {
                        this.setRateLimitHeaders(res, result, config);
                    }

                    // Check for suspicious activity
                    await this.checkSuspiciousActivity(req, key);

                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: config.message,
                        retryAfter: result.retryAfter,
                        limit: config.maxRequests || config.capacity,
                        remaining: Math.max(0, (config.maxRequests || config.capacity) - result.current),
                        resetTime: result.resetTime
                    });
                }

                // Set success headers
                if (config.headers) {
                    this.setRateLimitHeaders(res, result, config);
                }

                next();

            } catch (error) {
                console.error('Rate limiter error:', error);
                this.auditLogger.log('rate_limiter_error', {
                    error: error.message,
                    endpoint: endpoint,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                });
                
                // Fail open - allow request if rate limiter fails
                next();
            }
        };
    }

    // ============================================================================
    // RATE LIMITING ALGORITHMS
    // ============================================================================

    async checkRateLimit(key, config, req) {
        switch (config.algorithm) {
            case this.algorithms.FIXED_WINDOW:
                return await this.fixedWindowRateLimit(key, config);
            
            case this.algorithms.SLIDING_WINDOW:
                return await this.slidingWindowRateLimit(key, config);
            
            case this.algorithms.TOKEN_BUCKET:
                return await this.tokenBucketRateLimit(key, config, req);
            
            case this.algorithms.LEAKY_BUCKET:
                return await this.leakyBucketRateLimit(key, config);
            
            default:
                return await this.slidingWindowRateLimit(key, config);
        }
    }

    // Fixed window rate limiting
    async fixedWindowRateLimit(key, config) {
        const windowKey = `fixed:${key}:${Math.floor(Date.now() / config.windowMs)}`;
        
        if (this.redis.isReady) {
            const pipeline = this.redis.multi();
            pipeline.incr(windowKey);
            pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000));
            
            const results = await pipeline.exec();
            const current = results[0][1];
            
            const resetTime = Math.ceil(Date.now() / config.windowMs) * config.windowMs;
            
            return {
                allowed: current <= config.maxRequests,
                current: current,
                resetTime: resetTime,
                retryAfter: resetTime - Date.now()
            };
        } else {
            return this.memoryFixedWindow(windowKey, config);
        }
    }

    // Sliding window rate limiting
    async slidingWindowRateLimit(key, config) {
        const now = Date.now();
        const windowStart = now - config.windowMs;
        const windowKey = `sliding:${key}`;
        
        if (this.redis.isReady) {
            const pipeline = this.redis.multi();
            
            // Remove old entries
            pipeline.zRemRangeByScore(windowKey, 0, windowStart);
            
            // Count current entries
            pipeline.zCard(windowKey);
            
            // Add current request
            pipeline.zAdd(windowKey, [{ score: now, value: `${now}:${Math.random()}` }]);
            
            // Set expiration
            pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000));
            
            const results = await pipeline.exec();
            const current = results[1][1];
            
            return {
                allowed: current < config.maxRequests,
                current: current + 1,
                resetTime: now + config.windowMs,
                retryAfter: config.windowMs
            };
        } else {
            return this.memorySlidingWindow(windowKey, config, now, windowStart);
        }
    }

    // Token bucket rate limiting
    async tokenBucketRateLimit(key, config, req) {
        const now = Date.now();
        const bucketKey = `bucket:${key}`;
        const cost = config.cost || 1;
        
        if (this.redis.isReady) {
            // Lua script for atomic token bucket operation
            const luaScript = `
                local key = KEYS[1]
                local capacity = tonumber(ARGV[1])
                local refillRate = tonumber(ARGV[2])
                local cost = tonumber(ARGV[3])
                local now = tonumber(ARGV[4])
                
                local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
                local tokens = tonumber(bucket[1]) or capacity
                local lastRefill = tonumber(bucket[2]) or now
                
                -- Calculate tokens to add based on time elapsed
                local timeDiff = (now - lastRefill) / 60000 -- minutes
                local tokensToAdd = timeDiff * refillRate
                tokens = math.min(capacity, tokens + tokensToAdd)
                
                -- Check if enough tokens
                local allowed = tokens >= cost
                if allowed then
                    tokens = tokens - cost
                end
                
                -- Update bucket
                redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
                redis.call('EXPIRE', key, 3600)
                
                return {allowed and 1 or 0, tokens, capacity}
            `;
            
            const result = await this.redis.eval(luaScript, {
                keys: [bucketKey],
                arguments: [
                    config.capacity.toString(),
                    config.refillRate.toString(),
                    cost.toString(),
                    now.toString()
                ]
            });
            
            const [allowed, tokens, capacity] = result;
            
            return {
                allowed: allowed === 1,
                current: capacity - tokens,
                resetTime: now + (60000 / config.refillRate), // Next token refill
                retryAfter: allowed === 0 ? (60000 / config.refillRate) : 0
            };
        } else {
            return this.memoryTokenBucket(bucketKey, config, cost, now);
        }
    }

    // Leaky bucket rate limiting
    async leakyBucketRateLimit(key, config) {
        const now = Date.now();
        const bucketKey = `leaky:${key}`;
        
        if (this.redis.isReady) {
            const luaScript = `
                local key = KEYS[1]
                local capacity = tonumber(ARGV[1])
                local leakRate = tonumber(ARGV[2])
                local now = tonumber(ARGV[3])
                
                local bucket = redis.call('HMGET', key, 'volume', 'lastLeak')
                local volume = tonumber(bucket[1]) or 0
                local lastLeak = tonumber(bucket[2]) or now
                
                -- Calculate volume to leak based on time elapsed
                local timeDiff = (now - lastLeak) / 60000 -- minutes
                local volumeToLeak = timeDiff * leakRate
                volume = math.max(0, volume - volumeToLeak)
                
                -- Check if bucket has capacity
                local allowed = volume < capacity
                if allowed then
                    volume = volume + 1
                end
                
                -- Update bucket
                redis.call('HMSET', key, 'volume', volume, 'lastLeak', now)
                redis.call('EXPIRE', key, 3600)
                
                return {allowed and 1 or 0, volume, capacity}
            `;
            
            const result = await this.redis.eval(luaScript, {
                keys: [bucketKey],
                arguments: [
                    config.capacity.toString(),
                    config.leakRate.toString(),
                    now.toString()
                ]
            });
            
            const [allowed, volume, capacity] = result;
            
            return {
                allowed: allowed === 1,
                current: volume,
                resetTime: now + (60000 / config.leakRate), // Next leak
                retryAfter: allowed === 0 ? (60000 / config.leakRate) : 0
            };
        } else {
            return this.memoryLeakyBucket(bucketKey, config, now);
        }
    }

    // ============================================================================
    // MEMORY FALLBACK IMPLEMENTATIONS
    // ============================================================================

    memoryFixedWindow(windowKey, config) {
        if (!this.memoryLimiter) this.memoryLimiter = new Map();
        
        const data = this.memoryLimiter.get(windowKey) || { count: 0, resetTime: Date.now() + config.windowMs };
        
        if (Date.now() > data.resetTime) {
            data.count = 1;
            data.resetTime = Date.now() + config.windowMs;
        } else {
            data.count++;
        }
        
        this.memoryLimiter.set(windowKey, data);
        
        return {
            allowed: data.count <= config.maxRequests,
            current: data.count,
            resetTime: data.resetTime,
            retryAfter: data.resetTime - Date.now()
        };
    }

    memorySlidingWindow(windowKey, config, now, windowStart) {
        if (!this.memoryLimiter) this.memoryLimiter = new Map();
        
        let requests = this.memoryLimiter.get(windowKey) || [];
        
        // Remove old requests
        requests = requests.filter(timestamp => timestamp > windowStart);
        
        // Add current request
        requests.push(now);
        
        this.memoryLimiter.set(windowKey, requests);
        
        return {
            allowed: requests.length <= config.maxRequests,
            current: requests.length,
            resetTime: now + config.windowMs,
            retryAfter: config.windowMs
        };
    }

    memoryTokenBucket(bucketKey, config, cost, now) {
        if (!this.memoryLimiter) this.memoryLimiter = new Map();
        
        const bucket = this.memoryLimiter.get(bucketKey) || {
            tokens: config.capacity,
            lastRefill: now
        };
        
        // Refill tokens
        const timeDiff = (now - bucket.lastRefill) / 60000; // minutes
        const tokensToAdd = timeDiff * config.refillRate;
        bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
        
        const allowed = bucket.tokens >= cost;
        if (allowed) {
            bucket.tokens -= cost;
        }
        
        this.memoryLimiter.set(bucketKey, bucket);
        
        return {
            allowed: allowed,
            current: config.capacity - bucket.tokens,
            resetTime: now + (60000 / config.refillRate),
            retryAfter: allowed ? 0 : (60000 / config.refillRate)
        };
    }

    memoryLeakyBucket(bucketKey, config, now) {
        if (!this.memoryLimiter) this.memoryLimiter = new Map();
        
        const bucket = this.memoryLimiter.get(bucketKey) || {
            volume: 0,
            lastLeak: now
        };
        
        // Leak volume
        const timeDiff = (now - bucket.lastLeak) / 60000; // minutes
        const volumeToLeak = timeDiff * config.leakRate;
        bucket.volume = Math.max(0, bucket.volume - volumeToLeak);
        bucket.lastLeak = now;
        
        const allowed = bucket.volume < config.capacity;
        if (allowed) {
            bucket.volume++;
        }
        
        this.memoryLimiter.set(bucketKey, bucket);
        
        return {
            allowed: allowed,
            current: bucket.volume,
            resetTime: now + (60000 / config.leakRate),
            retryAfter: allowed ? 0 : (60000 / config.leakRate)
        };
    }

    // ============================================================================
    // SUSPICIOUS ACTIVITY DETECTION
    // ============================================================================

    async checkSuspiciousActivity(req, key) {
        try {
            const suspiciousKey = `suspicious:${this.hashKey(key)}`;
            const now = Date.now();
            
            // Check for rapid fire requests
            await this.checkRapidFireRequests(suspiciousKey, now);
            
            // Check for multiple endpoint access
            await this.checkMultipleEndpoints(req.ip, req.path, now);
            
            // Check for large payload
            this.checkLargePayload(req);
            
        } catch (error) {
            console.error('Suspicious activity check error:', error);
        }
    }

    async checkRapidFireRequests(key, now) {
        if (!this.redis.isReady) return;
        
        const rapidKey = `rapid:${key}`;
        const windowStart = now - 10000; // 10 seconds
        
        await this.redis.zRemRangeByScore(rapidKey, 0, windowStart);
        const count = await this.redis.zCard(rapidKey);
        
        if (count >= this.suspiciousThresholds.rapidFireRequests) {
            this.auditLogger.log('suspicious_rapid_fire', {
                key: key,
                count: count,
                threshold: this.suspiciousThresholds.rapidFireRequests,
                timestamp: new Date().toISOString()
            });
        }
        
        await this.redis.zAdd(rapidKey, [{ score: now, value: now.toString() }]);
        await this.redis.expire(rapidKey, 60);
    }

    async checkMultipleEndpoints(ip, path, now) {
        if (!this.redis.isReady) return;
        
        const endpointKey = `endpoints:${ip}`;
        const windowStart = now - 30000; // 30 seconds
        
        await this.redis.zRemRangeByScore(endpointKey, 0, windowStart);
        await this.redis.zAdd(endpointKey, [{ score: now, value: path }]);
        
        const uniqueEndpoints = await this.redis.zRange(endpointKey, 0, -1);
        const uniqueCount = new Set(uniqueEndpoints).size;
        
        if (uniqueCount >= this.suspiciousThresholds.multipleEndpoints) {
            this.auditLogger.log('suspicious_multiple_endpoints', {
                ip: ip,
                uniqueEndpoints: uniqueCount,
                threshold: this.suspiciousThresholds.multipleEndpoints,
                endpoints: uniqueEndpoints,
                timestamp: new Date().toISOString()
            });
        }
        
        await this.redis.expire(endpointKey, 60);
    }

    checkLargePayload(req) {
        const contentLength = parseInt(req.get('content-length') || '0');
        
        if (contentLength > this.suspiciousThresholds.largePayloadSize) {
            this.auditLogger.log('suspicious_large_payload', {
                ip: req.ip,
                contentLength: contentLength,
                threshold: this.suspiciousThresholds.largePayloadSize,
                path: req.path,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    getRateLimitConfig(endpoint, customConfig) {
        const baseConfig = this.rateLimitConfigs[endpoint] || this.rateLimitConfigs['default'];
        return { ...baseConfig, ...customConfig };
    }

    setRateLimitHeaders(res, result, config) {
        const limit = config.maxRequests || config.capacity;
        const remaining = Math.max(0, limit - result.current);
        
        res.set({
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });
        
        if (!result.allowed) {
            res.set('Retry-After', Math.ceil(result.retryAfter / 1000).toString());
        }
    }

    hashKey(key) {
        return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
    }

    // Dynamic rate limit adjustment based on system load
    async adjustRateLimits(loadMetrics) {
        try {
            const cpuUsage = loadMetrics.cpu;
            const memoryUsage = loadMetrics.memory;
            const activeConnections = loadMetrics.connections;
            
            // Reduce limits if system is under high load
            if (cpuUsage > 80 || memoryUsage > 85) {
                const reductionFactor = 0.7; // 30% reduction
                
                Object.keys(this.rateLimitConfigs).forEach(endpoint => {
                    const config = this.rateLimitConfigs[endpoint];
                    if (config.maxRequests) {
                        config.maxRequests = Math.floor(config.maxRequests * reductionFactor);
                    }
                    if (config.capacity) {
                        config.capacity = Math.floor(config.capacity * reductionFactor);
                    }
                });
                
                this.auditLogger.log('rate_limits_adjusted', {
                    reason: 'high_system_load',
                    cpuUsage: cpuUsage,
                    memoryUsage: memoryUsage,
                    reductionFactor: reductionFactor,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Rate limit adjustment error:', error);
        }
    }

    // Add IP to whitelist
    addToWhitelist(ip) {
        this.whitelist.add(ip);
        this.auditLogger.log('ip_whitelisted', {
            ip: ip,
            timestamp: new Date().toISOString()
        });
    }

    // Remove IP from whitelist
    removeFromWhitelist(ip) {
        this.whitelist.delete(ip);
        this.auditLogger.log('ip_removed_from_whitelist', {
            ip: ip,
            timestamp: new Date().toISOString()
        });
    }

    // Get rate limit status for monitoring
    async getRateLimitStatus(key) {
        if (!this.redis.isReady) {
            return { error: 'Redis not available' };
        }
        
        try {
            const keys = await this.redis.keys(`*:${key}*`);
            const status = {};
            
            for (const redisKey of keys) {
                const type = await this.redis.type(redisKey);
                
                if (type === 'string') {
                    status[redisKey] = await this.redis.get(redisKey);
                } else if (type === 'zset') {
                    status[redisKey] = await this.redis.zCard(redisKey);
                } else if (type === 'hash') {
                    status[redisKey] = await this.redis.hGetAll(redisKey);
                }
            }
            
            return status;
        } catch (error) {
            return { error: error.message };
        }
    }

    // Clear rate limit for specific key
    async clearRateLimit(key) {
        if (!this.redis.isReady) {
            return false;
        }
        
        try {
            const keys = await this.redis.keys(`*:${key}*`);
            if (keys.length > 0) {
                await this.redis.del(keys);
            }
            
            this.auditLogger.log('rate_limit_cleared', {
                key: this.hashKey(key),
                clearedKeys: keys.length,
                timestamp: new Date().toISOString()
            });
            
            return true;
        } catch (error) {
            console.error('Clear rate limit error:', error);
            return false;
        }
    }

    // Graceful shutdown
    async shutdown() {
        try {
            if (this.redis.isReady) {
                await this.redis.quit();
            }
            console.log('Rate limiter shutdown complete');
        } catch (error) {
            console.error('Rate limiter shutdown error:', error);
        }
    }
}

module.exports = IntelligentRateLimiter;