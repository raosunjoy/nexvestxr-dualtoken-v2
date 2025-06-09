/**
 * NexVestXR Platform End-to-End Test Script
 * Run this in browser console to simulate user interactions
 */

class NexVestXRTester {
  constructor() {
    this.currentStep = 0;
    this.testResults = [];
    this.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, message, type });
  }

  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await this.delay(100);
    }
    throw new Error(`Element not found: ${selector}`);
  }

  async clickElement(selector) {
    try {
      const element = await this.waitForElement(selector);
      element.click();
      this.log(`Clicked: ${selector}`, 'success');
      return true;
    } catch (error) {
      this.log(`Failed to click: ${selector} - ${error.message}`, 'error');
      return false;
    }
  }

  async fillInput(selector, value) {
    try {
      const element = await this.waitForElement(selector);
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      this.log(`Filled input: ${selector} with "${value}"`, 'success');
      return true;
    } catch (error) {
      this.log(`Failed to fill: ${selector} - ${error.message}`, 'error');
      return false;
    }
  }

  async testStep1_LandingPage() {
    this.log('=== STEP 1: Testing Landing Page ===');
    
    // Check if we're on the landing page
    const currentUrl = window.location.href;
    this.log(`Current URL: ${currentUrl}`);
    
    // Test hero section
    const heroTitle = document.querySelector('h1');
    if (heroTitle && heroTitle.textContent.includes('NexVestXR')) {
      this.log('✓ Hero title found', 'success');
    } else {
      this.log('✗ Hero title not found', 'error');
    }

    // Test login buttons
    const superAdminBtn = document.querySelector('button:contains("Super Admin")') || 
                         Array.from(document.querySelectorAll('button')).find(btn => 
                           btn.textContent.includes('Super Admin'));
    
    if (superAdminBtn) {
      this.log('✓ Super Admin button found', 'success');
    } else {
      this.log('✗ Super Admin button not found', 'error');
    }

    // Test mobile app section
    const mobileSection = Array.from(document.querySelectorAll('section')).find(section =>
      section.textContent.includes('Mobile App') || section.textContent.includes('App Store'));
    
    if (mobileSection) {
      this.log('✓ Mobile app section found', 'success');
    } else {
      this.log('✗ Mobile app section not found', 'error');
    }

    // Test stats cards
    const statsCards = document.querySelectorAll('.glass-card');
    this.log(`Found ${statsCards.length} glass cards`, 'info');

    await this.delay(1000);
  }

  async testStep2_SuperAdminLogin() {
    this.log('=== STEP 2: Testing Super Admin Login ===');
    
    // Click Super Admin button
    const superAdminBtn = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Super Admin'));
    
    if (superAdminBtn) {
      superAdminBtn.click();
      this.log('✓ Clicked Super Admin button', 'success');
      await this.delay(500);
      
      // Check if modal appeared
      const modal = document.querySelector('[style*="position: fixed"]');
      if (modal) {
        this.log('✓ Login modal appeared', 'success');
        
        // Try to fill in credentials
        await this.delay(500);
        
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        
        if (emailInput && passwordInput) {
          await this.fillInput('input[type="email"]', 'admin@nexvestxr.com');
          await this.fillInput('input[type="password"]', 'admin123');
          
          // Try to submit
          const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Sign In'));
          
          if (submitBtn) {
            this.log('Attempting login...', 'info');
            submitBtn.click();
            await this.delay(2000);
            
            // Check for notifications
            const notifications = document.querySelectorAll('[style*="position: fixed"] > div');
            if (notifications.length > 0) {
              this.log(`Found ${notifications.length} notifications`, 'info');
            }
          }
        }
      } else {
        this.log('✗ Login modal did not appear', 'error');
      }
    } else {
      this.log('✗ Super Admin button not found', 'error');
    }
  }

  async testStep3_OrganizationLogin() {
    this.log('=== STEP 3: Testing Organization Login ===');
    
    // Close any existing modals first
    const closeButtons = document.querySelectorAll('button');
    for (const btn of closeButtons) {
      if (btn.textContent.includes('×')) {
        btn.click();
        await this.delay(300);
        break;
      }
    }
    
    // Click Organization Login button
    const orgLoginBtn = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Organization Login'));
    
    if (orgLoginBtn) {
      orgLoginBtn.click();
      this.log('✓ Clicked Organization Login button', 'success');
      await this.delay(1000);
    } else {
      this.log('✗ Organization Login button not found', 'error');
    }
  }

  async testStep4_FormValidation() {
    this.log('=== STEP 4: Testing Form Validation ===');
    
    // Look for any forms on the page
    const forms = document.querySelectorAll('form');
    this.log(`Found ${forms.length} forms`, 'info');
    
    // Test input validation
    const inputs = document.querySelectorAll('input[required]');
    const textareas = document.querySelectorAll('textarea[required]');
    
    this.log(`Found ${inputs.length} required inputs and ${textareas.length} required textareas`, 'info');
    
    // Try submitting empty form to test validation
    if (forms.length > 0) {
      const submitButtons = document.querySelectorAll('button[type="submit"]');
      if (submitButtons.length > 0) {
        this.log('Testing form validation by submitting empty form...', 'info');
        submitButtons[0].click();
        await this.delay(1000);
        
        // Check for validation messages
        const validationMessages = document.querySelectorAll('.validation-message, [class*="error"]');
        this.log(`Found ${validationMessages.length} validation messages`, 'info');
      }
    }
  }

  async testStep5_ResponsiveDesign() {
    this.log('=== STEP 5: Testing Responsive Design ===');
    
    const originalWidth = window.innerWidth;
    
    // Test mobile view
    window.resizeTo(375, 667);
    await this.delay(500);
    this.log(`Resized to mobile: ${window.innerWidth}x${window.innerHeight}`, 'info');
    
    // Test tablet view
    window.resizeTo(768, 1024);
    await this.delay(500);
    this.log(`Resized to tablet: ${window.innerWidth}x${window.innerHeight}`, 'info');
    
    // Restore original size
    window.resizeTo(originalWidth, window.innerHeight);
    await this.delay(500);
    this.log(`Restored to desktop: ${window.innerWidth}x${window.innerHeight}`, 'info');
  }

  async testStep6_Notifications() {
    this.log('=== STEP 6: Testing Notification System ===');
    
    // Try to trigger notifications by clicking mobile app links
    const appStoreLinks = Array.from(document.querySelectorAll('a')).filter(link => 
      link.textContent.includes('App Store') || link.textContent.includes('Google Play'));
    
    if (appStoreLinks.length > 0) {
      this.log(`Found ${appStoreLinks.length} app store links`, 'info');
      
      // Click first app store link to trigger notification
      appStoreLinks[0].click();
      await this.delay(1000);
      
      // Check for notifications
      const notifications = document.querySelectorAll('[style*="position: fixed"]');
      this.log(`Active notifications: ${notifications.length}`, 'info');
    }
  }

  async runAllTests() {
    this.log('🚀 Starting NexVestXR Platform Tests', 'info');
    
    try {
      await this.testStep1_LandingPage();
      await this.testStep2_SuperAdminLogin();
      await this.testStep3_OrganizationLogin();
      await this.testStep4_FormValidation();
      await this.testStep5_ResponsiveDesign();
      await this.testStep6_Notifications();
      
      this.log('✅ All tests completed!', 'success');
      this.generateReport();
      
    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'error');
    }
  }

  generateReport() {
    const successCount = this.testResults.filter(r => r.type === 'success').length;
    const errorCount = this.testResults.filter(r => r.type === 'error').length;
    const totalTests = successCount + errorCount;
    
    console.log('\n=== TEST REPORT ===');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n=== DETAILED RESULTS ===');
    this.testResults.forEach(result => {
      const icon = result.type === 'success' ? '✅' : result.type === 'error' ? '❌' : 'ℹ️';
      console.log(`${icon} ${result.message}`);
    });
  }
}

// Usage Instructions:
console.log(`
🧪 NexVestXR Test Suite Ready!

To run tests, execute:
const tester = new NexVestXRTester();
tester.runAllTests();

Or run individual tests:
tester.testStep1_LandingPage();
tester.testStep2_SuperAdminLogin();
// etc.
`);

// Auto-run tests (comment out if you want manual control)
// const tester = new NexVestXRTester();
// tester.runAllTests();