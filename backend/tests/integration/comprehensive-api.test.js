const request = require('supertest');
const { app } = require('../../src/server');
const mongoose = require('mongoose');

// Test suite for comprehensive API endpoint testing
describe('NexVestXR API - Comprehensive Integration Tests', () => {
  let authToken;
  let userId;
  let propertyId;
  let adminToken;
  let testUser;

  // Test data
  const testUserData = {
    username: 'testuser',
    email: 'test@nexvestxr.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+971501234567',
    investorType: 'individual',
    kycLevel: 'basic',
    country: 'AE',
    nationality: 'AE'
  };

  const adminUserData = {
    username: 'admin',
    email: 'admin@nexvestxr.com',
    password: 'AdminPassword123!',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  };

  beforeAll(async () => {
    // Wait for the server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up connections
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  });

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================
  describe('Authentication API', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(testUserData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
        
        authToken = response.body.data.token;
        userId = response.body.data.user.id;
        testUser = response.body.data.user;
      });

      it('should reject registration with duplicate email', async () => {
        await request(app)
          .post('/api/auth/register')
          .send(testUserData)
          .expect(400);
      });

      it('should reject registration with invalid email format', async () => {
        const invalidData = { ...testUserData, email: 'invalid-email' };
        await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);
      });

      it('should reject registration with weak password', async () => {
        const weakPasswordData = { ...testUserData, email: 'weak@test.com', password: '123' };
        await request(app)
          .post('/api/auth/register')
          .send(weakPasswordData)
          .expect(400);
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUserData.email,
            password: testUserData.password
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
      });

      it('should reject login with invalid credentials', async () => {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUserData.email,
            password: 'wrongpassword'
          })
          .expect(401);
      });

      it('should reject login with non-existent email', async () => {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'password123'
          })
          .expect(401);
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('email', testUserData.email);
      });

      it('should reject request without token', async () => {
        await request(app)
          .get('/api/auth/profile')
          .expect(401);
      });

      it('should reject request with invalid token', async () => {
        await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('PUT /api/auth/profile', () => {
      it('should update user profile', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+971509876543'
        };

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.firstName).toBe(updateData.firstName);
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout user successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  // ============================================================================
  // DUAL TOKEN ENDPOINTS
  // ============================================================================
  describe('Dual Token API', () => {
    beforeEach(async () => {
      // Ensure we have a valid auth token
      if (!authToken) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUserData.email,
            password: testUserData.password
          });
        authToken = response.body.data.token;
      }
    });

    describe('POST /api/dual-token/classify-property', () => {
      it('should classify property as PROPX eligible', async () => {
        const propertyData = {
          totalValue: 60000000, // ₹6 Cr
          location: 'Mumbai',
          category: 'COMMERCIAL',
          developer: 'testDeveloper',
          compliance: { score: 85 },
          documents: { ipfsHash: 'QmTest123' }
        };

        const response = await request(app)
          .post('/api/dual-token/classify-property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('eligibleForPROPX');
        expect(response.body.data).toHaveProperty('tokenType');
        expect(response.body.data).toHaveProperty('reasons');
      });

      it('should classify property as XERA only', async () => {
        const propertyData = {
          totalValue: 30000000, // ₹3 Cr (below threshold)
          location: 'Mumbai',
          category: 'RESIDENTIAL',
          developer: 'testDeveloper',
          compliance: { score: 85 }
        };

        const response = await request(app)
          .post('/api/dual-token/classify-property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(200);

        expect(response.body.data.eligibleForPROPX).toBe(false);
        expect(response.body.data.tokenType).toBe('XERA');
      });
    });

    describe('GET /api/dual-token/portfolio/:userAddress', () => {
      it('should get user dual token portfolio', async () => {
        const userAddress = 'rMockUserAddress123';
        const response = await request(app)
          .get(`/api/dual-token/portfolio/${userAddress}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('xera');
        expect(response.body.data).toHaveProperty('propx');
        expect(response.body.data).toHaveProperty('combined');
      });
    });

    describe('GET /api/dual-token/analytics/platform', () => {
      it('should get platform analytics', async () => {
        const response = await request(app)
          .get('/api/dual-token/analytics/platform')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('crossChain');
        expect(response.body.data).toHaveProperty('xera');
        expect(response.body.data).toHaveProperty('propx');
      });
    });

    describe('POST /api/dual-token/xera/create-property', () => {
      it('should create XERA property', async () => {
        const propertyData = {
          name: 'Test XERA Property',
          location: 'Mumbai',
          valuation: 5000000,
          category: 'RESIDENTIAL',
          documents: { ipfsHash: 'QmXERATest123' },
          cityCode: 'MUM'
        };

        const response = await request(app)
          .post('/api/dual-token/xera/create-property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('tokenType', 'XERA');
        expect(response.body.data).toHaveProperty('propertyId');
      });
    });

    describe('GET /api/dual-token/propx/marketplace', () => {
      it('should get PROPX marketplace', async () => {
        const response = await request(app)
          .get('/api/dual-token/propx/marketplace')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('tokens');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(Array.isArray(response.body.data.tokens)).toBe(true);
      });

      it('should filter PROPX marketplace by city', async () => {
        const response = await request(app)
          .get('/api/dual-token/propx/marketplace?city=MUM&limit=5')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.tokens.length).toBeLessThanOrEqual(5);
      });
    });
  });

  // ============================================================================
  // PROPERTY MANAGEMENT ENDPOINTS
  // ============================================================================
  describe('Property Management API', () => {
    describe('POST /api/property', () => {
      it('should create a new property', async () => {
        const propertyData = {
          name: 'Test Property Integration',
          location: 'Dubai Marina',
          totalValue: 5000000,
          propertyType: 'apartment',
          expectedROI: 8.5,
          documents: {
            titleDeed: 'deed_hash_123',
            valuationReport: 'valuation_hash_456'
          }
        };

        const response = await request(app)
          .post('/api/property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('propertyId');
        expect(response.body.data.name).toBe(propertyData.name);
        
        propertyId = response.body.data.propertyId;
      });

      it('should reject property creation without authentication', async () => {
        const propertyData = {
          name: 'Unauthorized Property',
          location: 'Dubai',
          totalValue: 1000000
        };

        await request(app)
          .post('/api/property')
          .send(propertyData)
          .expect(401);
      });
    });

    describe('GET /api/property', () => {
      it('should get all properties', async () => {
        const response = await request(app)
          .get('/api/property')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter properties by location', async () => {
        const response = await request(app)
          .get('/api/property?location=Dubai')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });

    describe('GET /api/property/:id', () => {
      it('should get property by ID', async () => {
        if (propertyId) {
          const response = await request(app)
            .get(`/api/property/${propertyId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body).toHaveProperty('success', true);
          expect(response.body.data.propertyId).toBe(propertyId);
        }
      });

      it('should return 404 for non-existent property', async () => {
        await request(app)
          .get('/api/property/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });
  });

  // ============================================================================
  // PAYMENT ENDPOINTS
  // ============================================================================
  describe('Payment API', () => {
    describe('POST /api/payment/create-intent', () => {
      it('should create payment intent', async () => {
        const paymentData = {
          amount: 1000,
          currency: 'AED',
          propertyId: propertyId || 'test-property-id',
          paymentMethod: 'card'
        };

        const response = await request(app)
          .post('/api/payment/create-intent')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('clientSecret');
      });
    });

    describe('GET /api/payment/methods', () => {
      it('should get available payment methods', async () => {
        const response = await request(app)
          .get('/api/payment/methods')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/payment/history', () => {
      it('should get payment history for user', async () => {
        const response = await request(app)
          .get('/api/payment/history')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  // ============================================================================
  // PORTFOLIO ENDPOINTS
  // ============================================================================
  describe('Portfolio API', () => {
    describe('GET /api/portfolio', () => {
      it('should get user portfolio', async () => {
        const response = await request(app)
          .get('/api/portfolio')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('totalValue');
        expect(response.body.data).toHaveProperty('properties');
        expect(response.body.data).toHaveProperty('tokens');
      });
    });

    describe('GET /api/portfolio/analytics', () => {
      it('should get portfolio analytics', async () => {
        const response = await request(app)
          .get('/api/portfolio/analytics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('performance');
        expect(response.body.data).toHaveProperty('allocation');
      });
    });

    describe('GET /api/portfolio/performance', () => {
      it('should get portfolio performance data', async () => {
        const response = await request(app)
          .get('/api/portfolio/performance?period=1M')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('period');
        expect(response.body.data).toHaveProperty('data');
      });
    });
  });

  // ============================================================================
  // TRADING ENDPOINTS
  // ============================================================================
  describe('Trading API', () => {
    describe('GET /api/trade/markets', () => {
      it('should get available trading markets', async () => {
        const response = await request(app)
          .get('/api/trade/markets')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /api/trade/order', () => {
      it('should create a trading order', async () => {
        const orderData = {
          symbol: 'XERA/AED',
          side: 'buy',
          amount: 100,
          type: 'market'
        };

        const response = await request(app)
          .post('/api/trade/order')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('orderId');
      });
    });

    describe('GET /api/trade/orders', () => {
      it('should get user trade orders', async () => {
        const response = await request(app)
          .get('/api/trade/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  // ============================================================================
  // NOTIFICATIONS ENDPOINTS
  // ============================================================================
  describe('Notifications API', () => {
    describe('GET /api/notifications', () => {
      it('should get user notifications', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('PUT /api/notifications/:id/read', () => {
      it('should mark notification as read', async () => {
        const notificationId = 'test-notification-id';
        const response = await request(app)
          .put(`/api/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  // ============================================================================
  // HEALTH & STATUS ENDPOINTS
  // ============================================================================
  describe('Health & Status API', () => {
    describe('GET /api/health', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    describe('GET /api/status', () => {
      it('should return detailed system status', async () => {
        const response = await request(app)
          .get('/api/status')
          .expect(200);

        expect(response.body).toHaveProperty('database');
        expect(response.body).toHaveProperty('redis');
        expect(response.body).toHaveProperty('blockchain');
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });
  });
});