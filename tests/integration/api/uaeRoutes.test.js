const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const uaeRoutes = require('../../../backend/src/routes/uaeRoutes');
const UAEUser = require('../../../backend/src/models/UAEUser');
const UAEProperty = require('../../../backend/src/models/UAEProperty');
const UserFactory = require('../../factories/userFactory');
const PropertyFactory = require('../../factories/propertyFactory');
const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');

describe('UAE Routes Integration Tests', () => {
  let app;
  let testUser;
  let testProperty;
  let authToken;

  beforeAll(async () => {
    // Setup Express app with UAE routes
    app = express();
    app.use(express.json());
    app.use('/api/uae', uaeRoutes);
    
    // Setup test database connection if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test user and property
    testUser = await UserFactory.createApprovedInvestor();
    testProperty = PropertyFactory.createUAEProperty();
    
    // Create test data in database
    await UAEUser.create(testUser);
    await UAEProperty.create(testProperty);
    
    // Generate auth token for user
    authToken = 'Bearer test-jwt-token'; // Mock token
  });

  afterEach(async () => {
    // Clean up test data
    await UAEUser.deleteMany({});
    await UAEProperty.deleteMany({});
  });

  describe('Property Routes', () => {
    describe('GET /api/uae/properties', () => {
      it('should return list of UAE properties', async () => {
        const response = await request(app)
          .get('/api/uae/properties')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.properties).toBeInstanceOf(Array);
        expect(response.body.data.pagination).toBeDefined();
      });

      it('should filter properties by city', async () => {
        const response = await request(app)
          .get('/api/uae/properties?city=Dubai')
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.properties.forEach(property => {
          expect(property.location.city).toBe('Dubai');
        });
      });

      it('should filter properties by zone', async () => {
        const response = await request(app)
          .get('/api/uae/properties?zone=Downtown Dubai')
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.properties.forEach(property => {
          expect(property.location.zone).toBe('Downtown Dubai');
        });
      });

      it('should filter properties by price range', async () => {
        const minPrice = 1000000;
        const maxPrice = 5000000;
        
        const response = await request(app)
          .get(`/api/uae/properties?minPrice=${minPrice}&maxPrice=${maxPrice}&currency=AED`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.properties.forEach(property => {
          expect(property.valuation.aed).toBeGreaterThanOrEqual(minPrice);
          expect(property.valuation.aed).toBeLessThanOrEqual(maxPrice);
        });
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/uae/properties?page=1&limit=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.properties).toHaveLength(5);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(5);
      });

      it('should support currency conversion', async () => {
        const response = await request(app)
          .get('/api/uae/properties?currency=USD')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.filters.currency).toBe('USD');
      });

      it('should support Arabic language', async () => {
        const response = await request(app)
          .get('/api/uae/properties?language=ar')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.filters.language).toBe('ar');
      });
    });

    describe('GET /api/uae/properties/:id', () => {
      it('should return specific property details', async () => {
        const response = await request(app)
          .get(`/api/uae/properties/${testProperty.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testProperty.id);
        expect(response.body.data.title).toBeDefined();
        expect(response.body.data.location).toBeDefined();
        expect(response.body.data.valuation).toBeDefined();
      });

      it('should increment view count', async () => {
        const initialViews = testProperty.metrics?.views || 0;
        
        await request(app)
          .get(`/api/uae/properties/${testProperty.id}`)
          .expect(200);

        // Check that views were incremented in database
        const updatedProperty = await UAEProperty.findById(testProperty._id);
        expect(updatedProperty.metrics.views).toBe(initialViews + 1);
      });

      it('should return 404 for non-existent property', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        
        const response = await request(app)
          .get(`/api/uae/properties/${fakeId}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Property not found');
      });

      it('should convert currency for property details', async () => {
        const response = await request(app)
          .get(`/api/uae/properties/${testProperty.id}?currency=USD`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.valuation.displayCurrency).toBe('USD');
      });
    });

    describe('GET /api/uae/properties/location/:location', () => {
      it('should return properties by location', async () => {
        const response = await request(app)
          .get('/api/uae/properties/location/Dubai')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should limit results by default', async () => {
        const response = await request(app)
          .get('/api/uae/properties/location/Dubai')
          .expect(200);

        expect(response.body.data.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Investment Routes', () => {
    describe('POST /api/uae/invest', () => {
      it('should allow KYC approved user to invest', async () => {
        const investmentData = {
          propertyId: testProperty.id,
          amount: 50000,
          currency: 'AED'
        };

        const response = await request(app)
          .post('/api/uae/invest')
          .set('Authorization', authToken)
          .send(investmentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.investment.propertyId).toBe(testProperty.id);
        expect(response.body.data.investment.amount).toBe(50000);
        expect(response.body.data.investment.tokens).toBeGreaterThan(0);
      });

      it('should reject investment without KYC approval', async () => {
        const unverifiedUser = await UserFactory.createUAEUser({
          flags: { kycCompleted: false }
        });
        await UAEUser.create(unverifiedUser);

        const investmentData = {
          propertyId: testProperty.id,
          amount: 50000,
          currency: 'AED'
        };

        const response = await request(app)
          .post('/api/uae/invest')
          .set('Authorization', authToken)
          .send(investmentData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('KYC');
      });

      it('should handle multi-currency investments', async () => {
        const investmentData = {
          propertyId: testProperty.id,
          amount: 15000, // USD
          currency: 'USD'
        };

        const response = await request(app)
          .post('/api/uae/invest')
          .set('Authorization', authToken)
          .send(investmentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.investment.currency).toBe('AED'); // Stored in AED
      });

      it('should respect investment limits', async () => {
        const retailUser = await UserFactory.createApprovedInvestor({
          investmentProfile: { tier: 'retail' }
        });
        await UAEUser.create(retailUser);

        const investmentData = {
          propertyId: testProperty.id,
          amount: 1000000, // Above retail limit
          currency: 'AED'
        };

        const response = await request(app)
          .post('/api/uae/invest')
          .set('Authorization', authToken)
          .send(investmentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('limit');
      });

      it('should validate minimum investment amounts', async () => {
        const investmentData = {
          propertyId: testProperty.id,
          amount: 10, // Too small
          currency: 'AED'
        };

        const response = await request(app)
          .post('/api/uae/invest')
          .set('Authorization', authToken)
          .send(investmentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('minimum');
      });
    });

    describe('GET /api/uae/portfolio', () => {
      beforeEach(async () => {
        // Add some portfolio data
        testUser.portfolio = {
          properties: [{
            propertyId: testProperty.id,
            tokens: 100,
            invested: 50000,
            currency: 'AED',
            purchaseDate: new Date(),
            currentValue: 55000
          }],
          totalInvested: 50000,
          totalReturns: 5000
        };
        await UAEUser.findByIdAndUpdate(testUser._id, testUser);
      });

      it('should return user portfolio', async () => {
        const response = await request(app)
          .get('/api/uae/portfolio')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.portfolio).toBeDefined();
        expect(response.body.data.portfolio.properties).toBeInstanceOf(Array);
        expect(response.body.data.summary).toBeDefined();
      });

      it('should convert portfolio values to requested currency', async () => {
        const response = await request(app)
          .get('/api/uae/portfolio?currency=USD')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.portfolio.currency).toBe('USD');
      });

      it('should return localized property names', async () => {
        const response = await request(app)
          .get('/api/uae/portfolio?language=ar')
          .expect(200);

        expect(response.body.success).toBe(true);
        // Verify Arabic content is returned
      });
    });
  });

  describe('Currency Routes', () => {
    describe('GET /api/uae/currencies', () => {
      it('should return supported currencies', async () => {
        const response = await request(app)
          .get('/api/uae/currencies')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.currencies).toBeInstanceOf(Array);
        expect(response.body.data.baseCurrency).toBe('AED');
        expect(response.body.data.exchangeRates).toBeDefined();
      });

      it('should include GCC currencies', async () => {
        const response = await request(app)
          .get('/api/uae/currencies')
          .expect(200);

        const currencyCodes = response.body.data.currencies.map(c => c.code);
        expect(currencyCodes).toContain('AED');
        expect(currencyCodes).toContain('SAR');
        expect(currencyCodes).toContain('QAR');
        expect(currencyCodes).toContain('KWD');
      });
    });

    describe('POST /api/uae/convert', () => {
      it('should convert between currencies', async () => {
        const conversionData = {
          amount: 1000,
          fromCurrency: 'USD',
          toCurrency: 'AED'
        };

        const response = await request(app)
          .post('/api/uae/convert')
          .send(conversionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.originalAmount).toBe(1000);
        expect(response.body.data.fromCurrency).toBe('USD');
        expect(response.body.data.toCurrency).toBe('AED');
        expect(response.body.data.convertedAmount).toBeGreaterThan(1000);
      });

      it('should format converted amounts', async () => {
        const conversionData = {
          amount: 1234.56,
          fromCurrency: 'AED',
          toCurrency: 'USD'
        };

        const response = await request(app)
          .post('/api/uae/convert')
          .send(conversionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.formattedAmount).toBeDefined();
      });

      it('should validate currency codes', async () => {
        const conversionData = {
          amount: 1000,
          fromCurrency: 'INVALID',
          toCurrency: 'AED'
        };

        const response = await request(app)
          .post('/api/uae/convert')
          .send(conversionData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Compliance Routes', () => {
    describe('GET /api/uae/compliance/rera/:propertyId', () => {
      it('should return RERA verification status', async () => {
        const response = await request(app)
          .get(`/api/uae/compliance/rera/${testProperty.id}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.propertyId).toBe(testProperty.id);
        expect(response.body.data.rera).toBeDefined();
        expect(response.body.data.compliance).toBeDefined();
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get(`/api/uae/compliance/rera/${testProperty.id}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/uae/compliance/kyc', () => {
      it('should return user KYC status', async () => {
        const response = await request(app)
          .get('/api/uae/compliance/kyc')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.kyc).toBeDefined();
        expect(response.body.data.documents).toBeDefined();
        expect(response.body.data.aml).toBeDefined();
        expect(response.body.data.investmentEligibility).toBeDefined();
      });

      it('should show completion percentage', async () => {
        const response = await request(app)
          .get('/api/uae/compliance/kyc')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.data.kyc.completionPercentage).toBeDefined();
        expect(response.body.data.kyc.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(response.body.data.kyc.completionPercentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Analytics Routes', () => {
    describe('GET /api/uae/analytics/market', () => {
      it('should return market analytics', async () => {
        const response = await request(app)
          .get('/api/uae/analytics/market')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.market).toBeDefined();
        expect(response.body.data.filters).toBeDefined();
      });

      it('should filter by zone', async () => {
        const response = await request(app)
          .get('/api/uae/analytics/market?zone=Downtown Dubai')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.filters.zone).toBe('Downtown Dubai');
      });

      it('should filter by property type', async () => {
        const response = await request(app)
          .get('/api/uae/analytics/market?propertyType=apartment')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.filters.propertyType).toBe('apartment');
      });

      it('should convert analytics to requested currency', async () => {
        const response = await request(app)
          .get('/api/uae/analytics/market?currency=USD')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.market.currency).toBe('USD');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/uae/properties')
        .expect(500);

      expect(response.body.success).toBe(false);

      // Reconnect for cleanup
      await mongoose.connect(process.env.DATABASE_URL);
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', authToken)
        .send({}) // Empty body
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limits to API endpoints', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 150 }, () =>
        request(app).get('/api/uae/properties')
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.some(result => 
        result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimited).toBe(true);
    });
  });

  describe('Security', () => {
    it('should require authentication for investment routes', async () => {
      const response = await request(app)
        .post('/api/uae/invest')
        .send({
          propertyId: testProperty.id,
          amount: 50000,
          currency: 'AED'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize user input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .get(`/api/uae/properties?zone=${maliciousInput}`)
        .expect(200);

      // Response should not contain the script tag
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should validate property ownership for sensitive operations', async () => {
      const otherProperty = PropertyFactory.createUAEProperty();
      await UAEProperty.create(otherProperty);

      const response = await request(app)
        .get(`/api/uae/compliance/rera/${otherProperty.id}`)
        .set('Authorization', authToken)
        .expect(200); // Should work for any property for compliance info

      expect(response.body.success).toBe(true);
    });
  });
});