/**
 * NexVestXR API Endpoints Test Script
 * Tests all backend API endpoints for availability and response
 */

class APITester {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.results = [];
  }

  async testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const responseData = await response.text();
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      const result = {
        endpoint,
        method,
        status: response.status,
        success: response.status === expectedStatus || (response.status >= 200 && response.status < 300),
        data: parsedData,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      
      const statusIcon = result.success ? '✅' : '❌';
      console.log(`${statusIcon} ${method} ${endpoint} - Status: ${response.status}`);
      
      return result;
      
    } catch (error) {
      const result = {
        endpoint,
        method,
        status: 'ERROR',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
      
      return result;
    }
  }

  async testAllEndpoints() {
    console.log('🔍 Testing NexVestXR API Endpoints...\n');

    // Test Health Check
    console.log('=== Health Check ===');
    await this.testEndpoint('GET', '/api/health');
    await this.testEndpoint('GET', '/');

    // Test Authentication Endpoints
    console.log('\n=== Authentication Endpoints ===');
    await this.testEndpoint('POST', '/api/auth/login', {
      email: 'admin@nexvestxr.com',
      password: 'admin123',
      userType: 'superadmin'
    });

    await this.testEndpoint('POST', '/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    await this.testEndpoint('POST', '/api/auth/logout');

    // Test Organization Endpoints
    console.log('\n=== Organization Endpoints ===');
    await this.testEndpoint('GET', '/api/organizations');
    
    await this.testEndpoint('POST', '/api/organizations', {
      name: 'Test Organization',
      adminEmail: 'admin@testorg.com'
    });

    await this.testEndpoint('GET', '/api/organizations/test-org-id/kyc-status');
    
    await this.testEndpoint('POST', '/api/organizations/test-org-id/kyc-status', {
      status: 'approved'
    });

    // Test Property Endpoints
    console.log('\n=== Property Endpoints ===');
    await this.testEndpoint('GET', '/api/properties');
    
    await this.testEndpoint('POST', '/api/properties', {
      name: 'Test Property',
      location: 'Test City',
      description: 'Test Description'
    });

    await this.testEndpoint('GET', '/api/properties/test-property-id');
    await this.testEndpoint('GET', '/api/properties/test-property-id/progress');
    
    await this.testEndpoint('POST', '/api/properties/test-property-id/progress-update', {
      status: 'In Progress',
      updates: 'Construction started'
    });

    // Test Trading/Token Endpoints
    console.log('\n=== Trading/Token Endpoints ===');
    await this.testEndpoint('POST', '/api/properties/test-property-id/mint-tokens', {
      amount: 1000
    });

    await this.testEndpoint('GET', '/api/trading/orders');
    
    await this.testEndpoint('POST', '/api/trading/orders', {
      propertyId: 'test-property-id',
      type: 'buy',
      amount: 10,
      price: 100
    });

    // Test Payment Endpoints
    console.log('\n=== Payment Endpoints ===');
    await this.testEndpoint('GET', '/api/payments/methods');
    await this.testEndpoint('GET', '/api/payments/history');

    // Test Support Endpoints
    console.log('\n=== Support Endpoints ===');
    await this.testEndpoint('GET', '/api/support/tickets');
    
    await this.testEndpoint('POST', '/api/support/tickets', {
      subject: 'Test Ticket',
      message: 'Test support message'
    });

    // Test Analytics Endpoints
    console.log('\n=== Analytics Endpoints ===');
    await this.testEndpoint('GET', '/api/analytics/dashboard');
    await this.testEndpoint('GET', '/api/analytics/user-metrics');
    await this.testEndpoint('GET', '/api/analytics/property-metrics');

    // Test XUMM Integration
    console.log('\n=== XUMM Integration ===');
    await this.testEndpoint('POST', '/api/xumm/create-payment', {
      amount: 100,
      destination: 'test-wallet-address'
    });

    await this.testEndpoint('GET', '/api/xumm/payment-status/test-payment-id');

    // Test Flare Network Integration
    console.log('\n=== Flare Network Integration ===');
    await this.testEndpoint('GET', '/api/flare/contract-status');
    await this.testEndpoint('GET', '/api/flare/property-tokens/test-property-id');

    // Test File Upload (requires different handling)
    console.log('\n=== File Upload Test ===');
    await this.testFileUpload();

    this.generateReport();
  }

  async testFileUpload() {
    try {
      // Create a small test file blob
      const testFile = new Blob(['test file content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('documents', testFile, 'test-document.txt');

      const response = await fetch(`${this.baseURL}/api/organizations/test-org-id/verify`, {
        method: 'POST',
        body: formData
      });

      const result = {
        endpoint: '/api/organizations/*/verify',
        method: 'POST',
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      
      const statusIcon = result.success ? '✅' : '❌';
      console.log(`${statusIcon} POST /api/organizations/*/verify - Status: ${response.status}`);
      
    } catch (error) {
      console.log(`❌ POST /api/organizations/*/verify - Error: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 API ENDPOINT TEST REPORT');
    console.log('='.repeat(50));

    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const errorCount = this.results.filter(r => r.status === 'ERROR').length;

    console.log(`\nSUMMARY:`);
    console.log(`Total Endpoints Tested: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Network Errors: ${errorCount}`);
    console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);

    console.log(`\nFAILED ENDPOINTS:`);
    this.results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`❌ ${r.method} ${r.endpoint} - Status: ${r.status}${r.error ? ` (${r.error})` : ''}`);
      });

    console.log(`\nAVAILABLE ENDPOINTS:`);
    this.results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`✅ ${r.method} ${r.endpoint} - Status: ${r.status}`);
      });

    // Check for common issues
    console.log(`\nCOMMON ISSUES DETECTED:`);
    
    const corsErrors = this.results.filter(r => r.error && r.error.includes('CORS'));
    if (corsErrors.length > 0) {
      console.log(`⚠️  CORS Issues: ${corsErrors.length} endpoints blocked by CORS policy`);
    }

    const networkErrors = this.results.filter(r => r.error && (r.error.includes('fetch') || r.error.includes('network')));
    if (networkErrors.length > 0) {
      console.log(`⚠️  Network Issues: ${networkErrors.length} endpoints unreachable`);
    }

    const authErrors = this.results.filter(r => r.status === 401);
    if (authErrors.length > 0) {
      console.log(`⚠️  Authentication Issues: ${authErrors.length} endpoints require authentication`);
    }

    const notFoundErrors = this.results.filter(r => r.status === 404);
    if (notFoundErrors.length > 0) {
      console.log(`⚠️  Missing Endpoints: ${notFoundErrors.length} endpoints not implemented`);
    }

    console.log('\n🔍 Run this script in browser console while on http://localhost:3000');
    console.log('📋 Full results available in: tester.results');
  }
}

// Usage Instructions
console.log(`
🔗 NexVestXR API Test Suite

To run all endpoint tests:
const tester = new APITester();
tester.testAllEndpoints();

To test specific endpoint:
tester.testEndpoint('GET', '/api/properties');

To view results:
tester.results
`);

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APITester;
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
  window.APITester = APITester;
}