// NexVestXR v2 Dual Token Platform - Performance Testing Suite
// Comprehensive performance validation for all system components

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const fs = require('fs');

class PerformanceTestSuite {
  constructor() {
    this.results = {
      api: {},
      websocket: {},
      blockchain: {},
      database: {},
      overall: {}
    };
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
    this.wsURL = process.env.WS_URL || 'ws://localhost:3000';
  }

  // Utility function to measure execution time
  async measureTime(fn, label) {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      const duration = end - start;
      
      console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
      return { success: true, duration, result };
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      console.log(`❌ ${label}: FAILED after ${duration.toFixed(2)}ms - ${error.message}`);
      return { success: false, duration, error: error.message };
    }
  }

  // Test API Response Times
  async testAPIPerformance() {
    console.log('\n🔧 API Performance Tests');
    console.log('========================');

    const endpoints = [
      { path: '/api/health', method: 'GET', name: 'Health Check' },
      { path: '/api/property/list', method: 'GET', name: 'Property List' },
      { path: '/api/analytics/platform-metrics', method: 'GET', name: 'Platform Analytics' },
      { path: '/api/dual-token/xera/stats', method: 'GET', name: 'XERA Token Stats' },
      { path: '/api/dual-token/propx/list', method: 'GET', name: 'PROPX Token List' }
    ];

    for (const endpoint of endpoints) {
      const result = await this.measureTime(async () => {
        const response = await axios({
          method: endpoint.method,
          url: `${this.baseURL}${endpoint.path}`,
          timeout: 5000
        });
        return response.data;
      }, `API ${endpoint.name}`);

      this.results.api[endpoint.name] = result;
    }

    // Test concurrent requests
    console.log('\n📊 Concurrent API Load Test');
    const concurrentRequests = 50;
    const healthCheckResults = await this.measureTime(async () => {
      const promises = Array(concurrentRequests).fill().map(() =>
        axios.get(`${this.baseURL}/api/health`, { timeout: 5000 })
      );
      return await Promise.all(promises);
    }, `${concurrentRequests} Concurrent Health Checks`);

    this.results.api['Concurrent Load'] = healthCheckResults;
  }

  // Test WebSocket Performance
  async testWebSocketPerformance() {
    console.log('\n🔌 WebSocket Performance Tests');
    console.log('==============================');

    return new Promise((resolve) => {
      const ws = new WebSocket(`${this.wsURL}/websocket`);
      const messageCount = 100;
      let receivedCount = 0;
      const latencies = [];
      const startTime = performance.now();

      ws.on('open', () => {
        console.log('WebSocket connected');
        
        // Subscribe to market data
        ws.send(JSON.stringify({
          action: 'subscribe',
          channel: 'market_data',
          symbol: 'XERA/AED'
        }));

        // Test message round-trip time
        for (let i = 0; i < messageCount; i++) {
          const messageStart = performance.now();
          ws.send(JSON.stringify({
            action: 'ping',
            timestamp: messageStart,
            id: i
          }));
        }
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.action === 'pong') {
            const latency = performance.now() - message.timestamp;
            latencies.push(latency);
            receivedCount++;

            if (receivedCount >= messageCount) {
              const totalTime = performance.now() - startTime;
              const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
              const maxLatency = Math.max(...latencies);
              const minLatency = Math.min(...latencies);

              console.log(`✅ WebSocket Performance Results:`);
              console.log(`   Total Messages: ${messageCount}`);
              console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
              console.log(`   Max Latency: ${maxLatency.toFixed(2)}ms`);
              console.log(`   Min Latency: ${minLatency.toFixed(2)}ms`);
              console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);

              this.results.websocket = {
                totalMessages: messageCount,
                averageLatency: avgLatency,
                maxLatency,
                minLatency,
                totalTime
              };

              ws.close();
              resolve();
            }
          }
        } catch (error) {
          console.log(`❌ WebSocket message error: ${error.message}`);
        }
      });

      ws.on('error', (error) => {
        console.log(`❌ WebSocket error: ${error.message}`);
        resolve();
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        console.log('⏰ WebSocket test timeout');
        ws.close();
        resolve();
      }, 30000);
    });
  }

  // Test Trading Engine Performance
  async testTradingPerformance() {
    console.log('\n📈 Trading Engine Performance Tests');
    console.log('====================================');

    // Test order processing speed
    const orderTypes = ['MARKET', 'LIMIT', 'STOP_LOSS'];
    
    for (const orderType of orderTypes) {
      const result = await this.measureTime(async () => {
        const response = await axios.post(`${this.baseURL}/api/trade/simulate`, {
          type: orderType,
          symbol: 'XERA/AED',
          amount: 1000,
          price: orderType === 'MARKET' ? null : 0.5
        }, { timeout: 5000 });
        return response.data;
      }, `${orderType} Order Simulation`);

      this.results.api[`${orderType}_Order`] = result;
    }

    // Test batch order processing
    const batchSize = 10;
    const batchResult = await this.measureTime(async () => {
      const orders = Array(batchSize).fill().map((_, i) => ({
        type: 'LIMIT',
        symbol: 'XERA/AED',
        amount: 100 + i,
        price: 0.5 + (i * 0.01)
      }));

      const response = await axios.post(`${this.baseURL}/api/trade/batch-simulate`, {
        orders
      }, { timeout: 10000 });
      return response.data;
    }, `Batch Processing (${batchSize} orders)`);

    this.results.api['Batch_Orders'] = batchResult;
  }

  // Test Smart Contract Interaction Performance
  async testBlockchainPerformance() {
    console.log('\n⛓️  Blockchain Performance Tests');
    console.log('=================================');

    // Test XERA token operations
    const xeraResult = await this.measureTime(async () => {
      const response = await axios.get(`${this.baseURL}/api/dual-token/xera/balance/0x1234567890123456789012345678901234567890`, {
        timeout: 10000
      });
      return response.data;
    }, 'XERA Balance Query');

    this.results.blockchain['XERA_Balance'] = xeraResult;

    // Test PROPX token operations
    const propxResult = await this.measureTime(async () => {
      const response = await axios.get(`${this.baseURL}/api/dual-token/propx/tokens`, {
        timeout: 10000
      });
      return response.data;
    }, 'PROPX Token List');

    this.results.blockchain['PROPX_List'] = propxResult;

    // Test cross-chain operations simulation
    const crossChainResult = await this.measureTime(async () => {
      const response = await axios.post(`${this.baseURL}/api/flare/simulate-cross-chain`, {
        fromChain: 'xrpl',
        toChain: 'flare',
        amount: 1000,
        token: 'XERA'
      }, { timeout: 15000 });
      return response.data;
    }, 'Cross-Chain Simulation');

    this.results.blockchain['Cross_Chain'] = crossChainResult;
  }

  // Test Database Performance
  async testDatabasePerformance() {
    console.log('\n🗄️  Database Performance Tests');
    console.log('==============================');

    // Test property search performance
    const searchResult = await this.measureTime(async () => {
      const response = await axios.get(`${this.baseURL}/api/property/search`, {
        params: {
          city: 'Abu Dhabi',
          type: 'villa',
          minPrice: 1000000,
          maxPrice: 5000000,
          limit: 50
        },
        timeout: 5000
      });
      return response.data;
    }, 'Property Search Query');

    this.results.database['Property_Search'] = searchResult;

    // Test analytics aggregation
    const analyticsResult = await this.measureTime(async () => {
      const response = await axios.get(`${this.baseURL}/api/analytics/investment-trends`, {
        params: {
          period: '30d',
          groupBy: 'city'
        },
        timeout: 10000
      });
      return response.data;
    }, 'Analytics Aggregation');

    this.results.database['Analytics_Aggregation'] = analyticsResult;

    // Test user portfolio query
    const portfolioResult = await this.measureTime(async () => {
      const response = await axios.get(`${this.baseURL}/api/portfolio/performance`, {
        params: {
          userId: 'test-user-id',
          period: '1y'
        },
        timeout: 5000
      });
      return response.data;
    }, 'Portfolio Performance Query');

    this.results.database['Portfolio_Query'] = portfolioResult;
  }

  // Test Memory and CPU Performance
  testSystemResources() {
    console.log('\n💻 System Resource Tests');
    console.log('========================');

    const memUsage = process.memoryUsage();
    console.log(`📊 Memory Usage:`);
    console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

    this.results.overall.memory = {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    };

    // Test CPU-intensive operation
    const cpuTestStart = performance.now();
    let iterations = 0;
    const maxTime = 1000; // 1 second

    while (performance.now() - cpuTestStart < maxTime) {
      Math.sqrt(Math.random() * 1000000);
      iterations++;
    }

    const actualTime = performance.now() - cpuTestStart;
    const operationsPerSecond = Math.round(iterations / (actualTime / 1000));

    console.log(`⚡ CPU Performance:`);
    console.log(`   Operations/Second: ${operationsPerSecond.toLocaleString()}`);
    console.log(`   Test Duration: ${actualTime.toFixed(2)}ms`);

    this.results.overall.cpu = {
      operationsPerSecond,
      testDuration: actualTime
    };
  }

  // Generate Performance Report
  generateReport() {
    console.log('\n📊 Performance Test Summary');
    console.log('============================');

    const reportData = {
      timestamp: new Date().toISOString(),
      platform: 'NexVestXR v2 Dual Token Platform',
      testResults: this.results,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageResponseTime: 0
      }
    };

    let totalDuration = 0;
    let testCount = 0;

    // Calculate summary statistics
    for (const category in this.results) {
      for (const test in this.results[category]) {
        const result = this.results[category][test];
        if (result && typeof result.duration === 'number') {
          totalDuration += result.duration;
          testCount++;
          reportData.summary.totalTests++;
          
          if (result.success) {
            reportData.summary.passedTests++;
          } else {
            reportData.summary.failedTests++;
          }
        }
      }
    }

    if (testCount > 0) {
      reportData.summary.averageResponseTime = totalDuration / testCount;
    }

    console.log(`✅ Total Tests: ${reportData.summary.totalTests}`);
    console.log(`✅ Passed: ${reportData.summary.passedTests}`);
    console.log(`❌ Failed: ${reportData.summary.failedTests}`);
    console.log(`⏱️  Average Response Time: ${reportData.summary.averageResponseTime.toFixed(2)}ms`);

    // Save report to file
    const reportFile = `performance-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Performance report saved: ${reportFile}`);

    // Performance recommendations
    console.log('\n💡 Performance Recommendations');
    console.log('===============================');

    if (reportData.summary.averageResponseTime > 1000) {
      console.log('⚠️  High average response time detected. Consider:');
      console.log('   - Database query optimization');
      console.log('   - Caching implementation');
      console.log('   - Load balancing');
    }

    if (reportData.summary.failedTests > 0) {
      console.log('❌ Some tests failed. Review:');
      console.log('   - Network connectivity');
      console.log('   - Service availability');
      console.log('   - Error handling');
    }

    const memUsageMB = this.results.overall.memory?.heapUsed / 1024 / 1024 || 0;
    if (memUsageMB > 500) {
      console.log('⚠️  High memory usage detected. Consider:');
      console.log('   - Memory leak investigation');
      console.log('   - Garbage collection optimization');
      console.log('   - Data structure efficiency');
    }

    return reportData;
  }

  // Run all performance tests
  async runAllTests() {
    console.log('🚀 NexVestXR v2 Performance Testing Suite');
    console.log('==========================================');
    console.log(`Base URL: ${this.baseURL}`);
    console.log(`WebSocket URL: ${this.wsURL}`);
    console.log(`Start Time: ${new Date().toISOString()}\n`);

    const overallStart = performance.now();

    try {
      // System resources baseline
      this.testSystemResources();

      // API performance tests
      await this.testAPIPerformance();

      // WebSocket performance tests
      await this.testWebSocketPerformance();

      // Trading engine performance
      await this.testTradingPerformance();

      // Blockchain performance
      await this.testBlockchainPerformance();

      // Database performance
      await this.testDatabasePerformance();

      const overallDuration = performance.now() - overallStart;
      this.results.overall.totalDuration = overallDuration;

      console.log(`\n⏱️  Total Test Duration: ${(overallDuration / 1000).toFixed(2)} seconds`);

      // Generate final report
      return this.generateReport();

    } catch (error) {
      console.error(`❌ Performance testing failed: ${error.message}`);
      return null;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new PerformanceTestSuite();
  
  testSuite.runAllTests()
    .then((report) => {
      if (report && report.summary.failedTests === 0) {
        console.log('\n🎉 All performance tests completed successfully!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some performance tests failed or had issues.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(`💥 Performance testing crashed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = PerformanceTestSuite;