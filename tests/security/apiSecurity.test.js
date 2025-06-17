const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');

describe('API Security Tests', () => {
  let app;
  let secureApp;

  beforeAll(async () => {
    // Setup basic app
    app = express();
    app.use(express.json());
    app.use('/api/uae', require('../../backend/src/routes/uaeRoutes'));
    app.use('/api/auth', require('../../backend/src/routes/authRoutes'));

    // Setup secure app with security middleware
    secureApp = express();
    secureApp.use(helmet());
    secureApp.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }));
    secureApp.use(express.json({ limit: '10mb' }));
    secureApp.use('/api/uae', require('../../backend/src/routes/uaeRoutes'));
    secureApp.use('/api/auth', require('../../backend/src/routes/authRoutes'));

    // Setup test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up test data
    const UAEUser = require('../../backend/src/models/UAEUser');
    const UAEProperty = require('../../backend/src/models/UAEProperty');
    await UAEUser.deleteMany({});
    await UAEProperty.deleteMany({});
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get('/api/uae/properties')
          .query({ zone: payload })
          .expect(200); // Should not crash, just return empty or filtered results

        // Should not contain any SQL-like responses
        expect(JSON.stringify(response.body)).not.toMatch(/DROP|INSERT|DELETE|UPDATE|UNION|SELECT/i);
      }
    });

    it('should reject NoSQL injection attempts', async () => {
      const noSqlPayloads = [
        { $gt: '' },
        { $ne: null },
        { $exists: true },
        { $regex: '.*' },
        { $where: 'this.password' }
      ];

      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: payload
          })
          .expect(400); // Should reject malformed input

        expect(response.body.success).toBe(false);
      }
    });

    it('should sanitize XSS attempts', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .get('/api/uae/properties')
          .query({ search: payload })
          .expect(200);

        // Response should not contain script tags or javascript: 
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toMatch(/<script|javascript:|onerror=|onload=/i);
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user..user@example.com',
        'user@example',
        'user@.com',
        ''
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: email,
            password: 'ValidPass123!',
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should validate UAE phone numbers correctly', async () => {
      const invalidPhones = [
        '+1234567890', // Non-UAE country code
        '+971123', // Too short
        '+9715012345678901', // Too long
        'notanumber',
        '+971-invalid',
        ''
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.ae',
            password: 'ValidPass123!',
            phoneCountryCode: '+971',
            phoneNumber: phone.replace('+971', ''),
            firstName: 'Test',
            lastName: 'User'
          });

        if (phone === '') {
          continue; // Empty might be allowed depending on validation rules
        }

        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should reject oversized payloads', async () => {
      const oversizedData = 'x'.repeat(50 * 1024 * 1024); // 50MB

      const response = await request(app)
        .post('/api/uae/invest')
        .send({
          propertyId: 'test',
          amount: oversizedData,
          currency: 'AED'
        })
        .expect(413); // Payload too large

      expect(response.body).toBeDefined();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without valid JWT tokens', async () => {
      const protectedEndpoints = [
        { method: 'post', path: '/api/uae/invest' },
        { method: 'get', path: '/api/uae/portfolio' },
        { method: 'get', path: '/api/uae/compliance/kyc' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/auth|token/i);
      }
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(app)
        .post('/api/uae/invest')
        .set('Authorization', expiredToken)
        .send({
          propertyId: 'test',
          amount: 50000,
          currency: 'AED'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'Bearer invalid.token.here',
        'Bearer',
        'InvalidBearer token',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Incomplete token
        ''
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/uae/portfolio')
          .set('Authorization', token);

        expect(response.status).toBeGreaterThanOrEqual(401);
      }
    });

    it('should prevent privilege escalation', async () => {
      // Test with regular user token trying to access admin endpoints
      const userToken = 'Bearer user.token.here';

      const adminEndpoints = [
        { method: 'post', path: '/api/admin/users' },
        { method: 'delete', path: '/api/admin/users/123' },
        { method: 'put', path: '/api/admin/properties/123/approve' }
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', userToken);

        expect(response.status).toBeGreaterThanOrEqual(403);
      }
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const requests = Array.from({ length: 20 }, () =>
        request(secureApp)
          .post('/api/auth/login')
          .send({
            email: 'test@example.ae',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on API endpoints', async () => {
      const requests = Array.from({ length: 150 }, () =>
        request(secureApp)
          .get('/api/uae/properties')
      );

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle concurrent requests gracefully', async () => {
      const concurrentRequests = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/uae/properties?limit=1')
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(concurrentRequests);
      const endTime = Date.now();

      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      // Should handle most requests successfully
      expect(successfulResponses.length).toBeGreaterThan(40);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });
  });

  describe('Data Privacy and Exposure', () => {
    it('should not expose sensitive user data in API responses', async () => {
      // Create test user with sensitive data
      const UAEUser = require('../../backend/src/models/UAEUser');
      const testUser = await UAEUser.create({
        email: 'privacy@example.ae',
        password: { hash: 'hashedpassword' },
        profile: { 
          firstName: { en: 'Privacy' }, 
          lastName: { en: 'Test' } 
        },
        location: { country: 'AE', emirate: 'Dubai' },
        kyc: {
          documents: {
            emirates_id: { number: '784-1234-1234567-12' },
            passport: { number: 'A12345678' }
          }
        }
      });

      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .expect(200);

      const responseText = JSON.stringify(response.body);

      // Should not expose sensitive data
      expect(responseText).not.toContain('hashedpassword');
      expect(responseText).not.toContain('784-1234-1234567-12');
      expect(responseText).not.toContain('A12345678');
    });

    it('should not expose database errors', async () => {
      // Force a database error
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/uae/properties')
        .expect(500);

      const responseText = JSON.stringify(response.body);

      // Should not expose internal database details
      expect(responseText).not.toMatch(/mongodb|mongoose|collection|query/i);
      expect(responseText).not.toContain('MongoError');
      expect(responseText).not.toContain('ValidationError');

      // Reconnect for other tests
      await mongoose.connect(process.env.DATABASE_URL);
    });

    it('should not expose stack traces in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/nonexistent/endpoint')
        .expect(404);

      const responseText = JSON.stringify(response.body);

      // Should not expose file paths or stack traces
      expect(responseText).not.toMatch(/\/Users|\/home|C:\\/);
      expect(responseText).not.toContain('at Function');
      expect(responseText).not.toContain('node_modules');

      process.env.NODE_ENV = 'test';
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types for document uploads', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00\x03' }, // Executable
        { name: 'script.js', content: 'alert("xss")' }, // JavaScript
        { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>' }, // PHP shell
        { name: 'huge.jpg', content: 'x'.repeat(50 * 1024 * 1024) } // Oversized file
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/kyc/upload-document')
          .field('documentType', 'passport')
          .attach('document', Buffer.from(file.content), file.name);

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should scan uploaded files for malware patterns', async () => {
      const suspiciousPatterns = [
        Buffer.from('4D5A9000', 'hex'), // PE header
        Buffer.from('%PDF-1.4\n1 0 obj\n<</Type/Catalog/OpenAction<</Type/Action/S/JavaScript/JS(app.alert("XSS"))>>>>'), // Malicious PDF
        Buffer.from('PK\x03\x04'), // ZIP file (could contain malware)
      ];

      for (const pattern of suspiciousPatterns) {
        const response = await request(app)
          .post('/api/kyc/upload-document')
          .field('documentType', 'passport')
          .attach('document', pattern, 'suspicious.pdf');

        // Should either reject or quarantine suspicious files
        if (response.status === 200) {
          expect(response.body.data.quarantined).toBe(true);
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      }
    });
  });

  describe('Session Security', () => {
    it('should use secure session cookies', async () => {
      const response = await request(secureApp)
        .post('/api/auth/login')
        .send({
          email: 'test@example.ae',
          password: 'validpassword'
        });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        cookies.forEach(cookie => {
          expect(cookie).toMatch(/Secure/);
          expect(cookie).toMatch(/HttpOnly/);
          expect(cookie).toMatch(/SameSite/);
        });
      }
    });

    it('should invalidate sessions on logout', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.ae',
          password: 'validpassword'
        });

      const token = loginResponse.body.data?.token;
      if (!token) return; // Skip if login not implemented yet

      // Use session
      await request(app)
        .get('/api/uae/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to use invalidated session
      await request(app)
        .get('/api/uae/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('HTTPS and Transport Security', () => {
    it('should enforce HTTPS in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(secureApp)
        .get('/api/uae/properties')
        .set('X-Forwarded-Proto', 'http'); // Simulate HTTP request

      // Should redirect to HTTPS or reject
      expect([301, 302, 403, 426]).toContain(response.status);

      process.env.NODE_ENV = 'test';
    });

    it('should set security headers', async () => {
      const response = await request(secureApp)
        .get('/api/uae/properties')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('API Versioning and Deprecation', () => {
    it('should handle API version requests securely', async () => {
      const maliciousVersions = [
        '../../../etc/passwd',
        '../../../../windows/system32/config/sam',
        'v1; DROP TABLE users; --',
        'v1<script>alert("xss")</script>'
      ];

      for (const version of maliciousVersions) {
        const response = await request(app)
          .get('/api/uae/properties')
          .set('API-Version', version);

        // Should not crash or expose sensitive information
        expect(response.status).toBeLessThan(500);
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toMatch(/etc\/passwd|system32|script/i);
      }
    });
  });

  describe('Resource Exhaustion Protection', () => {
    it('should limit concurrent connections per IP', async () => {
      const ipAddress = '192.168.1.100';
      const requests = Array.from({ length: 100 }, () =>
        request(secureApp)
          .get('/api/uae/properties')
          .set('X-Forwarded-For', ipAddress)
      );

      const responses = await Promise.allSettled(requests);
      const rejectedRequests = responses.filter(
        result => result.status === 'fulfilled' && result.value.status >= 429
      );

      // Should reject some requests from same IP
      expect(rejectedRequests.length).toBeGreaterThan(0);
    });

    it('should handle memory exhaustion attempts', async () => {
      const largeArray = Array(10000).fill('x'.repeat(1000));

      const response = await request(app)
        .post('/api/uae/invest')
        .send({
          propertyId: 'test',
          amount: 50000,
          currency: 'AED',
          metadata: largeArray
        });

      // Should reject or handle large payloads gracefully
      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe('Logging and Monitoring Security', () => {
    it('should not log sensitive information', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.ae',
          password: 'secretpassword123'
        });

      // Check that password is not logged
      const allLogs = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat();
      allLogs.forEach(log => {
        expect(log).not.toContain('secretpassword123');
      });

      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should log security events appropriately', async () => {
      const logSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Trigger multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.ae',
            password: 'wrongpassword'
          });
      }

      // Should log security events
      expect(logSpy.mock.calls.length).toBeGreaterThan(0);

      logSpy.mockRestore();
    });
  });
});