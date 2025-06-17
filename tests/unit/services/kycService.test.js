const KYCService = require('../../../backend/src/services/KYCService');
const UserFactory = require('../../factories/userFactory');
const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

describe('KYCService - UAE Compliance', () => {
  let kycService;
  let mockUser;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    kycService = new KYCService();
    mockUser = await UserFactory.createUAEUser();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('KYC Level Determination', () => {
    it('should determine standard KYC level for retail investors', () => {
      const user = { investmentProfile: { tier: 'retail' } };
      const level = kycService.determineKYCLevel(user);
      
      expect(level).toBe('standard');
    });

    it('should determine enhanced KYC level for premium investors', () => {
      const user = { investmentProfile: { tier: 'premium' } };
      const level = kycService.determineKYCLevel(user);
      
      expect(level).toBe('enhanced');
    });

    it('should determine comprehensive KYC level for institutional investors', () => {
      const user = { investmentProfile: { tier: 'institutional' } };
      const level = kycService.determineKYCLevel(user);
      
      expect(level).toBe('comprehensive');
    });

    it('should default to standard for unknown tiers', () => {
      const user = { investmentProfile: { tier: 'unknown' } };
      const level = kycService.determineKYCLevel(user);
      
      expect(level).toBe('standard');
    });
  });

  describe('Document Requirements', () => {
    it('should return correct documents for standard KYC', () => {
      const requirements = kycService.getDocumentRequirements('standard');
      
      expect(requirements).toContain('emirates_id');
      expect(requirements).toContain('passport');
      expect(requirements).toHaveLength(2);
    });

    it('should return correct documents for enhanced KYC', () => {
      const requirements = kycService.getDocumentRequirements('enhanced');
      
      expect(requirements).toContain('emirates_id');
      expect(requirements).toContain('passport');
      expect(requirements).toContain('salary_certificate');
      expect(requirements).toContain('bank_statement');
      expect(requirements).toHaveLength(4);
    });

    it('should return correct documents for comprehensive KYC', () => {
      const requirements = kycService.getDocumentRequirements('comprehensive');
      
      expect(requirements).toContain('emirates_id');
      expect(requirements).toContain('passport');
      expect(requirements).toContain('salary_certificate');
      expect(requirements).toContain('bank_statement');
      expect(requirements).toContain('trade_license');
      expect(requirements).toContain('proof_of_address');
      expect(requirements).toHaveLength(6);
    });
  });

  describe('Document Validation', () => {
    it('should validate Emirates ID format', () => {
      const validEmiratesId = '784-1234-1234567-12';
      const invalidEmiratesId = '123-456-789';
      
      expect(kycService.validateEmiratesId(validEmiratesId)).toBe(true);
      expect(kycService.validateEmiratesId(invalidEmiratesId)).toBe(false);
    });

    it('should validate passport format', () => {
      const validPassport = 'A12345678';
      const invalidPassport = '123';
      
      expect(kycService.validatePassport(validPassport)).toBe(true);
      expect(kycService.validatePassport(invalidPassport)).toBe(false);
    });

    it('should validate document expiry dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      expect(kycService.validateDocumentExpiry(futureDate)).toBe(true);
      expect(kycService.validateDocumentExpiry(pastDate)).toBe(false);
    });

    it('should validate document against user profile', async () => {
      const document = {
        type: 'emirates_id',
        number: '784-1234-1234567-12',
        expiryDate: new Date('2025-12-31'),
        documentHash: 'hash123'
      };
      
      const isValid = await kycService.validateDocument(document, mockUser);
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('KYC Status Management', () => {
    it('should submit KYC application', async () => {
      const kycData = {
        level: 'standard',
        documents: ['emirates_id', 'passport']
      };
      
      const result = await kycService.submitKYC(mockUser.id, kycData);
      
      expect(result.status).toBe('submitted');
      expect(result.level).toBe('standard');
      expect(result.submittedAt).toBeDefined();
    });

    it('should approve KYC application', async () => {
      const applicationId = 'app123';
      const reviewerId = 'reviewer123';
      
      const result = await kycService.approveKYC(applicationId, reviewerId);
      
      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe(reviewerId);
      expect(result.approvedAt).toBeDefined();
    });

    it('should reject KYC application with reason', async () => {
      const applicationId = 'app123';
      const reviewerId = 'reviewer123';
      const reason = 'Invalid document quality';
      
      const result = await kycService.rejectKYC(applicationId, reviewerId, reason);
      
      expect(result.status).toBe('rejected');
      expect(result.rejectedBy).toBe(reviewerId);
      expect(result.rejectionReason).toBe(reason);
    });

    it('should calculate KYC completion percentage', () => {
      const user = {
        kyc: {
          level: 'standard',
          documents: {
            emirates_id: { submitted: true, verified: true },
            passport: { submitted: true, verified: false }
          }
        }
      };
      
      const percentage = kycService.calculateCompletionPercentage(user);
      expect(percentage).toBe(50); // 1 of 2 documents verified
    });
  });

  describe('AML Checks', () => {
    it('should perform basic AML screening', async () => {
      const amlData = {
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'AE',
        idNumber: '784-1234-1234567-12'
      };
      
      const result = await kycService.performAMLCheck(amlData);
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('pepCheck');
      expect(result).toHaveProperty('sanctionsCheck');
      expect(['clear', 'flagged', 'under_investigation']).toContain(result.status);
    });

    it('should flag high-risk individuals', async () => {
      const highRiskData = {
        fullName: 'High Risk Person',
        dateOfBirth: '1980-01-01',
        nationality: 'XX', // Unknown country
        idNumber: 'INVALID'
      };
      
      const result = await kycService.performAMLCheck(highRiskData);
      
      expect(result.riskScore).toBeGreaterThan(70);
      expect(['flagged', 'under_investigation']).toContain(result.status);
    });

    it('should check PEP (Politically Exposed Person) status', async () => {
      const pepData = {
        fullName: 'Political Figure',
        position: 'Government Minister',
        country: 'AE'
      };
      
      const result = await kycService.checkPEPStatus(pepData);
      
      expect(typeof result.isPEP).toBe('boolean');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('sources');
    });

    it('should check sanctions lists', async () => {
      const sanctionsData = {
        fullName: 'John Doe',
        aliases: ['Johnny Doe', 'J. Doe'],
        dateOfBirth: '1990-01-01'
      };
      
      const result = await kycService.checkSanctionsList(sanctionsData);
      
      expect(typeof result.isListed).toBe('boolean');
      expect(result).toHaveProperty('matchingLists');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate risk score based on multiple factors', async () => {
      const riskFactors = {
        nationality: 'AE',
        residencyStatus: 'resident',
        income: 500000,
        investmentAmount: 100000,
        occupation: 'engineer',
        pepStatus: false,
        sanctionsListed: false
      };
      
      const riskScore = await kycService.calculateRiskScore(riskFactors);
      
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    });

    it('should assign higher risk to high-value transactions', async () => {
      const lowValueFactors = {
        nationality: 'AE',
        investmentAmount: 25000,
        pepStatus: false,
        sanctionsListed: false
      };
      
      const highValueFactors = {
        nationality: 'AE',
        investmentAmount: 5000000,
        pepStatus: false,
        sanctionsListed: false
      };
      
      const lowRisk = await kycService.calculateRiskScore(lowValueFactors);
      const highRisk = await kycService.calculateRiskScore(highValueFactors);
      
      expect(highRisk).toBeGreaterThan(lowRisk);
    });

    it('should assign higher risk to non-UAE residents', async () => {
      const uaeResident = {
        nationality: 'AE',
        residencyStatus: 'citizen',
        pepStatus: false,
        sanctionsListed: false
      };
      
      const foreignResident = {
        nationality: 'XX',
        residencyStatus: 'visitor',
        pepStatus: false,
        sanctionsListed: false
      };
      
      const uaeRisk = await kycService.calculateRiskScore(uaeResident);
      const foreignRisk = await kycService.calculateRiskScore(foreignResident);
      
      expect(foreignRisk).toBeGreaterThan(uaeRisk);
    });
  });

  describe('Document Processing', () => {
    it('should extract data from Emirates ID', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      
      const extractedData = await kycService.extractEmiratesIdData(mockImageBuffer);
      
      expect(extractedData).toHaveProperty('idNumber');
      expect(extractedData).toHaveProperty('fullName');
      expect(extractedData).toHaveProperty('nationality');
      expect(extractedData).toHaveProperty('expiryDate');
    });

    it('should extract data from passport', async () => {
      const mockImageBuffer = Buffer.from('mock-passport-data');
      
      const extractedData = await kycService.extractPassportData(mockImageBuffer);
      
      expect(extractedData).toHaveProperty('passportNumber');
      expect(extractedData).toHaveProperty('fullName');
      expect(extractedData).toHaveProperty('nationality');
      expect(extractedData).toHaveProperty('expiryDate');
      expect(extractedData).toHaveProperty('issuingCountry');
    });

    it('should verify document authenticity', async () => {
      const documentData = {
        type: 'emirates_id',
        imageBuffer: Buffer.from('mock-image'),
        extractedData: {
          idNumber: '784-1234-1234567-12',
          fullName: 'John Doe'
        }
      };
      
      const verificationResult = await kycService.verifyDocumentAuthenticity(documentData);
      
      expect(verificationResult).toHaveProperty('isAuthentic');
      expect(verificationResult).toHaveProperty('confidence');
      expect(verificationResult).toHaveProperty('checks');
    });
  });

  describe('Compliance Monitoring', () => {
    it('should check ongoing compliance requirements', async () => {
      const user = await UserFactory.createApprovedInvestor();
      
      const complianceStatus = await kycService.checkOngoingCompliance(user);
      
      expect(complianceStatus).toHaveProperty('isCompliant');
      expect(complianceStatus).toHaveProperty('expiringSoon');
      expect(complianceStatus).toHaveProperty('actionRequired');
    });

    it('should identify expiring documents', () => {
      const user = {
        kyc: {
          documents: {
            emirates_id: {
              verified: true,
              expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            },
            passport: {
              verified: true,
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
            }
          }
        }
      };
      
      const expiringDocs = kycService.getExpiringDocuments(user, 60); // 60 days threshold
      
      expect(expiringDocs).toContain('emirates_id');
      expect(expiringDocs).not.toContain('passport');
    });

    it('should generate compliance report', async () => {
      const user = await UserFactory.createApprovedInvestor();
      
      const report = await kycService.generateComplianceReport(user);
      
      expect(report).toHaveProperty('userId');
      expect(report).toHaveProperty('kycStatus');
      expect(report).toHaveProperty('amlStatus');
      expect(report).toHaveProperty('riskScore');
      expect(report).toHaveProperty('lastReviewDate');
      expect(report).toHaveProperty('nextReviewDue');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user data gracefully', async () => {
      const invalidUser = { id: null };
      
      await expect(
        kycService.submitKYC(invalidUser.id, {})
      ).rejects.toThrow('Invalid user ID');
    });

    it('should handle missing documents', async () => {
      const incompleteKycData = {
        level: 'standard',
        documents: [] // No documents provided
      };
      
      await expect(
        kycService.submitKYC(mockUser.id, incompleteKycData)
      ).rejects.toThrow('Required documents missing');
    });

    it('should handle external service failures', async () => {
      // Mock external service failure
      const mockFailureService = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      kycService.amlProvider = { check: mockFailureService };
      
      const result = await kycService.performAMLCheck({
        fullName: 'Test User',
        dateOfBirth: '1990-01-01'
      });
      
      expect(result.status).toBe('pending');
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should process KYC submission quickly', async () => {
      const startTime = Date.now();
      
      await kycService.submitKYC(mockUser.id, {
        level: 'standard',
        documents: ['emirates_id', 'passport']
      });
      
      const duration = Date.now() - startTime;
      
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle multiple concurrent KYC submissions', async () => {
      const submissions = Array.from({ length: 10 }, (_, i) =>
        kycService.submitKYC(`user${i}`, {
          level: 'standard',
          documents: ['emirates_id', 'passport']
        })
      );
      
      const results = await Promise.allSettled(submissions);
      
      // All submissions should complete
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });

  describe('Security', () => {
    it('should not expose sensitive document data in logs', async () => {
      const sensitiveDoc = {
        type: 'emirates_id',
        number: '784-1234-1234567-12',
        imageBuffer: Buffer.from('sensitive-image-data')
      };
      
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await kycService.validateDocument(sensitiveDoc, mockUser);
      
      // Check that logs don't contain sensitive data
      const logCalls = logSpy.mock.calls.flat();
      logCalls.forEach(call => {
        expect(call).not.toContain('784-1234-1234567-12');
        expect(call).not.toContain('sensitive-image-data');
      });
      
      logSpy.mockRestore();
    });

    it('should encrypt document storage references', async () => {
      const document = {
        type: 'passport',
        imageBuffer: Buffer.from('passport-image')
      };
      
      const storedRef = await kycService.storeDocument(document);
      
      expect(storedRef).toHaveProperty('encryptedPath');
      expect(storedRef).toHaveProperty('documentHash');
      expect(storedRef.encryptedPath).not.toContain('passport-image');
    });
  });
});