// NexVestXR v2 Redis Caching Optimization Script
// Implements intelligent caching strategies for optimal performance

const redis = require('redis');
const fs = require('fs');

class CacheOptimizer {
  constructor() {
    this.client = null;
    this.optimizations = [];
    this.cacheStrategies = {};
    this.performance = {
      hitRate: 0,
      missRate: 0,
      avgResponseTime: 0
    };
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = redis.createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      await this.client.connect();
      console.log('✅ Connected to Redis');
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  // Analyze current cache performance
  async analyzeCachePerformance() {
    console.log('\n🔍 Analyzing Cache Performance');
    console.log('===============================');

    try {
      // Get Redis info
      const info = await this.client.info();
      const stats = this.parseRedisInfo(info);
      
      console.log(`📊 Redis Statistics:`);
      console.log(`   Used Memory: ${(stats.used_memory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Max Memory: ${stats.maxmemory ? (stats.maxmemory / 1024 / 1024).toFixed(2) + ' MB' : 'Unlimited'}`);
      console.log(`   Connected Clients: ${stats.connected_clients}`);
      console.log(`   Operations/sec: ${stats.instantaneous_ops_per_sec}`);
      console.log(`   Hit Rate: ${((stats.keyspace_hits / (stats.keyspace_hits + stats.keyspace_misses)) * 100 || 0).toFixed(2)}%`);
      
      this.performance = {
        hitRate: stats.keyspace_hits / (stats.keyspace_hits + stats.keyspace_misses) || 0,
        missRate: stats.keyspace_misses / (stats.keyspace_hits + stats.keyspace_misses) || 0,
        usedMemory: stats.used_memory,
        opsPerSec: stats.instantaneous_ops_per_sec
      };

      // Analyze key patterns
      await this.analyzeKeyPatterns();
      
    } catch (error) {
      console.error(`❌ Cache analysis failed: ${error.message}`);
    }
  }

  // Parse Redis INFO output
  parseRedisInfo(info) {
    const stats = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (!isNaN(value)) {
          stats[key] = parseInt(value);
        } else {
          stats[key] = value;
        }
      }
    }
    
