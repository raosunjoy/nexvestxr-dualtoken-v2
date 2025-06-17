const mongoose = require('mongoose');
const Redis = require('ioredis');
const CircuitBreaker = require('opossum');

class DatabaseManager {
  constructor() {
    this.mongoose = mongoose;
    this.redisClient = null;
    this.isConnected = false;
    this.circuitBreaker = new CircuitBreaker(
      async (key) => await this.redisClient.get(key),
      {
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      }
    );
  }

  async connect() {
    try {
      const mongoOptions = {
        maxPoolSize: 100,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        bufferMaxEntries: 0,
        retryWrites: true,
        w: 'majority',
        readPreference: 'secondaryPreferred',
        readConcern: { level: 'majority' },
      };
      await mongoose.connect(process.env.MONGO_URI, mongoOptions);
      mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });
      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        this.isConnected = true;
      });
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        db: 0,
      };
      if (process.env.REDIS_CLUSTER === 'true') {
        this.redisClient = new Redis.Cluster([
          { host: process.env.REDIS_HOST_1, port: process.env.REDIS_PORT_1 },
          { host: process.env.REDIS_HOST_2, port: process.env.REDIS_PORT_2 },
          { host: process.env.REDIS_HOST_3, port: process.env.REDIS_PORT_3 },
        ], { redisOptions, scaleReads: 'slave' });
      } else {
        this.redisClient = new Redis(redisOptions);
      }
      await this.redisClient.connect();
      this.redisClient.on('error', (err) => console.error('Redis connection error:', err));
      this.redisClient.on('connect', () => console.log('Redis connected'));
      this.isConnected = true;
      console.log('Database connections established');
    } catch (error) {
      console.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  async cacheGet(key, fallbackQuery) {
    try {
      const data = await this.circuitBreaker.fire(key);
      return data ? JSON.parse(data) : await this.executeFallback(fallbackQuery);
    } catch (error) {
      console.error('Cache get error:', error);
      return await this.executeFallback(fallbackQuery);
    }
  }

  async executeFallback(query) {
    if (!query) return null;
    try {
      const result = await query();
      return result;
    } catch (error) {
      console.error('Fallback query failed:', error);
      return null;
    }
  }

  async cacheSet(key, data, ttl = 300) {
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async cacheDel(key) {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async disconnect() {
    await mongoose.connection.close();
    await this.redisClient.disconnect();
    this.isConnected = false;
  }

  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      await this.redisClient.ping();
      return { mongodb: 'healthy', redis: 'healthy' };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { mongodb: 'unhealthy', redis: 'unhealthy' };
    }
  }
}

module.exports = new DatabaseManager();