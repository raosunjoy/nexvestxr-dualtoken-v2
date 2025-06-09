const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Property = require('../../src/models/Property');

describe('NexVestXR API Integration Tests', () => {
  let authToken;
  let userId;
  let propertyId;

  beforeAll(async () => {
    // Setup test database connection if needed
    // await setupTestDB();
  });

  afterAll(async () => {
    // Cleanup test database if needed
    // await cleanupTestDB();
  });

  beforeEach(async () => {
    // Clear test data
    // await User.deleteMany({});
    // await Property.deleteMany({});
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'test@nexvestxr.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          phone: '+919876543210',
          investorType: 'individual',
          kycLevel: 'basic'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe(userData.email);

        authToken = response.body.data.token;
        userId = response.body.data.user.id;
      });

      it('should reject registration with invalid email', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject registration with weak password', async () => {
        const userData = {
          email: 'test@nexvestxr.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/auth/login', () => {
      beforeEach(async () => {
        // Register a user first
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'login@nexvestxr.com',
            password: 'TestPassword123!',
            firstName: 'Login',
            lastName: 'User'
          });
      });

      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'login@nexvestxr.com',
            password: 'TestPassword123!'
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
      });

      it('should reject login with invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'login@nexvestxr.com',
            password: 'WrongPassword'
          })
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Property Management Endpoints', () => {
    beforeEach(async () => {
      // Register and login a user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'property@nexvestxr.com',
          password: 'TestPassword123!',
          firstName: 'Property',
          lastName: 'Manager',
          role: 'developer'
        });

      authToken = registerResponse.body.data.token;
    });

    describe('POST /api/property/create', () => {
      it('should create a new property listing', async () => {
        const propertyData = {
          title: 'Test Property',
          description: 'A beautiful test property in Mumbai',
          location: {
            address: '123 Test Street, Mumbai',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            pincode: '400001',
            coordinates: {
              latitude: 19.0760,
              longitude: 72.8777
            }
          },
          propertyType: 'residential',
          investment: {
            totalValue: 10000000, // ₹1 Cr
            minInvestment: 100000, // ₹1 L
            expectedROI: 12,
            loanToValue: 70
          },
          developer: {
            name: 'Test Developer',
            experience: 15,
            completedProjects: 25
          },
          amenities: ['parking', 'security', 'gym'],
          images: ['image1.jpg', 'image2.jpg'],
          documents: ['document1.pdf', 'document2.pdf']
        };

        const response = await request(app)
          .post('/api/property/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('property');
        expect(response.body.data.property.title).toBe(propertyData.title);

        propertyId = response.body.data.property.id;
      });

      it('should reject property creation without authentication', async () => {
        const propertyData = {
          title: 'Unauthorized Property',
          description: 'Should not be created'
        };

        const response = await request(app)
          .post('/api/property/create')
          .send(propertyData)
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should validate required property fields', async () => {
        const propertyData = {
          title: 'Incomplete Property'
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/property/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/property/list', () => {
      beforeEach(async () => {
        // Create some test properties
        await request(app)
          .post('/api/property/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Mumbai Property 1',
            description: 'Test property 1',
            location: { city: 'Mumbai' },
            propertyType: 'residential',
            investment: { totalValue: 5000000, expectedROI: 10 }
          });

        await request(app)
          .post('/api/property/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Bangalore Property 1',
            description: 'Test property 2',
            location: { city: 'Bangalore' },
            propertyType: 'commercial',
            investment: { totalValue: 8000000, expectedROI: 12 }
          });
      });

      it('should return list of properties', async () => {
        const response = await request(app)
          .get('/api/property/list')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('properties');
        expect(Array.isArray(response.body.data.properties)).toBe(true);
        expect(response.body.data.properties.length).toBeGreaterThan(0);
      });

      it('should filter properties by city', async () => {
        const response = await request(app)
          .get('/api/property/list?city=Mumbai')
          .expect(200);

        expect(response.body.data.properties).toHaveLength(1);
        expect(response.body.data.properties[0].location.city).toBe('Mumbai');
      });

      it('should filter properties by type', async () => {
        const response = await request(app)
          .get('/api/property/list?propertyType=commercial')
          .expect(200);

        expect(response.body.data.properties).toHaveLength(1);
        expect(response.body.data.properties[0].propertyType).toBe('commercial');
      });

      it('should sort properties by ROI', async () => {
        const response = await request(app)
          .get('/api/property/list?sortBy=roi&sortOrder=desc')
          .expect(200);

        const properties = response.body.data.properties;
        expect(properties[0].investment.expectedROI).toBeGreaterThanOrEqual(
          properties[1].investment.expectedROI
        );
      });
    });

    describe('GET /api/property/:id', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/property/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Detailed Property',
            description: 'Property for detail testing',
            location: { city: 'Mumbai' },
            investment: { totalValue: 10000000, expectedROI: 15 }
          });

        propertyId = createResponse.body.data.property.id;
      });

      it('should return property details', async () => {
        const response = await request(app)
          .get(`/api/property/${propertyId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('property');
        expect(response.body.data.property.id).toBe(propertyId);
      });

      it('should return 404 for non-existent property', async () => {
        const response = await request(app)
          .get('/api/property/nonexistent-id')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  describe('Portfolio Management Endpoints', () => {
    beforeEach(async () => {
      // Setup user with authentication
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'portfolio@nexvestxr.com',
          password: 'TestPassword123!',
          firstName: 'Portfolio',
          lastName: 'User'
        });

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
    });

    describe('GET /api/portfolio/dashboard', () => {
      it('should return user portfolio dashboard', async () => {
        const response = await request(app)
          .get('/api/portfolio/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('portfolio');
        expect(response.body.data.portfolio).toHaveProperty('totalValue');
        expect(response.body.data.portfolio).toHaveProperty('totalROI');
        expect(response.body.data.portfolio).toHaveProperty('investments');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/portfolio/dashboard')
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('POST /api/portfolio/invest', () => {
      beforeEach(async () => {
        // Create a property to invest in
        const propertyResponse = await request(app)
          .post('/api/property/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Investment Property',
            description: 'Property for investment testing',
            location: { city: 'Mumbai' },
            investment: { totalValue: 10000000, minInvestment: 100000, expectedROI: 12 }
          });

        propertyId = propertyResponse.body.data.property.id;
      });

      it('should create investment successfully', async () => {
        const investmentData = {
          propertyId: propertyId,
          amount: 500000, // ₹5L
          paymentMethod: 'upi'
        };

        const response = await request(app)
          .post('/api/portfolio/invest')
          .set('Authorization', `Bearer ${authToken}`)
          .send(investmentData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('investment');
        expect(response.body.data.investment.amount).toBe(investmentData.amount);
      });

      it('should validate minimum investment amount', async () => {
        const investmentData = {
          propertyId: propertyId,
          amount: 50000, // Below minimum
          paymentMethod: 'upi'
        };

        const response = await request(app)
          .post('/api/portfolio/invest')
          .set('Authorization', `Bearer ${authToken}`)
          .send(investmentData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Payment Integration Endpoints', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'payment@nexvestxr.com',
          password: 'TestPassword123!',
          firstName: 'Payment',
          lastName: 'User'
        });

      authToken = registerResponse.body.data.token;
    });

    describe('POST /api/payment/create-order', () => {
      it('should create payment order', async () => {
        const orderData = {
          amount: 100000, // ₹1L
          currency: 'INR',
          propertyId: 'test-property-id',
          paymentMethod: 'razorpay'
        };

        const response = await request(app)
          .post('/api/payment/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('orderId');
        expect(response.body.data).toHaveProperty('amount');
        expect(response.body.data).toHaveProperty('currency');
      });

      it('should validate payment amount', async () => {
        const orderData = {
          amount: 0,
          currency: 'INR',
          propertyId: 'test-property-id'
        };

        const response = await request(app)
          .post('/api/payment/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('POST /api/payment/verify', () => {
      it('should verify payment signature', async () => {
        const verificationData = {
          orderId: 'order_test123',
          paymentId: 'pay_test123',
          signature: 'test_signature',
          amount: 100000
        };

        const response = await request(app)
          .post('/api/payment/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send(verificationData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('verified');
      });
    });
  });

  describe('Blockchain Integration Endpoints', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'blockchain@nexvestxr.com',
          password: 'TestPassword123!',
          firstName: 'Blockchain',
          lastName: 'User'
        });

      authToken = registerResponse.body.data.token;
    });

    describe('POST /api/xumm/create-payment', () => {
      it('should create XUMM payment request', async () => {
        const paymentData = {
          amount: '1000',
          currency: 'XRP',
          destination: 'rXUMMBankAddress',
          memo: 'NexVestXR Investment'
        };

        const response = await request(app)
          .post('/api/xumm/create-payment')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('uuid');
        expect(response.body.data).toHaveProperty('qrCode');
        expect(response.body.data).toHaveProperty('paymentUrl');
      });
    });

    describe('GET /api/xumm/status/:uuid', () => {
      it('should return payment status', async () => {
        const response = await request(app)
          .get('/api/xumm/status/test-uuid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('status');
      });
    });

    describe('POST /api/flare/deploy-token', () => {
      it('should deploy PROPX token on Flare', async () => {
        const tokenData = {
          propertyId: 'test-property-id',
          tokenName: 'Test Property Token',
          tokenSymbol: 'TPT',
          totalSupply: '1000000',
          pricePerToken: '100'
        };

        const response = await request(app)
          .post('/api/flare/deploy-token')
          .set('Authorization', `Bearer ${authToken}`)
          .send(tokenData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('contractAddress');
        expect(response.body.data).toHaveProperty('transactionHash');
      });
    });
  });

  describe('User Management Endpoints', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@nexvestxr.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        });

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
    });

    describe('GET /api/user/profile', () => {
      it('should return user profile', async () => {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toHaveProperty('email');
        expect(response.body.data.user).toHaveProperty('firstName');
      });
    });

    describe('PUT /api/user/profile', () => {
      it('should update user profile', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+919876543210'
        };

        const response = await request(app)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.user.firstName).toBe(updateData.firstName);
      });
    });

    describe('POST /api/user/kyc/upload', () => {
      it('should handle KYC document upload', async () => {
        const response = await request(app)
          .post('/api/user/kyc/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .field('documentType', 'aadhar')
          .attach('document', Buffer.from('fake file content'), 'aadhar.pdf')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('documentId');
      });
    });
  });

  describe('Analytics and Reporting Endpoints', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'analytics@nexvestxr.com',
          password: 'TestPassword123!',
          firstName: 'Analytics',
          lastName: 'User'
        });

      authToken = registerResponse.body.data.token;
    });

    describe('GET /api/analytics/platform-metrics', () => {
      it('should return platform analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/platform-metrics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('totalInvestments');
        expect(response.body.data).toHaveProperty('totalProperties');
        expect(response.body.data).toHaveProperty('averageROI');
        expect(response.body.data).toHaveProperty('userGrowth');
      });
    });

    describe('GET /api/analytics/user-metrics', () => {
      it('should return user-specific analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/user-metrics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('portfolioValue');
        expect(response.body.data).toHaveProperty('totalReturns');
        expect(response.body.data).toHaveProperty('investmentHistory');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(101).fill().map(() => 
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);
      
      // Depending on rate limiting configuration, some requests should be limited
      // This test might need adjustment based on actual rate limiting implementation
    });
  });

  describe('Health and Status Endpoints', () => {
    describe('GET /api/health', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('status', 'healthy');
        expect(response.body.data).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('version');
      });
    });

    describe('GET /api/status', () => {
      it('should return detailed system status', async () => {
        const response = await request(app)
          .get('/api/status')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('database');
        expect(response.body.data).toHaveProperty('blockchain');
        expect(response.body.data).toHaveProperty('services');
      });
    });
  });
});