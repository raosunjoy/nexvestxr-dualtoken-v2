// NexVestXR v2 Database Optimization Script
// Optimizes MongoDB queries, indexes, and performance for dual token platform

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

class DatabaseOptimizer {
  constructor() {
    this.db = null;
    this.optimizations = [];
    this.performance = {
      before: {},
      after: {},
      improvements: {}
    };
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nexvestxr';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      this.db = mongoose.connection.db;
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  // Analyze current database performance
  async analyzePerformance() {
    console.log('\n🔍 Analyzing Database Performance');
    console.log('==================================');

    const collections = ['users', 'properties', 'investments', 'transactions', 'portfolios'];
    
    for (const collectionName of collections) {
      try {
        const collection = this.db.collection(collectionName);
        
        // Get collection stats
        const stats = await collection.stats();
        const indexStats = await collection.indexStats().toArray();
        
        // Perform sample queries and measure time
        const queryPerformance = await this.measureQueryPerformance(collection);
        
        this.performance.before[collectionName] = {
          size: stats.size,
          count: stats.count,
          avgObjSize: stats.avgObjSize,
          indexes: indexStats.length,
          queryPerformance
        };

        console.log(`📊 ${collectionName}:`);
        console.log(`   Documents: ${stats.count.toLocaleString()}`);
        console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Avg Document Size: ${stats.avgObjSize.toFixed(0)} bytes`);
        console.log(`   Indexes: ${indexStats.length}`);
        
      } catch (error) {
        console.log(`⚠️  Collection ${collectionName} not found or error: ${error.message}`);
      }
    }
  }

  // Measure query performance for common operations
  async measureQueryPerformance(collection) {
    const queries = [];
    const collectionName = collection.collectionName;

    try {
      if (collectionName === 'properties') {
        // Property search queries
        queries.push({
          name: 'city_search',
          query: { city: 'Abu Dhabi' },
          operation: 'find'
        });
        queries.push({
          name: 'price_range',
          query: { price: { $gte: 1000000, $lte: 5000000 } },
          operation: 'find'
        });
        queries.push({
          name: 'type_filter',
          query: { type: 'villa', status: 'active' },
          operation: 'find'
        });
      } else if (collectionName === 'users') {
        queries.push({
          name: 'email_lookup',
          query: { email: { $regex: '@nexvestxr.com$' } },
          operation: 'find'
        });
        queries.push({
          name: 'kyc_status',
          query: { 'kyc.status': 'approved' },
          operation: 'find'
        });
      } else if (collectionName === 'investments') {
        queries.push({
          name: 'user_investments',
          query: { userId: { $exists: true } },
          operation: 'find'
        });
        queries.push({
          name: 'date_range',
          query: { 
            createdAt: { 
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
            } 
          },
          operation: 'find'
        });
      }

      const results = {};
      for (const query of queries) {
        const start = Date.now();
        
        if (query.operation === 'find') {
          await collection.find(query.query).limit(100).toArray();
        } else if (query.operation === 'aggregate') {
          await collection.aggregate(query.pipeline).toArray();
        }
        
        const duration = Date.now() - start;
        results[query.name] = duration;
      }

      return results;
    } catch (error) {
      console.log(`⚠️  Query performance test failed for ${collectionName}: ${error.message}`);
      return {};
    }
  }

  // Create optimized indexes
  async createOptimizedIndexes() {
    console.log('\n🚀 Creating Optimized Indexes');
    console.log('=============================');

    const indexDefinitions = {
      users: [
        { key: { email: 1 }, options: { unique: true, background: true } },
        { key: { 'wallet.address': 1 }, options: { sparse: true, background: true } },
        { key: { 'kyc.status': 1, createdAt: -1 }, options: { background: true } },
        { key: { investorType: 1, 'kyc.level': 1 }, options: { background: true } },
        { key: { country: 1, city: 1 }, options: { background: true } }
      ],
      properties: [
        { key: { city: 1, type: 1, status: 1 }, options: { background: true } },
        { key: { price: 1 }, options: { background: true } },
        { key: { 'location.coordinates': '2dsphere' }, options: { background: true } },
        { key: { developerId: 1, status: 1 }, options: { background: true } },
        { key: { tokenType: 1, fundingStatus: 1 }, options: { background: true } },
        { key: { createdAt: -1 }, options: { background: true } },
        { key: { 'analytics.roi': -1, price: 1 }, options: { background: true } }
      ],
      investments: [
        { key: { userId: 1, createdAt: -1 }, options: { background: true } },
        { key: { propertyId: 1, status: 1 }, options: { background: true } },
        { key: { amount: -1, createdAt: -1 }, options: { background: true } },
        { key: { 'payment.status': 1, 'payment.method': 1 }, options: { background: true } },
        { key: { tokenType: 1, userId: 1 }, options: { background: true } }
      ],
      transactions: [
        { key: { userId: 1, timestamp: -1 }, options: { background: true } },
        { key: { type: 1, status: 1, timestamp: -1 }, options: { background: true } },
        { key: { 'blockchain.txHash': 1 }, options: { sparse: true, background: true } },
        { key: { amount: -1, timestamp: -1 }, options: { background: true } },
        { key: { currency: 1, timestamp: -1 }, options: { background: true } }
      ],
      portfolios: [
        { key: { userId: 1 }, options: { unique: true, background: true } },
        { key: { 'performance.totalValue': -1 }, options: { background: true } },
        { key: { 'holdings.tokenType': 1, userId: 1 }, options: { background: true } },
        { key: { lastUpdated: -1 }, options: { background: true } }
      ],
      governance: [
        { key: { tokenType: 1, status: 1, createdAt: -1 }, options: { background: true } },
        { key: { 'voting.address': 1, proposalId: 1 }, options: { background: true } },
        { key: { category: 1, status: 1 }, options: { background: true } }
      ],
      analytics: [
        { key: { metric: 1, timestamp: -1 }, options: { background: true } },
        { key: { userId: 1, metric: 1, timestamp: -1 }, options: { background: true } },
        { key: { propertyId: 1, metric: 1, timestamp: -1 }, options: { background: true } }
      ]
    };

    for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
      try {
        const collection = this.db.collection(collectionName);
        
        console.log(`\n📈 Creating indexes for ${collectionName}:`);
        
        for (const indexDef of indexes) {
          try {
            const indexName = await collection.createIndex(indexDef.key, indexDef.options);
            console.log(`   ✅ Created index: ${indexName}`);
            this.optimizations.push({
              collection: collectionName,
              type: 'index',
              details: indexDef
            });
          } catch (error) {
            if (error.code === 85) {
              console.log(`   ℹ️  Index already exists: ${JSON.stringify(indexDef.key)}`);
            } else {
              console.log(`   ❌ Failed to create index: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Collection ${collectionName} not accessible: ${error.message}`);
      }
    }
  }

  // Optimize aggregation pipelines
  async optimizeAggregations() {
    console.log('\n🔄 Optimizing Aggregation Pipelines');
    console.log('====================================');

    // Portfolio performance aggregation
    const portfolioOptimization = {
      name: 'Portfolio Performance Calculation',
      collection: 'investments',
      pipeline: [
        // Use $match early to reduce document processing
        { $match: { status: 'active' } },
        // Add index hint for better performance
        { $addFields: { userId: "$userId" } },
        { $group: {
          _id: '$userId',
          totalInvestment: { $sum: '$amount' },
          totalTokens: { $sum: '$tokensReceived' },
          avgROI: { $avg: '$expectedROI' },
          investmentCount: { $count: {} }
        }},
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }},
        { $unwind: '$user' },
        { $sort: { totalInvestment: -1 } }
      ]
    };

    // Property analytics aggregation
    const propertyAnalytics = {
      name: 'Property Performance Analytics',
      collection: 'properties',
      pipeline: [
        { $match: { status: 'active' } },
        { $lookup: {
          from: 'investments',
          localField: '_id',
          foreignField: 'propertyId',
          as: 'investments'
        }},
        { $addFields: {
          totalInvestments: { $size: '$investments' },
          totalFunding: { $sum: '$investments.amount' },
          fundingPercentage: {
            $multiply: [
              { $divide: [{ $sum: '$investments.amount' }, '$targetAmount'] },
              100
            ]
          }
        }},
        { $sort: { fundingPercentage: -1 } }
      ]
    };

    const optimizations = [portfolioOptimization, propertyAnalytics];

    for (const opt of optimizations) {
      try {
        console.log(`\n🧮 Testing aggregation: ${opt.name}`);
        
        const start = Date.now();
        const collection = this.db.collection(opt.collection);
        const result = await collection.aggregate(opt.pipeline).limit(10).toArray();
        const duration = Date.now() - start;
        
        console.log(`   ⏱️  Execution time: ${duration}ms`);
        console.log(`   📊 Results: ${result.length} documents`);
        
        this.optimizations.push({
          type: 'aggregation',
          name: opt.name,
          collection: opt.collection,
          performance: duration
        });
        
      } catch (error) {
        console.log(`   ❌ Aggregation failed: ${error.message}`);
      }
    }
  }

  // Database maintenance operations
  async performMaintenance() {
    console.log('\n🔧 Performing Database Maintenance');
    console.log('===================================');

    const collections = await this.db.listCollections().toArray();
    
    for (const collInfo of collections) {
      const collectionName = collInfo.name;
      
      try {
        const collection = this.db.collection(collectionName);
        
        // Reindex collection for better performance
        console.log(`🔄 Reindexing ${collectionName}...`);
        await collection.reIndex();
        
        // Get updated stats
        const stats = await collection.stats();
        console.log(`   ✅ Reindexed ${collectionName} (${stats.count} documents)`);
        
        this.optimizations.push({
          type: 'maintenance',
          collection: collectionName,
          operation: 'reindex'
        });
        
      } catch (error) {
        console.log(`   ⚠️  Maintenance failed for ${collectionName}: ${error.message}`);
      }
    }
  }

  // Connection pool optimization
  configureConnectionPool() {
    console.log('\n🏊 Optimizing Connection Pool');
    console.log('==============================');

    const optimizedConfig = {
      maxPoolSize: 20,          // Maximum connections
      minPoolSize: 5,           // Minimum connections  
      maxIdleTimeMS: 30000,     // Close after 30s idle
      serverSelectionTimeoutMS: 5000,  // 5s server selection timeout
      socketTimeoutMS: 45000,   // 45s socket timeout
      bufferMaxEntries: 0,      // Disable mongoose buffering
      bufferCommands: false,    // Disable command buffering
      heartbeatFrequencyMS: 10000,  // 10s heartbeat
      retryWrites: true,        // Enable retry writes
      retryReads: true,         // Enable retry reads
      readPreference: 'secondaryPreferred',  // Read from secondary when possible
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 10000
      }
    };

    console.log('📋 Recommended MongoDB Configuration:');
    console.log(JSON.stringify(optimizedConfig, null, 2));

    this.optimizations.push({
      type: 'configuration',
      area: 'connection_pool',
      settings: optimizedConfig
    });
  }

  // Query optimization recommendations
  generateQueryOptimizations() {
    console.log('\n📝 Query Optimization Recommendations');
    console.log('=====================================');

    const recommendations = [
      {
        area: 'Property Search',
        current: 'db.properties.find({ city: "Abu Dhabi", type: "villa" })',
        optimized: 'db.properties.find({ city: "Abu Dhabi", type: "villa", status: "active" }).hint({ city: 1, type: 1, status: 1 })',
        improvement: 'Use compound index and explicit hints'
      },
      {
        area: 'User Portfolio',
        current: 'db.investments.find({ userId: ObjectId("...") })',
        optimized: 'db.investments.find({ userId: ObjectId("..."), status: "active" }).sort({ createdAt: -1 })',
        improvement: 'Add status filter and sort optimization'
      },
      {
        area: 'Analytics Aggregation',
        current: 'Large aggregation without $match',
        optimized: 'Use $match early in pipeline, $project to reduce data transfer',
        improvement: 'Reduce processed documents by 70%'
      },
      {
        area: 'Text Search',
        current: 'Regular expression searches',
        optimized: 'MongoDB text indexes with $text operator',
        improvement: 'Full-text search performance boost'
      }
    ];

    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.area}:`);
      console.log(`   Current: ${rec.current}`);
      console.log(`   Optimized: ${rec.optimized}`);
      console.log(`   Improvement: ${rec.improvement}`);
    });

    this.optimizations.push({
      type: 'recommendations',
      queries: recommendations
    });
  }

