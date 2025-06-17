const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Redis = require('redis');

let mongoServer;
let redisClient;

// Database setup for tests
beforeAll(async () => {
  console.log('🗄️ Setting up test databases...');
  
  // MongoDB in-memory server setup
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'nexvestxr_uae_test'
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to MongoDB
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Redis setup (use fake Redis for tests)
  if (process.env.MOCK_REDIS === 'true') {
    redisClient = require('redis-mock').createClient();
  } else {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL
    });
    await redisClient.connect();
  }
  
  console.log('✅ Test databases connected');
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  // Clear Redis
  if (redisClient && redisClient.flushdb) {
    await redisClient.flushdb();
  }
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test databases...');
  
  // Close MongoDB connection
  await mongoose.connection.close();
  
  // Stop MongoDB memory server
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  // Close Redis connection
  if (redisClient && redisClient.quit) {
    await redisClient.quit();
  }
  
  console.log('✅ Test databases cleaned up');
});

// Export for use in tests
global.testDb = {
  mongoose,
  redisClient
};

module.exports = {
  mongoServer,
  redisClient
};