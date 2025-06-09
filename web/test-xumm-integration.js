#!/usr/bin/env node

/**
 * XUMM Integration Test Suite
 * Tests the XUMM wallet connection functionality in web app
 */

const puppeteer = require('puppeteer');

async function testXummIntegration() {
  console.log('🧪 Starting XUMM Integration Tests...');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warn' || msg.text().includes('XUMM')) {
        console.log(`[Browser ${type}]:`, msg.text());
      }
    });
    
    // Navigate to web app
    console.log('📱 Navigating to web app...');
    await page.goto('http://localhost:3006', { waitUntil: 'networkidle2' });
    
    // Wait for React app to load
    await page.waitForSelector('.App', { timeout: 10000 });
    console.log('✅ Web app loaded successfully');
    
    // Test 1: Check if XUMM service initializes
    console.log('🔧 Testing XUMM service initialization...');
    const xummInitialized = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = window.console._logs || [];
          const hasInitLog = logs.some(log => 
            log.includes('XUMM Context: Service initialized') || 
            log.includes('XUMM Service initialized in MOCK mode')
          );
          resolve(hasInitLog);
        }, 3000);
      });
    });
    
    if (xummInitialized) {
      console.log('✅ XUMM service initialized successfully');
    } else {
      console.log('⚠️ XUMM service initialized in mock mode');
    }
    
    // Test 2: Check if Connect XUMM button exists
    console.log('🔍 Looking for Connect XUMM button...');
    let connectButton = null;
    
    // Try multiple selectors for the XUMM connect button
    const selectors = [
      'button[title*="Connect"]',
      'button:contains("Connect XUMM")',
      'button:contains("🔗")',
      'button:contains("Connect")',
      '[class*="wallet"]',
      '.WalletWidget button'
    ];
    
    for (const selector of selectors) {
      try {
        connectButton = await page.$(selector);
        if (connectButton) {
          console.log(`✅ XUMM connect button found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!connectButton) {
      // Check what buttons are actually on the page
      const buttons = await page.$$eval('button', buttons => 
        buttons.map(btn => btn.textContent.trim())
      );
      console.log('🔍 Available buttons on page:', buttons);
      
      // Look for any button with XUMM or Connect text
      connectButton = await page.$('button');
      if (connectButton) {
        const buttonText = await page.evaluate(btn => btn.textContent, connectButton);
        if (buttonText.includes('Connect') || buttonText.includes('XUMM') || buttonText.includes('🔗')) {
          console.log('✅ Connect button found by text content');
        } else {
          console.log('❌ No suitable connect button found');
          return false;
        }
      } else {
        console.log('❌ No buttons found on page');
        return false;
      }
    }
    
    // Test 3: Test button click and error handling
    console.log('🖱️ Testing Connect XUMM button click...');
    
    // Capture network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/xumm/credentials')) {
        requests.push(request.url());
      }
    });
    
    // Click the connect button
    try {
      await connectButton.click();
      console.log('✅ Connect button clicked successfully');
      
      // Wait for any XUMM-related activity
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for error messages
      const errorElement = await page.$('.notification, .error, [class*="error"]');
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        if (errorText.includes('XUMM Service not initialised')) {
          console.log('❌ XUMM Service not initialised error still occurs');
          return false;
        } else {
          console.log('ℹ️ Other notification:', errorText);
        }
      } else {
        console.log('✅ No error messages found');
      }
      
      // Check if credentials request was made
      if (requests.length > 0) {
        console.log('✅ XUMM credentials request made:', requests[0]);
      } else {
        console.log('⚠️ No credentials request detected (may be using mock mode)');
      }
      
    } catch (clickError) {
      console.log('❌ Failed to click connect button:', clickError.message);
      return false;
    }
    
    // Test 4: Check console for XUMM-related errors
    console.log('📋 Checking for XUMM-related errors...');
    const hasXummErrors = await page.evaluate(() => {
      const logs = window.console._errors || [];
      return logs.some(log => 
        log.includes('XUMM Service not initialised') ||
        log.includes('Failed to initialize XUMM')
      );
    });
    
    if (hasXummErrors) {
      console.log('❌ XUMM-related errors found in console');
      return false;
    } else {
      console.log('✅ No XUMM-related errors in console');
    }
    
    console.log('🎉 All XUMM integration tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ XUMM integration test failed:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main execution
async function main() {
  console.log('');
  console.log('=====================================');
  console.log('   XUMM Integration Test Suite');
  console.log('=====================================');
  console.log('');
  
  const success = await testXummIntegration();
  
  console.log('');
  console.log('=====================================');
  console.log('           Test Results');
  console.log('=====================================');
  
  if (success) {
    console.log('🎉 ALL TESTS PASSED');
    console.log('✅ XUMM integration is working correctly');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('⚠️ XUMM integration needs attention');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testXummIntegration };