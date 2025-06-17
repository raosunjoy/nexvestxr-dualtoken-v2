const autocannon = require('autocannon');
const { describe, it, before, after } = require('@jest/globals');
const express = require('express');
const mongoose = require('mongoose');
const UserFactory = require('../factories/userFactory');
const PropertyFactory = require('../factories/propertyFactory');

describe('UAE Platform Load Tests', () => {
  let server;
  let baseURL;
  let authTokens = [];
  let propertyIds = [];

  before(async () => {
    // Setup test server
    const app = express();
    app.use(express.json());
    
    // Add middleware for performance testing
    app.use((req, res, next) => {
      req.startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        if (duration > 2000) { // Log slow requests
          console.log(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
      });
      next();
    });

    // Add routes
    app.use('/api/uae', require('../../backend/src/routes/uaeRoutes'));
    app.use('/api/auth', require('../../backend/src/routes/authRoutes'));

    // Start server
    server = app.listen(0); // Use random available port
    const port = server.address().port;
    baseURL = `http://localhost:${port}`;

    // Setup test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL);
    }

    // Create test data
    await setupTestData();
    
    console.log(`🚀 Performance test server running on ${baseURL}`);
  });

  after(async () => {
    // Cleanup
    if (server) {
      server.close();
    }
    await cleanupTestData();
  });

  async function setupTestData() {
    console.log('📊 Setting up performance test data...');
    
    // Create test users
    const users = await UserFactory.createMultiple(50, 'approved');
    const properties = PropertyFactory.createMultiple(100, 'basic');
    
    // Insert into database
    const UAEUser = require('../../backend/src/models/UAEUser');
    const UAEProperty = require('../../backend/src/models/UAEProperty');
    
    await UAEUser.insertMany(users);
    await UAEProperty.insertMany(properties);
    
    // Generate auth tokens (mock)
    authTokens = users.slice(0, 10).map(user => `Bearer mock-token-${user.id}`);
    propertyIds = properties.slice(0, 20).map(prop => prop.id);
    
    console.log(`✅ Created ${users.length} users and ${properties.length} properties`);
  }

  async function cleanupTestData() {
    const UAEUser = require('../../backend/src/models/UAEUser');
    const UAEProperty = require('../../backend/src/models/UAEProperty');
    
    await UAEUser.deleteMany({});
    await UAEProperty.deleteMany({});
  }

  describe('API Endpoint Performance', () => {
    it('should handle high load on property listing endpoint', async () => {
      console.log('🔥 Load testing property listing endpoint...');
      
      const result = await autocannon({
        url: `${baseURL}/api/uae/properties`,
        connections: 50,
        duration: 30, // 30 seconds
        headers: {
          'Content-Type': 'application/json'
        },
        requests: [
          {
            method: 'GET',
            path: '/api/uae/properties?limit=10'
          },
          {
            method: 'GET',
            path: '/api/uae/properties?city=Dubai&limit=10'
          },
          {
            method: 'GET',
            path: '/api/uae/properties?zone=Downtown Dubai&limit=10'
          },
          {
            method: 'GET',
            path: '/api/uae/properties?currency=USD&limit=10'
          }
        ]
      });

      console.log('📈 Property Listing Performance Results:');
      console.log(`  Requests/sec: ${result.requests.average}`);
      console.log(`  Latency p99: ${result.latency.p99}ms`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Timeouts: ${result.timeouts}`);
      
      // Performance assertions
      expect(result.requests.average).toBeGreaterThan(100); // At least 100 req/sec
      expect(result.latency.p99).toBeLessThan(2000); // 99th percentile under 2s
      expect(result.errors).toBe(0); // No errors
    });

    it('should handle high load on property details endpoint', async () => {
      console.log('🔍 Load testing property details endpoint...');
      
      const paths = propertyIds.slice(0, 5).map(id => `/api/uae/properties/${id}`);
      
      const result = await autocannon({
        url: baseURL,
        connections: 30,
        duration: 20,
        requests: paths.map(path => ({
          method: 'GET',
          path
        }))
      });

      console.log('📈 Property Details Performance Results:');
      console.log(`  Requests/sec: ${result.requests.average}`);
      console.log(`  Latency p95: ${result.latency.p95}ms`);
      console.log(`  Errors: ${result.errors}`);
      
      expect(result.requests.average).toBeGreaterThan(80);
      expect(result.latency.p95).toBeLessThan(1500);
      expect(result.errors).toBe(0);
    });

    it('should handle concurrent investment requests', async () => {
      console.log('💰 Load testing investment endpoint...');
      
      const result = await autocannon({
        url: baseURL,
        connections: 20,
        duration: 15,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authTokens[0] // Use first auth token
        },
        body: JSON.stringify({
          propertyId: propertyIds[0],
          amount: 50000,
          currency: 'AED'
        }),
        requests: [
          {
            method: 'POST',
            path: '/api/uae/invest'
          }
        ]
      });

      console.log('📈 Investment Performance Results:');
      console.log(`  Requests/sec: ${result.requests.average}`);
      console.log(`  Latency p95: ${result.latency.p95}ms`);
      console.log(`  Success rate: ${((result.requests.total - result.errors) / result.requests.total * 100).toFixed(2)}%`);
      
      // Lower expectations for write operations
      expect(result.requests.average).toBeGreaterThan(10);
      expect(result.latency.p95).toBeLessThan(3000);
    });

    it('should handle currency conversion load', async () => {
      console.log('💱 Load testing currency conversion endpoint...');
      
      const conversions = [
        { amount: 1000, fromCurrency: 'USD', toCurrency: 'AED' },
        { amount: 1000, fromCurrency: 'EUR', toCurrency: 'AED' },
        { amount: 1000, fromCurrency: 'AED', toCurrency: 'USD' },
        { amount: 1000, fromCurrency: 'SAR', toCurrency: 'AED' }
      ];

      const result = await autocannon({
        url: baseURL,
        connections: 40,
        duration: 20,
        headers: {
          'Content-Type': 'application/json'
        },
        requests: conversions.map(conv => ({
          method: 'POST',
          path: '/api/uae/convert',
          body: JSON.stringify(conv)
        }))
      });

      console.log('📈 Currency Conversion Performance Results:');
      console.log(`  Requests/sec: ${result.requests.average}`);
      console.log(`  Latency p90: ${result.latency.p90}ms`);
      
      expect(result.requests.average).toBeGreaterThan(150);
      expect(result.latency.p90).toBeLessThan(1000);
      expect(result.errors).toBe(0);
    });
  });

  describe('Database Performance', () => {
    it('should perform efficient property queries', async () => {
      console.log('🗄️ Testing database query performance...');
      
      const UAEProperty = require('../../backend/src/models/UAEProperty');
      const queries = [];
      
      // Test various query patterns
      const startTime = Date.now();
      
      // Basic find
      queries.push(UAEProperty.find({ status: 'active' }).limit(10));
      
      // Filtered find
      queries.push(UAEProperty.find({ 
        'location.city': 'Dubai',
        'valuation.aed': { $gte: 1000000, $lte: 5000000 }
      }).limit(10));
      
      // Aggregation
      queries.push(UAEProperty.aggregate([
        { $match: { status: 'active' } },
        { $group: {
          _id: '$location.city',
          averagePrice: { $avg: '$valuation.aed' },
          count: { $sum: 1 }
        }}
      ]));
      
      // Text search
      queries.push(UAEProperty.find({
        $text: { $search: 'Dubai Marina apartment' }
      }).limit(5));
      
      await Promise.all(queries);
      
      const queryTime = Date.now() - startTime;
      console.log(`📊 Database queries completed in ${queryTime}ms`);
      
      expect(queryTime).toBeLessThan(2000); // All queries under 2 seconds
    });

    it('should handle concurrent database operations', async () => {
      console.log('⚡ Testing concurrent database operations...');
      
      const UAEUser = require('../../backend/src/models/UAEUser');
      const UAEProperty = require('../../backend/src/models/UAEProperty');
      
      const startTime = Date.now();
      
      // Simulate concurrent operations
      const operations = [
        // Read operations
        ...Array.from({ length: 10 }, () => 
          UAEProperty.find({ status: 'active' }).limit(5)
        ),
        ...Array.from({ length: 10 }, () => 
          UAEUser.find({ 'flags.kycCompleted': true }).limit(5)
        ),
        
        // Write operations
        ...Array.from({ length: 5 }, (_, i) => 
          UAEUser.findOneAndUpdate(
            { email: `test${i}@example.ae` },
            { $set: { lastActiveAt: new Date() } }
          )
        )
      ];
      
      await Promise.allSettled(operations);
      
      const operationTime = Date.now() - startTime;
      console.log(`📊 Concurrent operations completed in ${operationTime}ms`);
      
      expect(operationTime).toBeLessThan(5000); // Under 5 seconds for all operations
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during sustained load', async () => {
      console.log('🧠 Testing memory usage during sustained load...');
      
      const initialMemory = process.memoryUsage();
      console.log(`Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      
      // Run sustained load for 1 minute
      const result = await autocannon({
        url: `${baseURL}/api/uae/properties`,
        connections: 25,
        duration: 60, // 1 minute
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      
      console.log(`Final memory usage: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Memory increase: ${Math.round(memoryIncrease)}MB`);
      console.log(`Requests handled: ${result.requests.total}`);
      
      // Memory increase should be reasonable (under 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100);
      expect(result.errors).toBe(0);
    });

    it('should handle resource cleanup properly', async () => {
      console.log('🧹 Testing resource cleanup...');
      
      // Monitor file descriptors and database connections
      const initialConnections = mongoose.connection.readyState;
      
      // Create multiple concurrent requests that create/close resources
      const promises = Array.from({ length: 20 }, async () => {
        try {
          const response = await fetch(`${baseURL}/api/uae/properties?limit=1`);
          await response.json();
        } catch (error) {
          console.error('Request failed:', error.message);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Allow some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalConnections = mongoose.connection.readyState;
      
      expect(finalConnections).toBe(initialConnections); // Connection state unchanged
    });
  });

  describe('Response Time Distribution', () => {
    it('should have consistent response times under normal load', async () => {
      console.log('⏱️ Analyzing response time distribution...');
      
      const result = await autocannon({
        url: `${baseURL}/api/uae/properties`,
        connections: 10,
        duration: 30,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Response Time Distribution:');
      console.log(`  Mean: ${result.latency.mean}ms`);
      console.log(`  p50: ${result.latency.p50}ms`);
      console.log(`  p75: ${result.latency.p75}ms`);
      console.log(`  p90: ${result.latency.p90}ms`);
      console.log(`  p95: ${result.latency.p95}ms`);
      console.log(`  p99: ${result.latency.p99}ms`);
      
      // Response time consistency checks
      expect(result.latency.mean).toBeLessThan(500); // Mean under 500ms
      expect(result.latency.p95).toBeLessThan(1000); // 95th percentile under 1s
      expect(result.latency.p99).toBeLessThan(2000); // 99th percentile under 2s
      
      // Consistency check: p95 shouldn't be too much higher than mean
      const variabilityRatio = result.latency.p95 / result.latency.mean;
      expect(variabilityRatio).toBeLessThan(5); // p95 should be less than 5x the mean
    });
  });

  describe('Stress Testing', () => {
    it('should gracefully handle overload conditions', async () => {
      console.log('🔥 Stress testing with high connection count...');
      
      const result = await autocannon({
        url: `${baseURL}/api/uae/properties`,
        connections: 200, // High connection count
        duration: 20,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📈 Stress Test Results:');
      console.log(`  Requests/sec: ${result.requests.average}`);
      console.log(`  Total requests: ${result.requests.total}`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Timeouts: ${result.timeouts}`);
      console.log(`  Error rate: ${(result.errors / result.requests.total * 100).toFixed(2)}%`);
      
      // Under stress, we expect some degradation but not complete failure
      expect(result.requests.average).toBeGreaterThan(20); // At least 20 req/sec under stress
      const errorRate = result.errors / result.requests.total;
      expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
    });

    it('should recover after stress conditions', async () => {
      console.log('🔄 Testing recovery after stress...');
      
      // First, apply stress
      await autocannon({
        url: `${baseURL}/api/uae/properties`,
        connections: 150,
        duration: 10
      });
      
      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test normal performance
      const recoveryResult = await autocannon({
        url: `${baseURL}/api/uae/properties`,
        connections: 10,
        duration: 10
      });
      
      console.log('📊 Recovery Test Results:');
      console.log(`  Requests/sec: ${recoveryResult.requests.average}`);
      console.log(`  Latency p95: ${recoveryResult.latency.p95}ms`);
      console.log(`  Errors: ${recoveryResult.errors}`);
      
      // Should recover to normal performance levels
      expect(recoveryResult.requests.average).toBeGreaterThan(80);
      expect(recoveryResult.latency.p95).toBeLessThan(1500);
      expect(recoveryResult.errors).toBe(0);
    });
  });
});