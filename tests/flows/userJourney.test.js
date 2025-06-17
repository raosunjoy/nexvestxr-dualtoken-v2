const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const UAEUser = require('../../backend/src/models/UAEUser');
const UAEProperty = require('../../backend/src/models/UAEProperty');
const UserFactory = require('../factories/userFactory');
const PropertyFactory = require('../factories/propertyFactory');
const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');

describe('UAE Platform User Journey Tests', () => {
  let app;
  let testProperty;
  let userSession = {};

  beforeAll(async () => {
    // Setup Express app with all routes
    app = express();
    app.use(express.json());
    
    // Add all route handlers
    app.use('/api/auth', require('../../backend/src/routes/authRoutes'));
    app.use('/api/uae', require('../../backend/src/routes/uaeRoutes'));
    app.use('/api/kyc', require('../../backend/src/routes/kycRoutes'));
    
    // Setup test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await UAEUser.deleteMany({});
    await UAEProperty.deleteMany({});
    
    // Create test property
    testProperty = PropertyFactory.createUAEProperty({
      status: 'active',
      compliance: {
        rera: { registered: true, verified: true },
        dld: { registered: true, verified: true }
      }
    });
    await UAEProperty.create(testProperty);
    
    // Reset user session
    userSession = {};
  });

  afterEach(async () => {
    await UAEUser.deleteMany({});
    await UAEProperty.deleteMany({});
  });

  describe('Complete User Investment Journey', () => {
    it('should complete full user journey from registration to investment', async () => {
      // ===================================================================
      // STEP 1: User Registration
      // ===================================================================
      console.log('📝 Step 1: User Registration');
      
      const registrationData = {
        email: 'investor@example.ae',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'Ahmed',
        lastName: 'Al Mansouri',
        phoneCountryCode: '+971',
        phoneNumber: '501234567',
        nationality: 'AE',
        emirate: 'Dubai',
        acceptTerms: true,
        acceptPrivacy: true
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.user.email).toBe(registrationData.email);
      expect(registrationResponse.body.data.user.status).toBe('pending_verification');
      
      userSession.userId = registrationResponse.body.data.user.id;
      userSession.email = registrationData.email;

      // ===================================================================
      // STEP 2: Email Verification
      // ===================================================================
      console.log('📧 Step 2: Email Verification');
      
      const verificationCode = '123456'; // Mock verification code
      
      const emailVerificationResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: userSession.email,
          code: verificationCode
        })
        .expect(200);

      expect(emailVerificationResponse.body.success).toBe(true);
      expect(emailVerificationResponse.body.data.emailVerified).toBe(true);

      // ===================================================================
      // STEP 3: Phone Verification
      // ===================================================================
      console.log('📱 Step 3: Phone Verification');
      
      const phoneVerificationResponse = await request(app)
        .post('/api/auth/verify-phone')
        .send({
          userId: userSession.userId,
          code: verificationCode
        })
        .expect(200);

      expect(phoneVerificationResponse.body.success).toBe(true);
      expect(phoneVerificationResponse.body.data.phoneVerified).toBe(true);

      // ===================================================================
      // STEP 4: User Login
      // ===================================================================
      console.log('🔐 Step 4: User Login');
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userSession.email,
          password: registrationData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      
      userSession.token = loginResponse.body.data.token;
      userSession.authHeader = `Bearer ${userSession.token}`;

      // ===================================================================
      // STEP 5: Browse Properties (Before KYC)
      // ===================================================================
      console.log('🏘️ Step 5: Browse Properties');
      
      const propertiesResponse = await request(app)
        .get('/api/uae/properties?city=Dubai&limit=10')
        .expect(200);

      expect(propertiesResponse.body.success).toBe(true);
      expect(propertiesResponse.body.data.properties).toBeInstanceOf(Array);
      expect(propertiesResponse.body.data.properties.length).toBeGreaterThan(0);
      
      const selectedProperty = propertiesResponse.body.data.properties[0];
      userSession.selectedPropertyId = selectedProperty.id;

      // ===================================================================
      // STEP 6: View Property Details
      // ===================================================================
      console.log('🏢 Step 6: View Property Details');
      
      const propertyDetailsResponse = await request(app)
        .get(`/api/uae/properties/${userSession.selectedPropertyId}`)
        .expect(200);

      expect(propertyDetailsResponse.body.success).toBe(true);
      expect(propertyDetailsResponse.body.data.title).toBeDefined();
      expect(propertyDetailsResponse.body.data.valuation).toBeDefined();
      expect(propertyDetailsResponse.body.data.investment).toBeDefined();

      // ===================================================================
      // STEP 7: Attempt Investment (Should Fail - No KYC)
      // ===================================================================
      console.log('❌ Step 7: Attempt Investment Without KYC');
      
      const prematureInvestmentResponse = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', userSession.authHeader)
        .send({
          propertyId: userSession.selectedPropertyId,
          amount: 50000,
          currency: 'AED'
        })
        .expect(403);

      expect(prematureInvestmentResponse.body.success).toBe(false);
      expect(prematureInvestmentResponse.body.error).toContain('KYC');

      // ===================================================================
      // STEP 8: Start KYC Process
      // ===================================================================
      console.log('📋 Step 8: Start KYC Process');
      
      const kycSubmissionResponse = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', userSession.authHeader)
        .send({
          level: 'standard',
          nationality: 'AE',
          emiratesId: '784-1234-1234567-12',
          passportNumber: 'A12345678',
          visaNumber: 'UAE123456789',
          annualIncome: 300000,
          employmentStatus: 'employed',
          employer: 'Dubai Tech Company'
        })
        .expect(201);

      expect(kycSubmissionResponse.body.success).toBe(true);
      expect(kycSubmissionResponse.body.data.status).toBe('submitted');
      
      userSession.kycId = kycSubmissionResponse.body.data.kycId;

      // ===================================================================
      // STEP 9: Upload KYC Documents
      // ===================================================================
      console.log('📄 Step 9: Upload KYC Documents');
      
      // Mock Emirates ID upload
      const emiratesIdUploadResponse = await request(app)
        .post('/api/kyc/upload-document')
        .set('Authorization', userSession.authHeader)
        .field('documentType', 'emirates_id')
        .field('kycId', userSession.kycId)
        .attach('document', Buffer.from('mock-emirates-id-data'), 'emirates_id.jpg')
        .expect(200);

      expect(emiratesIdUploadResponse.body.success).toBe(true);
      expect(emiratesIdUploadResponse.body.data.documentType).toBe('emirates_id');

      // Mock Passport upload
      const passportUploadResponse = await request(app)
        .post('/api/kyc/upload-document')
        .set('Authorization', userSession.authHeader)
        .field('documentType', 'passport')
        .field('kycId', userSession.kycId)
        .attach('document', Buffer.from('mock-passport-data'), 'passport.jpg')
        .expect(200);

      expect(passportUploadResponse.body.success).toBe(true);
      expect(passportUploadResponse.body.data.documentType).toBe('passport');

      // ===================================================================
      // STEP 10: Check KYC Status
      // ===================================================================
      console.log('⏳ Step 10: Check KYC Status');
      
      const kycStatusResponse = await request(app)
        .get('/api/uae/compliance/kyc')
        .set('Authorization', userSession.authHeader)
        .expect(200);

      expect(kycStatusResponse.body.success).toBe(true);
      expect(kycStatusResponse.body.data.kyc.status).toBe('under_review');
      expect(kycStatusResponse.body.data.documents.submitted.length).toBeGreaterThan(0);

      // ===================================================================
      // STEP 11: Simulate KYC Approval (Admin Action)
      // ===================================================================
      console.log('✅ Step 11: Simulate KYC Approval');
      
      // In a real scenario, this would be done by an admin
      await UAEUser.findOneAndUpdate(
        { email: userSession.email },
        {
          $set: {
            'kyc.status': 'approved',
            'kyc.approvedAt': new Date(),
            'kyc.approvedBy': 'system',
            'flags.kycCompleted': true,
            'flags.investmentEligible': true,
            'flags.complianceCleared': true,
            'status': 'active'
          }
        }
      );

      // Verify KYC approval
      const approvedKycStatusResponse = await request(app)
        .get('/api/uae/compliance/kyc')
        .set('Authorization', userSession.authHeader)
        .expect(200);

      expect(approvedKycStatusResponse.body.data.kyc.status).toBe('approved');
      expect(approvedKycStatusResponse.body.data.investmentEligibility.eligible).toBe(true);

      // ===================================================================
      // STEP 12: Successful Investment
      // ===================================================================
      console.log('💰 Step 12: Make Investment');
      
      const successfulInvestmentResponse = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', userSession.authHeader)
        .send({
          propertyId: userSession.selectedPropertyId,
          amount: 50000,
          currency: 'AED'
        })
        .expect(201);

      expect(successfulInvestmentResponse.body.success).toBe(true);
      expect(successfulInvestmentResponse.body.data.investment.amount).toBe(50000);
      expect(successfulInvestmentResponse.body.data.investment.tokens).toBeGreaterThan(0);
      expect(successfulInvestmentResponse.body.data.investment.transactionId).toBeDefined();
      
      userSession.investmentId = successfulInvestmentResponse.body.data.investment.transactionId;

      // ===================================================================
      // STEP 13: Check Portfolio
      // ===================================================================
      console.log('📊 Step 13: Check Portfolio');
      
      const portfolioResponse = await request(app)
        .get('/api/uae/portfolio')
        .set('Authorization', userSession.authHeader)
        .expect(200);

      expect(portfolioResponse.body.success).toBe(true);
      expect(portfolioResponse.body.data.portfolio.properties).toHaveLength(1);
      expect(portfolioResponse.body.data.portfolio.totalValue).toBeGreaterThan(0);
      expect(portfolioResponse.body.data.summary.totalInvested).toBe(50000);

      // ===================================================================
      // STEP 14: Make Additional Investment in Different Currency
      // ===================================================================
      console.log('💵 Step 14: Multi-Currency Investment');
      
      const usdInvestmentResponse = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', userSession.authHeader)
        .send({
          propertyId: userSession.selectedPropertyId,
          amount: 5000, // USD
          currency: 'USD'
        })
        .expect(201);

      expect(usdInvestmentResponse.body.success).toBe(true);
      expect(usdInvestmentResponse.body.data.investment.currency).toBe('AED'); // Converted to AED

      // ===================================================================
      // STEP 15: Check Updated Portfolio
      // ===================================================================
      console.log('📈 Step 15: Check Updated Portfolio');
      
      const updatedPortfolioResponse = await request(app)
        .get('/api/uae/portfolio')
        .set('Authorization', userSession.authHeader)
        .expect(200);

      expect(updatedPortfolioResponse.body.success).toBe(true);
      expect(updatedPortfolioResponse.body.data.summary.totalInvested).toBeGreaterThan(50000);

      // ===================================================================
      // STEP 16: View Investment in Different Currency
      // ===================================================================
      console.log('🔄 Step 16: Currency Conversion View');
      
      const usdPortfolioResponse = await request(app)
        .get('/api/uae/portfolio?currency=USD')
        .set('Authorization', userSession.authHeader)
        .expect(200);

      expect(usdPortfolioResponse.body.success).toBe(true);
      expect(usdPortfolioResponse.body.data.portfolio.currency).toBe('USD');

      // ===================================================================
      // STEP 17: Check Market Analytics
      // ===================================================================
      console.log('📊 Step 17: Market Analytics');
      
      const marketAnalyticsResponse = await request(app)
        .get('/api/uae/analytics/market?zone=Dubai Marina&currency=AED')
        .expect(200);

      expect(marketAnalyticsResponse.body.success).toBe(true);
      expect(marketAnalyticsResponse.body.data.market).toBeDefined();

      console.log('✅ Complete user journey successful!');
      console.log(`User ${userSession.email} successfully:
        - Registered and verified account
        - Completed KYC process
        - Made investments totaling ${updatedPortfolioResponse.body.data.summary.totalInvested} AED
        - Built a portfolio with ${updatedPortfolioResponse.body.data.portfolio.properties.length} property investment(s)`);
    });

    it('should handle premium investor journey with enhanced KYC', async () => {
      // ===================================================================
      // PREMIUM INVESTOR JOURNEY
      // ===================================================================
      console.log('💎 Premium Investor Journey');

      // Registration for premium investor
      const premiumUserData = {
        email: 'premium@example.ae',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'Khalifa',
        lastName: 'Al Nahyan',
        phoneCountryCode: '+971',
        phoneNumber: '502345678',
        nationality: 'AE',
        emirate: 'Abu Dhabi',
        acceptTerms: true,
        acceptPrivacy: true
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(premiumUserData)
        .expect(201);

      const userId = registrationResponse.body.data.user.id;

      // Skip email/phone verification for test speed
      await UAEUser.findByIdAndUpdate(userId, {
        $set: {
          'flags.emailVerified': true,
          'flags.phoneVerified': true,
          'phone.verified': true
        }
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: premiumUserData.email,
          password: premiumUserData.password
        })
        .expect(200);

      const authHeader = `Bearer ${loginResponse.body.data.token}`;

      // Submit enhanced KYC for premium tier
      const enhancedKycResponse = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', authHeader)
        .send({
          level: 'enhanced',
          nationality: 'AE',
          emiratesId: '784-5678-5678901-23',
          passportNumber: 'B87654321',
          annualIncome: 800000,
          employmentStatus: 'self_employed',
          employer: 'Al Nahyan Holdings',
          requestedTier: 'premium'
        })
        .expect(201);

      expect(enhancedKycResponse.body.data.level).toBe('enhanced');

      // Upload additional documents for enhanced KYC
      const salaryUploadResponse = await request(app)
        .post('/api/kyc/upload-document')
        .set('Authorization', authHeader)
        .field('documentType', 'salary_certificate')
        .field('kycId', enhancedKycResponse.body.data.kycId)
        .attach('document', Buffer.from('mock-salary-cert'), 'salary.pdf')
        .expect(200);

      expect(salaryUploadResponse.body.success).toBe(true);

      const bankStatementUploadResponse = await request(app)
        .post('/api/kyc/upload-document')
        .set('Authorization', authHeader)
        .field('documentType', 'bank_statement')
        .field('kycId', enhancedKycResponse.body.data.kycId)
        .attach('document', Buffer.from('mock-bank-statement'), 'bank.pdf')
        .expect(200);

      expect(bankStatementUploadResponse.body.success).toBe(true);

      // Approve enhanced KYC
      await UAEUser.findOneAndUpdate(
        { email: premiumUserData.email },
        {
          $set: {
            'kyc.status': 'approved',
            'kyc.level': 'enhanced',
            'investmentProfile.tier': 'premium',
            'flags.kycCompleted': true,
            'flags.investmentEligible': true,
            'status': 'active'
          }
        }
      );

      // Make larger premium investment
      const premiumInvestmentResponse = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', authHeader)
        .send({
          propertyId: testProperty.id,
          amount: 750000, // Premium tier investment
          currency: 'AED'
        })
        .expect(201);

      expect(premiumInvestmentResponse.body.success).toBe(true);
      expect(premiumInvestmentResponse.body.data.investment.amount).toBe(750000);

      console.log('✅ Premium investor journey completed successfully');
    });

    it('should handle institutional investor journey with comprehensive KYC', async () => {
      // ===================================================================
      // INSTITUTIONAL INVESTOR JOURNEY
      // ===================================================================
      console.log('🏢 Institutional Investor Journey');

      const institutionalUserData = {
        email: 'institution@example.ae',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'Mohammed',
        lastName: 'Al Maktoum',
        phoneCountryCode: '+971',
        phoneNumber: '503456789',
        nationality: 'AE',
        emirate: 'Dubai',
        acceptTerms: true,
        acceptPrivacy: true
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(institutionalUserData)
        .expect(201);

      const userId = registrationResponse.body.data.user.id;

      // Quick verification setup
      await UAEUser.findByIdAndUpdate(userId, {
        $set: {
          'flags.emailVerified': true,
          'flags.phoneVerified': true,
          'phone.verified': true,
          'userType': 'institutional'
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: institutionalUserData.email,
          password: institutionalUserData.password
        })
        .expect(200);

      const authHeader = `Bearer ${loginResponse.body.data.token}`;

      // Submit comprehensive KYC
      const comprehensiveKycResponse = await request(app)
        .post('/api/kyc/submit')
        .set('Authorization', authHeader)
        .send({
          level: 'comprehensive',
          nationality: 'AE',
          emiratesId: '784-9012-9012345-67',
          passportNumber: 'C12345678',
          annualIncome: 5000000,
          employmentStatus: 'self_employed',
          employer: 'Dubai Investment Group',
          requestedTier: 'institutional'
        })
        .expect(201);

      expect(comprehensiveKycResponse.body.data.level).toBe('comprehensive');

      // Upload all required documents for institutional KYC
      const documents = [
        'emirates_id', 'passport', 'salary_certificate', 
        'bank_statement', 'trade_license', 'proof_of_address'
      ];

      for (const docType of documents) {
        await request(app)
          .post('/api/kyc/upload-document')
          .set('Authorization', authHeader)
          .field('documentType', docType)
          .field('kycId', comprehensiveKycResponse.body.data.kycId)
          .attach('document', Buffer.from(`mock-${docType}`), `${docType}.pdf`)
          .expect(200);
      }

      // Approve comprehensive KYC
      await UAEUser.findOneAndUpdate(
        { email: institutionalUserData.email },
        {
          $set: {
            'kyc.status': 'approved',
            'kyc.level': 'comprehensive',
            'investmentProfile.tier': 'institutional',
            'flags.kycCompleted': true,
            'flags.investmentEligible': true,
            'status': 'active'
          }
        }
      );

      // Make large institutional investment
      const institutionalInvestmentResponse = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', authHeader)
        .send({
          propertyId: testProperty.id,
          amount: 3000000, // Institutional tier investment
          currency: 'AED'
        })
        .expect(201);

      expect(institutionalInvestmentResponse.body.success).toBe(true);
      expect(institutionalInvestmentResponse.body.data.investment.amount).toBe(3000000);

      console.log('✅ Institutional investor journey completed successfully');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle registration with existing email', async () => {
      const userData = {
        email: 'duplicate@example.ae',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        phoneCountryCode: '+971',
        phoneNumber: '504567890',
        nationality: 'AE',
        emirate: 'Dubai'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error).toContain('email');
    });

    it('should handle investment exceeding property availability', async () => {
      // Create user and complete KYC
      const user = await UserFactory.createApprovedInvestor();
      await UAEUser.create(user);

      // Create property with limited availability
      const limitedProperty = PropertyFactory.createUAEProperty({
        tokenization: {
          totalSupply: 1000,
          availableSupply: 100, // Very limited
          tokenPrice: { aed: 1000 }
        }
      });
      await UAEProperty.create(limitedProperty);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'TestPass123!'
        })
        .expect(200);

      const authHeader = `Bearer ${loginResponse.body.data.token}`;

      // Attempt to invest more than available
      const excessiveInvestmentResponse = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', authHeader)
        .send({
          propertyId: limitedProperty.id,
          amount: 150000, // More than available (100 tokens * 1000 AED)
          currency: 'AED'
        })
        .expect(400);

      expect(excessiveInvestmentResponse.body.success).toBe(false);
      expect(excessiveInvestmentResponse.body.error).toContain('insufficient');
    });

    it('should handle session timeout during investment process', async () => {
      const user = await UserFactory.createApprovedInvestor();
      await UAEUser.create(user);

      // Simulate expired token
      const expiredToken = 'Bearer expired.token.here';

      const investmentResponse = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', expiredToken)
        .send({
          propertyId: testProperty.id,
          amount: 50000,
          currency: 'AED'
        })
        .expect(401);

      expect(investmentResponse.body.success).toBe(false);
      expect(investmentResponse.body.error).toContain('token');
    });
  });

  describe('Multi-language User Journey', () => {
    it('should support Arabic user interface throughout journey', async () => {
      // Test Arabic language support
      const arabicPropertiesResponse = await request(app)
        .get('/api/uae/properties?language=ar&limit=5')
        .expect(200);

      expect(arabicPropertiesResponse.body.success).toBe(true);
      
      // Verify Arabic content is returned (properties have Arabic titles)
      const properties = arabicPropertiesResponse.body.data.properties;
      properties.forEach(property => {
        expect(property.title).toBeDefined();
        expect(property.description).toBeDefined();
        // Verify Arabic content structure
      });
    });

    it('should support currency conversion throughout journey', async () => {
      // Test multi-currency support
      const currencies = ['USD', 'EUR', 'SAR', 'QAR'];
      
      for (const currency of currencies) {
        const currencyPropertiesResponse = await request(app)
          .get(`/api/uae/properties?currency=${currency}&limit=1`)
          .expect(200);

        expect(currencyPropertiesResponse.body.success).toBe(true);
        expect(currencyPropertiesResponse.body.data.filters.currency).toBe(currency);
      }
    });
  });
});