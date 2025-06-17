const request = require('supertest');
const app = require('../../src/server');
const TradingService = require('../../src/services/TradingService');
const mongoose = require('mongoose');
const Redis = require('ioredis');

jest.setTimeout(30000);

describe('Trading API Integration Tests', () => {
  let authToken;
  let testUserAddress = 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH';
  
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST);
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'testpassword' });
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/trading/orders/limit', () => {
    it('should create a limit order successfully', async () => {
      const orderData = {
        pairId: 'REXA/XRP',
        side: 'buy',
        amount: 100,
        price: 0.001234,
        options: { postOnly: false, timeInForce: 'GTC' }
      };
      const response = await request(app)
        .post('/api/trading/orders/limit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.pairId).toBe('REXA/XRP');
      expect(response.body.data.order.side).toBe('buy');
      expect(response.body.data.order.amount).toBe(100);
      expect(response.body.data.order.price).toBe(0.001234);
    });

    it('should handle network failure gracefully', async () => {
      jest.spyOn(TradingService, 'matchOrder').mockImplementation(() => {
        throw new Error('Network timeout');
      });
      const orderData = {
        pairId: 'REXA/XRP',
        side: 'buy',
        amount: 100,
        price: 0.001234,
        options: { postOnly: false, timeInForce: 'GTC' }
      };
      const response = await request(app)
        .post('/api/trading/orders/limit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should reject invalid order parameters', async () => {
      const invalidOrderData = {
        pairId: 'INVALID/PAIR',
        side: 'invalid_side',
        amount: -100,
        price: 0
      };
      const response = await request(app)
        .post('/api/trading/orders/limit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOrderData)
        .expect(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Smart Contract Revert Scenarios', () => {
    it('should handle XRPL transaction revert', async () => {
      jest.spyOn(TradingService, 'matchOrder').mockImplementation(() => {
        throw new Error('XRPL transaction reverted: Insufficient balance');
      });
      const orderData = {
        pairId: 'REXA/XRP',
        side: 'buy',
        amount: 1000000, // Large amount to trigger revert
        price: 0.001234,
        options: { postOnly: false, timeInForce: 'GTC' }
      };
      const response = await request(app)
        .post('/api/trading/orders/limit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(400);
      expect(response.body.error).toContain('Insufficient balance');
    });

    it('should handle Flare contract revert', async () => {
      jest.spyOn(TradingService, 'matchOrder').mockImplementation(() => {
        throw new Error('Flare contract reverted: KYC not verified');
      });
      const orderData = {
        pairId: 'REXA/XRP',
        side: 'buy',
        amount: 100,
        price: 0.001234,
        options: { postOnly: false, timeInForce: 'GTC' }
      };
      const response = await request(app)
        .post('/api/trading/orders/limit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(400);
      expect(response.body.error).toContain('KYC not verified');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Redis outage', async () => {
      jest.spyOn(Redis.prototype, 'get').mockImplementation(() => {
        throw new Error('Redis connection lost');
      });
      const response = await request(app)
        .get('/api/trading/orderbook/REXA%2FXRP')
        .query({ depth: 10 })
        .expect(200); // Fallback to MongoDB
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should reject order during maintenance', async () => {
      jest.spyOn(TradingService, 'validateOrderParams').mockImplementation(() => {
        throw new Error('System under maintenance');
      });
      const orderData = {
        pairId: 'REXA/XRP',
        side: 'buy',
        amount: 100,
        price: 0.001234,
        options: { postOnly: false, timeInForce: 'GTC' }
      };
      const response = await request(app)
        .post('/api/trading/orders/limit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(503);
      expect(response.body.error).toContain('System under maintenance');
    });
  });

  // Existing tests (GET /api/trading/orderbook, etc.) remain unchanged
});

describe('TradingService Unit Tests', () => {
  // Existing tests remain unchanged
});