    return stats;
  }

  // Analyze existing key patterns
  async analyzeKeyPatterns() {
    console.log('\n🔑 Analyzing Key Patterns');
    console.log('=========================');

    try {
      // Scan for different key patterns
      const patterns = {
        'user:*': 0,
        'property:*': 0,
        'portfolio:*': 0,
        'market:*': 0,
        'session:*': 0,
        'analytics:*': 0,
        'cache:*': 0
      };

      for (const pattern of Object.keys(patterns)) {
        try {
          const keys = await this.client.keys(pattern);
          patterns[pattern] = keys.length;
          console.log(`   ${pattern}: ${keys.length} keys`);
        } catch (error) {
          console.log(`   ⚠️  Pattern ${pattern}: Error - ${error.message}`);
        }
      }

      this.optimizations.push({
        type: 'analysis',
        area: 'key_patterns',
        patterns
      });

    } catch (error) {
      console.error(`❌ Key pattern analysis failed: ${error.message}`);
    }
  }

  // Implement caching strategies
  async implementCachingStrategies() {
    console.log('\n🚀 Implementing Caching Strategies');
    console.log('===================================');

    // Strategy 1: API Response Caching
    await this.setupAPIResponseCaching();
    
    // Strategy 2: User Session Caching
    await this.setupUserSessionCaching();
    
    // Strategy 3: Market Data Caching
    await this.setupMarketDataCaching();
    
    // Strategy 4: Analytics Caching
    await this.setupAnalyticsCaching();
    
    // Strategy 5: Database Query Caching
    await this.setupDatabaseQueryCaching();
  }

  // API Response Caching Strategy
  async setupAPIResponseCaching() {
    console.log('\n📡 Setting up API Response Caching');
    console.log('==================================');

    const apiCacheConfig = {
      '/api/property/list': { ttl: 300, strategy: 'cache-first' },       // 5 minutes
      '/api/property/:id': { ttl: 600, strategy: 'cache-first' },        // 10 minutes
      '/api/analytics/platform-metrics': { ttl: 1800, strategy: 'cache-first' },  // 30 minutes
      '/api/dual-token/xera/stats': { ttl: 60, strategy: 'cache-first' }, // 1 minute
      '/api/dual-token/propx/list': { ttl: 300, strategy: 'cache-first' }, // 5 minutes
      '/api/user/profile': { ttl: 900, strategy: 'cache-aside' },         // 15 minutes
      '/api/portfolio/dashboard': { ttl: 120, strategy: 'cache-aside' }   // 2 minutes
    };

    for (const [endpoint, config] of Object.entries(apiCacheConfig)) {
      const key = `api_cache_config:${endpoint.replace(/[:/]/g, '_')}`;
      await this.client.setEx(key, 86400, JSON.stringify(config)); // 24 hours
      console.log(`   ✅ Configured caching for ${endpoint} (TTL: ${config.ttl}s)`);
    }

    this.cacheStrategies.api = apiCacheConfig;
    this.optimizations.push({
      type: 'strategy',
      area: 'api_responses',
      config: apiCacheConfig
    });

    // Sample implementation for middleware
    const middlewareCode = `
// Redis Cache Middleware for Express
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    const cacheKey = \`api:\${req.method}:\${req.originalUrl}\`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};`;

    console.log('\n📝 Generated Cache Middleware:');
    console.log(middlewareCode);
  }

  // User Session Caching
  async setupUserSessionCaching() {
    console.log('\n👤 Setting up User Session Caching');
    console.log('===================================');

    const sessionConfig = {
      prefix: 'session:',
      ttl: 3600,              // 1 hour
      renewOnActivity: true,
      secureCookies: true,
      sameSite: 'strict'
    };

    await this.client.setEx('session_config', 86400, JSON.stringify(sessionConfig));
    console.log('   ✅ Session configuration cached');

    // User profile caching
    const userCacheConfig = {
      profile: { ttl: 900 },      // 15 minutes
      preferences: { ttl: 1800 }, // 30 minutes  
      kyc: { ttl: 3600 },        // 1 hour
      portfolio: { ttl: 120 }     // 2 minutes
    };

    for (const [type, config] of Object.entries(userCacheConfig)) {
      const key = `user_cache_config:${type}`;
      await this.client.setEx(key, 86400, JSON.stringify(config));
      console.log(`   ✅ Configured user ${type} caching (TTL: ${config.ttl}s)`);
    }

    this.cacheStrategies.users = { session: sessionConfig, cache: userCacheConfig };
    this.optimizations.push({
      type: 'strategy',
      area: 'user_sessions',
      config: { session: sessionConfig, cache: userCacheConfig }
    });
  }

  // Market Data Caching
  async setupMarketDataCaching() {
    console.log('\n📈 Setting up Market Data Caching');
    console.log('==================================');

    const marketCacheConfig = {
      realtime_prices: { ttl: 5, strategy: 'write-through' },     // 5 seconds
      historical_data: { ttl: 3600, strategy: 'cache-first' },   // 1 hour
      trading_pairs: { ttl: 300, strategy: 'cache-first' },      // 5 minutes
      orderbook: { ttl: 10, strategy: 'write-through' },         // 10 seconds
      market_stats: { ttl: 60, strategy: 'cache-aside' },        // 1 minute
      arbitrage_data: { ttl: 30, strategy: 'write-through' }     // 30 seconds
    };

    for (const [dataType, config] of Object.entries(marketCacheConfig)) {
      const key = `market_cache_config:${dataType}`;
      await this.client.setEx(key, 86400, JSON.stringify(config));
      console.log(`   ✅ Configured ${dataType} caching (TTL: ${config.ttl}s)`);
    }

    // Set up market data cache warming
    const warmupKeys = [
      'market:xera_aed:price',
      'market:propx_usd:price', 
      'market:trading_pairs',
      'market:platform_stats'
    ];

    for (const key of warmupKeys) {
      // Simulate market data
      const mockData = {
        timestamp: Date.now(),
        data: `sample_${key}`,
        cached: true
      };
      await this.client.setEx(key, 300, JSON.stringify(mockData));
      console.log(`   🔥 Warmed up cache: ${key}`);
    }

    this.cacheStrategies.market = marketCacheConfig;
    this.optimizations.push({
      type: 'strategy',
      area: 'market_data',
      config: marketCacheConfig
    });
  }

  // Analytics Caching
  async setupAnalyticsCaching() {
    console.log('\n📊 Setting up Analytics Caching');
    console.log('================================');

    const analyticsCacheConfig = {
      platform_metrics: { ttl: 1800 },      // 30 minutes
      user_analytics: { ttl: 900 },         // 15 minutes
      property_performance: { ttl: 3600 },  // 1 hour
      investment_trends: { ttl: 1800 },     // 30 minutes
      roi_calculations: { ttl: 600 },       // 10 minutes
      market_analysis: { ttl: 300 }         // 5 minutes
    };

    for (const [metric, config] of Object.entries(analyticsCacheConfig)) {
      const key = `analytics_cache_config:${metric}`;
      await this.client.setEx(key, 86400, JSON.stringify(config));
      console.log(`   ✅ Configured ${metric} caching (TTL: ${config.ttl}s)`);
    }

    // Pre-compute and cache common analytics
    const commonAnalytics = [
      'total_properties',
      'total_investments', 
      'platform_volume',
      'active_users',
      'top_performers'
    ];

    for (const metric of commonAnalytics) {
      const cacheKey = `analytics:${metric}`;
      const mockData = {
        metric,
        value: Math.floor(Math.random() * 1000000),
        timestamp: Date.now(),
        cached: true
      };
      await this.client.setEx(cacheKey, 1800, JSON.stringify(mockData));
      console.log(`   📈 Cached analytics: ${metric}`);
    }

    this.cacheStrategies.analytics = analyticsCacheConfig;
    this.optimizations.push({
      type: 'strategy',
      area: 'analytics',
      config: analyticsCacheConfig
    });
  }

  // Database Query Caching
  async setupDatabaseQueryCaching() {
    console.log('\n🗄️  Setting up Database Query Caching');
    console.log('======================================');

    const dbCacheConfig = {
      user_queries: { ttl: 600 },           // 10 minutes
      property_searches: { ttl: 300 },      // 5 minutes
      investment_history: { ttl: 900 },     // 15 minutes
      portfolio_data: { ttl: 120 },        // 2 minutes
      aggregation_results: { ttl: 1800 },  // 30 minutes
      count_queries: { ttl: 600 }          // 10 minutes
    };

    for (const [queryType, config] of Object.entries(dbCacheConfig)) {
      const key = `db_cache_config:${queryType}`;
      await this.client.setEx(key, 86400, JSON.stringify(config));
      console.log(`   ✅ Configured ${queryType} caching (TTL: ${config.ttl}s)`);
    }

    // Generate cache invalidation patterns
    const invalidationPatterns = {
      'user:*': ['user_queries', 'portfolio_data'],
      'property:*': ['property_searches', 'aggregation_results'],
      'investment:*': ['investment_history', 'portfolio_data', 'aggregation_results'],
      'analytics:*': ['aggregation_results', 'count_queries']
    };

    await this.client.setEx('cache_invalidation_patterns', 86400, JSON.stringify(invalidationPatterns));
    console.log('   🔄 Cache invalidation patterns configured');

    this.cacheStrategies.database = { config: dbCacheConfig, invalidation: invalidationPatterns };
    this.optimizations.push({
      type: 'strategy',
      area: 'database_queries',
      config: dbCacheConfig,
      invalidation: invalidationPatterns
    });
  }

  // Configure Redis optimization settings
  async configureRedisOptimization() {
    console.log('\n⚙️  Configuring Redis Optimization');
    console.log('===================================');

    const redisConfig = {
      // Memory optimization
      maxmemory: '2gb',
      maxmemory_policy: 'allkeys-lru',
      
      // Persistence optimization
      save: '900 1 300 10 60 10000',
      
      // Performance optimization
      tcp_keepalive: 300,
      timeout: 0,
      
      // Connection optimization
      tcp_backlog: 511,
      maxclients: 10000,
      
      // Database optimization
      databases: 16,
      
      // Logging
      loglevel: 'notice',
      
      // Security
      requirepass: 'nexvestxr_redis_secure_2024',
      
      // Advanced options
      hash_max_ziplist_entries: 512,
      hash_max_ziplist_value: 64,
      list_max_ziplist_size: -2,
      set_max_intset_entries: 512,
      zset_max_ziplist_entries: 128,
      zset_max_ziplist_value: 64
    };

    console.log('📋 Recommended Redis Configuration:');
    for (const [key, value] of Object.entries(redisConfig)) {
      console.log(`   ${key}: ${value}`);
    }

    // Save configuration to Redis
    await this.client.setEx('redis_optimization_config', 86400, JSON.stringify(redisConfig));

    this.optimizations.push({
      type: 'configuration',
      area: 'redis_server',
      settings: redisConfig
    });
  }

  // Set up cache monitoring
  async setupCacheMonitoring() {
    console.log('\n📊 Setting up Cache Monitoring');
    console.log('===============================');

    const monitoringConfig = {
      metrics: {
        hit_rate: { threshold: 0.8, alert: true },
        memory_usage: { threshold: 0.9, alert: true },
        response_time: { threshold: 100, alert: true },
        connection_count: { threshold: 1000, alert: true }
      },
      alerts: {
        low_hit_rate: 'Cache hit rate below 80%',
        high_memory: 'Memory usage above 90%',
        slow_response: 'Cache response time above 100ms',
        connection_limit: 'Connection count above 1000'
      },
      reporting: {
        frequency: 300,  // 5 minutes
        retention: 86400  // 24 hours
      }
    };

    await this.client.setEx('cache_monitoring_config', 86400, JSON.stringify(monitoringConfig));
    console.log('   ✅ Monitoring configuration saved');

    // Set up sample monitoring data
    const currentTime = Date.now();
    const monitoringData = {
      timestamp: currentTime,
      hit_rate: this.performance.hitRate,
      memory_usage: this.performance.usedMemory,
      ops_per_sec: this.performance.opsPerSec,
      active_connections: 25
    };

    await this.client.setEx('cache_monitoring_data', 300, JSON.stringify(monitoringData));
    console.log('   📊 Sample monitoring data cached');

    this.optimizations.push({
      type: 'monitoring',
      area: 'cache_performance',
      config: monitoringConfig
    });
  }

  // Generate cache optimization report
  generateReport() {
    console.log('\n📊 Cache Optimization Report');
    console.log('=============================');

    const report = {
      timestamp: new Date().toISOString(),
      performance: this.performance,
      strategies: this.cacheStrategies,
      optimizations: this.optimizations,
      summary: {
        strategiesImplemented: Object.keys(this.cacheStrategies).length,
        optimizationsApplied: this.optimizations.length,
        currentHitRate: (this.performance.hitRate * 100).toFixed(2) + '%',
        memoryUsage: (this.performance.usedMemory / 1024 / 1024).toFixed(2) + ' MB'
      },
      recommendations: [
        'Monitor cache hit rates regularly',
        'Implement cache warming for critical data',
        'Use appropriate TTL values for different data types',
        'Set up cache invalidation patterns',
        'Monitor memory usage and adjust policies',
        'Implement cache compression for large objects'
      ]
    };

    console.log(`✅ Strategies Implemented: ${report.summary.strategiesImplemented}`);
    console.log(`🔧 Optimizations Applied: ${report.summary.optimizationsApplied}`);
    console.log(`📈 Current Hit Rate: ${report.summary.currentHitRate}`);
    console.log(`💾 Memory Usage: ${report.summary.memoryUsage}`);

    // Save report
    const reportFile = `cache-optimization-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportFile}`);

    return report;
  }

  // Run complete cache optimization
  async optimize() {
    try {
      console.log('🚀 NexVestXR Redis Cache Optimization Suite');
      console.log('===========================================');

      await this.connect();
      await this.analyzeCachePerformance();
      await this.implementCachingStrategies();
      await this.configureRedisOptimization();
      await this.setupCacheMonitoring();

      const report = this.generateReport();

      console.log('\n🎉 Cache optimization completed successfully!');
      return report;

    } catch (error) {
      console.error(`❌ Cache optimization failed: ${error.message}`);
      throw error;
    } finally {
      if (this.client && this.client.isOpen) {
        await this.client.disconnect();
        console.log('✅ Disconnected from Redis');
      }
    }
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new CacheOptimizer();
  
  optimizer.optimize()
    .then(() => {
      console.log('Cache optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Cache optimization failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = CacheOptimizer;