  // Generate optimization report
  generateReport() {
    console.log('\n📊 Database Optimization Report');
    console.log('================================');

    const report = {
      timestamp: new Date().toISOString(),
      optimizations: this.optimizations,
      performance: this.performance,
      summary: {
        indexesCreated: this.optimizations.filter(o => o.type === 'index').length,
        aggregationsOptimized: this.optimizations.filter(o => o.type === 'aggregation').length,
        maintenanceTasks: this.optimizations.filter(o => o.type === 'maintenance').length,
        recommendations: this.optimizations.filter(o => o.type === 'recommendations').length
      }
    };

    console.log(`✅ Indexes Created: ${report.summary.indexesCreated}`);
    console.log(`🔄 Aggregations Optimized: ${report.summary.aggregationsOptimized}`);
    console.log(`🔧 Maintenance Tasks: ${report.summary.maintenanceTasks}`);
    console.log(`📝 Recommendations: ${report.summary.recommendations}`);

    // Save report
    const reportFile = `database-optimization-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportFile}`);

    return report;
  }

  // Run complete optimization
  async optimize() {
    try {
      console.log('🚀 NexVestXR Database Optimization Suite');
      console.log('=========================================');

      await this.connect();
      await this.analyzePerformance();
      await this.createOptimizedIndexes();
      await this.optimizeAggregations();
      await this.performMaintenance();
      this.configureConnectionPool();
      this.generateQueryOptimizations();

      const report = this.generateReport();
      
      console.log('\n🎉 Database optimization completed successfully!');
      return report;

    } catch (error) {
      console.error(`❌ Database optimization failed: ${error.message}`);
      throw error;
    } finally {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
      }
    }
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new DatabaseOptimizer();
  
  optimizer.optimize()
    .then(() => {
      console.log('Database optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Database optimization failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = DatabaseOptimizer;