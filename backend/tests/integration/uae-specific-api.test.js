const request = require('supertest');
const { app } = require('../../src/server');

// Test suite for UAE-specific API endpoints
describe('UAE-Specific API Integration Tests', () => {
  let authToken;
  let userId;
  let developerId;

  const testUserData = {
    username: 'uae-user',
    email: 'uae-user@nexvestxr.com',
    password: 'TestPassword123!',
    firstName: 'Ahmed',
    lastName: 'Al Mansouri',
    phone: '+971501234567',
    investorType: 'individual',
    country: 'AE',
    nationality: 'AE',
    emiratesId: '784-1990-1234567-1'
  };

  beforeAll(async () => {
    // Register and login user for testing
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUserData)
      .expect(201);
    
    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  // ============================================================================
  // UAE ROUTES ENDPOINTS
  // ============================================================================
  describe('UAE Routes API', () => {
    describe('GET /api/uae/emirates', () => {
      it('should get list of UAE emirates', async () => {
        const response = await request(app)
          .get('/api/uae/emirates')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toContain('Abu Dhabi');
        expect(response.body.data).toContain('Dubai');
        expect(response.body.data).toContain('Sharjah');
      });
    });

    describe('GET /api/uae/cities/:emirate', () => {
      it('should get cities for Abu Dhabi', async () => {
        const response = await request(app)
          .get('/api/uae/cities/Abu Dhabi')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toContain('Abu Dhabi City');
        expect(response.body.data).toContain('Al Ain');
      });

      it('should get cities for Dubai', async () => {
        const response = await request(app)
          .get('/api/uae/cities/Dubai')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toContain('Dubai Marina');
        expect(response.body.data).toContain('Downtown Dubai');
        expect(response.body.data).toContain('Jumeirah');
      });
    });

    describe('GET /api/uae/developers', () => {
      it('should get UAE developers list', async () => {
        const response = await request(app)
          .get('/api/uae/developers')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Check for major UAE developers
        const developerNames = response.body.data.map(dev => dev.name);
        expect(developerNames).toContain('Aldar Properties');
        expect(developerNames).toContain('EMAAR Properties');
        expect(developerNames).toContain('Meraas');
      });
    });

    describe('GET /api/uae/developers/:id', () => {
      it('should get specific developer details', async () => {
        // First get the developers list to get a valid ID
        const developersResponse = await request(app)
          .get('/api/uae/developers')
          .expect(200);

        if (developersResponse.body.data.length > 0) {
          const developerId = developersResponse.body.data[0].id;
          
          const response = await request(app)
            .get(`/api/uae/developers/${developerId}`)
            .expect(200);

          expect(response.body).toHaveProperty('success', true);
          expect(response.body.data).toHaveProperty('id', developerId);
          expect(response.body.data).toHaveProperty('name');
          expect(response.body.data).toHaveProperty('tier');
          expect(response.body.data).toHaveProperty('projects');
        }
      });
    });

    describe('GET /api/uae/properties', () => {
      it('should get UAE properties with filters', async () => {
        const response = await request(app)
          .get('/api/uae/properties?emirate=Dubai&propertyType=apartment&minPrice=500000&maxPrice=2000000')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('filters');
      });

      it('should get properties by specific developer', async () => {
        const response = await request(app)
          .get('/api/uae/properties?developer=Aldar Properties')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should get properties with investment status', async () => {
        const response = await request(app)
          .get('/api/uae/properties?status=AVAILABLE&sortBy=price&order=asc')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('GET /api/uae/properties/:id', () => {
      it('should get specific property details', async () => {
        // Create a test property first
        const propertyData = {
          name: 'Test UAE Property',
          location: 'Dubai Marina',
          emirate: 'Dubai',
          developer: 'Test Developer',
          totalValue: 1500000,
          propertyType: 'apartment',
          expectedROI: 8.5,
          area: 1200,
          bedrooms: 2,
          status: 'AVAILABLE'
        };

        const createResponse = await request(app)
          .post('/api/property')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(201);

        const propertyId = createResponse.body.data.propertyId;

        const response = await request(app)
          .get(`/api/uae/properties/${propertyId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('propertyId', propertyId);
        expect(response.body.data).toHaveProperty('name', propertyData.name);
        expect(response.body.data).toHaveProperty('uaeCompliance');
      });
    });

    describe('POST /api/uae/investment', () => {
      it('should create UAE investment with compliance checks', async () => {
        const investmentData = {
          propertyId: 'test-property-id',
          amount: 250000,
          currency: 'AED',
          investorType: 'individual',
          emiratesId: testUserData.emiratesId,
          visaType: 'resident'
        };

        const response = await request(app)
          .post('/api/uae/investment')
          .set('Authorization', `Bearer ${authToken}`)
          .send(investmentData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('investmentId');
        expect(response.body.data).toHaveProperty('complianceCheck');
        expect(response.body.data).toHaveProperty('reraCompliant');
      });

      it('should reject investment below minimum threshold', async () => {
        const investmentData = {
          propertyId: 'test-property-id',
          amount: 5000, // Below minimum
          currency: 'AED'
        };

        await request(app)
          .post('/api/uae/investment')
          .set('Authorization', `Bearer ${authToken}`)
          .send(investmentData)
          .expect(400);
      });
    });

    describe('GET /api/uae/compliance/check', () => {
      it('should check UAE investment compliance', async () => {
        const response = await request(app)
          .get('/api/uae/compliance/check')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            amount: 500000,
            propertyType: 'apartment',
            emirate: 'Dubai',
            investorNationality: 'AE'
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('compliant');
        expect(response.body.data).toHaveProperty('requirements');
        expect(response.body.data).toHaveProperty('restrictions');
      });
    });
  });

  // ============================================================================
  // eKYC ENDPOINTS
  // ============================================================================
  describe('eKYC API', () => {
    describe('POST /api/ekyc/submit', () => {
      it('should submit KYC documents', async () => {
        const kycData = {
          emiratesId: testUserData.emiratesId,
          passportNumber: 'A12345678',
          documents: {
            emiratesIdFront: 'emirates_front_hash',
            emiratesIdBack: 'emirates_back_hash',
            passport: 'passport_hash',
            salaryCertificate: 'salary_cert_hash'
          },
          personalInfo: {
            dateOfBirth: '1990-01-01',
            placeOfBirth: 'Abu Dhabi',
            occupation: 'Engineer',
            employer: 'Tech Company LLC'
          }
        };

        const response = await request(app)
          .post('/api/ekyc/submit')
          .set('Authorization', `Bearer ${authToken}`)
          .send(kycData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('kycId');
        expect(response.body.data).toHaveProperty('status', 'PENDING');
      });
    });

    describe('GET /api/ekyc/status', () => {
      it('should get KYC verification status', async () => {
        const response = await request(app)
          .get('/api/ekyc/status')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('level');
      });
    });

    describe('GET /api/ekyc/requirements', () => {
      it('should get KYC requirements by investor type', async () => {
        const response = await request(app)
          .get('/api/ekyc/requirements?investorType=individual&nationality=AE')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('required');
        expect(response.body.data).toHaveProperty('optional');
        expect(Array.isArray(response.body.data.required)).toBe(true);
      });
    });
  });

  // ============================================================================
  // FLARE NETWORK ENDPOINTS
  // ============================================================================
  describe('Flare Network API', () => {
    describe('POST /api/flare/tokenize', () => {
      it('should tokenize property on Flare network', async () => {
        const tokenizeData = {
          propertyId: 'test-uae-property',
          totalValue: 5000000,
          totalTokens: 1000000,
          pricePerToken: 5,
          minimumRaise: 2500000,
          fundingPeriodDays: 90
        };

        const response = await request(app)
          .post('/api/flare/tokenize')
          .set('Authorization', `Bearer ${authToken}`)
          .send(tokenizeData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('transactionHash');
        expect(response.body.data).toHaveProperty('tokenContract');
      });
    });

    describe('POST /api/flare/purchase', () => {
      it('should purchase property tokens', async () => {
        const purchaseData = {
          tokenId: 'test-token-id',
          amount: 100,
          paymentValue: '500'
        };

        const response = await request(app)
          .post('/api/flare/purchase')
          .set('Authorization', `Bearer ${authToken}`)
          .send(purchaseData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('transactionHash');
      });
    });

    describe('GET /api/flare/balance/:address', () => {
      it('should get token balance for address', async () => {
        const testAddress = '0x1234567890123456789012345678901234567890';
        const response = await request(app)
          .get(`/api/flare/balance/${testAddress}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('balance');
        expect(response.body.data).toHaveProperty('tokens');
      });
    });

    describe('GET /api/flare/transactions/:address', () => {
      it('should get transaction history', async () => {
        const testAddress = '0x1234567890123456789012345678901234567890';
        const response = await request(app)
          .get(`/api/flare/transactions/${testAddress}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  // ============================================================================
  // XUMM INTEGRATION ENDPOINTS
  // ============================================================================
  describe('XUMM Integration API', () => {
    describe('POST /api/xumm/create-payload', () => {
      it('should create XUMM payment payload', async () => {
        const payloadData = {
          amount: '100',
          destination: 'rN7n7otQDd6FczFgLdSqDMUman85SVGD9c',
          memo: 'Property investment payment'
        };

        const response = await request(app)
          .post('/api/xumm/create-payload')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payloadData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('uuid');
        expect(response.body.data).toHaveProperty('next');
        expect(response.body.data).toHaveProperty('refs');
      });
    });

    describe('GET /api/xumm/payload/:uuid', () => {
      it('should get payload status', async () => {
        // First create a payload
        const payloadData = {
          amount: '50',
          destination: 'rN7n7otQDd6FczFgLdSqDMUman85SVGD9c'
        };

        const createResponse = await request(app)
          .post('/api/xumm/create-payload')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payloadData);

        const uuid = createResponse.body.data.uuid;

        const response = await request(app)
          .get(`/api/xumm/payload/${uuid}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('meta');
        expect(response.body.data).toHaveProperty('application');
      });
    });
  });

  // ============================================================================
  // SUBSCRIPTION ENDPOINTS
  // ============================================================================
  describe('Subscription API', () => {
    describe('GET /api/subscription/plans', () => {
      it('should get available subscription plans', async () => {
        const response = await request(app)
          .get('/api/subscription/plans')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Check for UAE-specific plans
        const planNames = response.body.data.map(plan => plan.name);
        expect(planNames).toContain('UAE Retail');
        expect(planNames).toContain('UAE Premium');
        expect(planNames).toContain('UAE Institutional');
      });
    });

    describe('POST /api/subscription/subscribe', () => {
      it('should subscribe to a plan', async () => {
        const subscriptionData = {
          planId: 'uae-retail',
          paymentMethod: 'card'
        };

        const response = await request(app)
          .post('/api/subscription/subscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('subscriptionId');
        expect(response.body.data).toHaveProperty('status');
      });
    });

    describe('GET /api/subscription/current', () => {
      it('should get current subscription', async () => {
        const response = await request(app)
          .get('/api/subscription/current')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('plan');
        expect(response.body.data).toHaveProperty('status');
      });
    });
  });

  // ============================================================================
  // SUPPORT ENDPOINTS
  // ============================================================================
  describe('Support API', () => {
    describe('POST /api/support/ticket', () => {
      it('should create support ticket', async () => {
        const ticketData = {
          subject: 'Investment Inquiry',
          category: 'investment',
          priority: 'medium',
          message: 'I need help with my property investment process.',
          language: 'en'
        };

        const response = await request(app)
          .post('/api/support/ticket')
          .set('Authorization', `Bearer ${authToken}`)
          .send(ticketData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('ticketId');
        expect(response.body.data).toHaveProperty('status', 'OPEN');
      });
    });

    describe('GET /api/support/tickets', () => {
      it('should get user support tickets', async () => {
        const response = await request(app)
          .get('/api/support/tickets')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/support/faq', () => {
      it('should get FAQ in English', async () => {
        const response = await request(app)
          .get('/api/support/faq?lang=en&category=investment')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should get FAQ in Arabic', async () => {
        const response = await request(app)
          .get('/api/support/faq?lang=ar&category=general')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  // ============================================================================
  // USER METRICS ENDPOINTS
  // ============================================================================
  describe('User Metrics API', () => {
    describe('GET /api/user-metrics/dashboard', () => {
      it('should get user dashboard metrics', async () => {
        const response = await request(app)
          .get('/api/user-metrics/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('totalInvestment');
        expect(response.body.data).toHaveProperty('portfolioValue');
        expect(response.body.data).toHaveProperty('roi');
        expect(response.body.data).toHaveProperty('activeInvestments');
      });
    });

    describe('GET /api/user-metrics/activity', () => {
      it('should get user activity metrics', async () => {
        const response = await request(app)
          .get('/api/user-metrics/activity?period=30d')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('loginCount');
        expect(response.body.data).toHaveProperty('transactionCount');
        expect(response.body.data).toHaveProperty('lastActivity');
      });
    });
  });
});