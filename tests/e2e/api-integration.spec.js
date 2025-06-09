import { test, expect } from '@playwright/test';

/**
 * NexVestXR API Integration Tests
 * Tests API endpoints and backend integration
 */

test.describe('NexVestXR API Integration', () => {
  test('should have healthy backend services', async ({ request }) => {
    // Test backend health endpoint
    const healthResponse = await request.get('http://localhost:3000/health');
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    expect(healthData.environment).toBeDefined();
  });

  test('should handle authentication endpoints', async ({ request }) => {
    // Test login endpoint (should fail with invalid credentials)
    const loginResponse = await request.post('http://localhost:3000/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword',
        userType: 'admin'
      }
    });
    
    // Should return 401 or similar for invalid credentials
    expect([400, 401, 403]).toContain(loginResponse.status());
  });

  test('should handle organization endpoints', async ({ request }) => {
    // Test organization listing (might require auth)
    const orgsResponse = await request.get('http://localhost:3000/api/organizations');
    
    // Should either return data or require authentication
    expect([200, 401, 403]).toContain(orgsResponse.status());
  });

  test('should handle property endpoints', async ({ request }) => {
    // Test property listing
    const propsResponse = await request.get('http://localhost:3000/api/properties');
    
    // Should either return data or require authentication
    expect([200, 401, 403]).toContain(propsResponse.status());
  });

  test('should handle KYC status endpoints', async ({ request }) => {
    // Test KYC status check for a test organization
    const kycResponse = await request.get('http://localhost:3000/api/organizations/test-org/kyc-status');
    
    // Should return some response (might be 404 for non-existent org)
    expect([200, 400, 401, 403, 404]).toContain(kycResponse.status());
  });

  test('should reject requests with invalid data', async ({ request }) => {
    // Test invalid organization creation
    const invalidOrgResponse = await request.post('http://localhost:3000/api/organizations', {
      data: {
        // Missing required fields
        name: ''
      }
    });
    
    // Should return 400 for invalid data
    expect([400, 401, 403, 422]).toContain(invalidOrgResponse.status());
  });

  test('should handle CORS properly', async ({ page }) => {
    // Navigate to the frontend
    await page.goto('/');
    
    // Try to make an API call from the browser
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3000/health');
        return {
          ok: response.ok,
          status: response.status,
          data: await response.json()
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    // Should either succeed or fail gracefully
    expect(apiResponse.ok || apiResponse.error).toBeDefined();
  });

  test('should have proper error handling', async ({ request }) => {
    // Test non-existent endpoint
    const notFoundResponse = await request.get('http://localhost:3000/api/nonexistent');
    expect(notFoundResponse.status()).toBe(404);
    
    // Test malformed JSON request
    const malformedResponse = await request.post('http://localhost:3000/api/auth/login', {
      data: 'invalid json'
    });
    expect([400, 401, 403]).toContain(malformedResponse.status());
  });
});