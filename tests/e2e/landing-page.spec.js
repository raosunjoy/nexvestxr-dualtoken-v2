import { test, expect } from '@playwright/test';

/**
 * NexVestXR Landing Page E2E Tests
 * Tests the complete landing page functionality including our custom test suite
 */

test.describe('NexVestXR Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should display hero section with NexVestXR branding', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h1')).toContainText('NexVestXR');
    
    // Check for hero stats
    await expect(page.locator('text=$3.7T')).toBeVisible();
    await expect(page.locator('text=40%')).toBeVisible();
    await expect(page.locator('text=$100')).toBeVisible();
    await expect(page.locator('text=24/7')).toBeVisible();
  });

  test('should show login buttons and open modals', async ({ page }) => {
    // Test Super Admin login button
    await page.click('button:has-text("Super Admin")');
    await expect(page.locator('text=Super Admin Login')).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("×")');
    
    // Test Organization login button
    await page.click('button:has-text("Organization Login")');
    await expect(page.locator('text=Organization Login')).toBeVisible();
  });

  test('should validate login form inputs', async ({ page }) => {
    // Open Super Admin login
    await page.click('button:has-text("Super Admin")');
    
    // Try to submit empty form
    await page.click('button:has-text("Sign In")');
    
    // Should show validation message
    await expect(page.locator('text=Please enter both email and password')).toBeVisible();
    
    // Fill in invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button:has-text("Sign In")');
    
    // Should show validation for invalid email format
    await expect(page.locator('input[type="email"]:invalid')).toBeVisible();
  });

  test('should display all main sections', async ({ page }) => {
    // Check problem section
    await expect(page.locator('text=The Problem with Traditional Real Estate')).toBeVisible();
    
    // Check solution section  
    await expect(page.locator('text=Our Solution: The Future of Real Estate Investment')).toBeVisible();
    
    // Check technology section
    await expect(page.locator('text=Enterprise-Grade Technology Stack')).toBeVisible();
    
    // Check mobile app section
    await expect(page.locator('text=Get the NexVestXR Mobile App')).toBeVisible();
  });

  test('should handle mobile app download links', async ({ page }) => {
    // Click App Store link
    await page.click('text=App Store');
    
    // Should show notification about coming soon
    await expect(page.locator('text=iOS app will be available on the App Store soon')).toBeVisible();
    
    // Click Google Play link
    await page.click('text=Google Play');
    
    // Should show notification about coming soon
    await expect(page.locator('text=Android app will be available on Google Play soon')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that content is still visible and accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Super Admin")')).toBeVisible();
    
    // Test mobile navigation
    await page.click('button:has-text("Super Admin")');
    await expect(page.locator('text=Super Admin Login')).toBeVisible();
  });

  test('should run our custom test suite via browser console', async ({ page }) => {
    // Inject our test script into the page
    const testScript = await page.evaluate(() => {
      // Simulate running our NexVestXRTester
      return new Promise((resolve) => {
        console.log('🧪 Running NexVestXR Test Suite...');
        
        // Check if landing page components exist
        const heroTitle = document.querySelector('h1');
        const loginButtons = document.querySelectorAll('button');
        const glassCards = document.querySelectorAll('.glass-card');
        
        const results = {
          heroFound: heroTitle && heroTitle.textContent.includes('NexVestXR'),
          loginButtonsFound: Array.from(loginButtons).some(btn => btn.textContent.includes('Super Admin')),
          glassCardsFound: glassCards.length > 0
        };
        
        console.log('Test Results:', results);
        resolve(results);
      });
    });
    
    // Verify test results
    expect(testScript.heroFound).toBe(true);
    expect(testScript.loginButtonsFound).toBe(true);
    expect(testScript.glassCardsFound).toBe(true);
  });

  test('should have proper accessibility features', async ({ page }) => {
    // Check for proper heading hierarchy
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2')).toBeVisible();
    
    // Check for alt text on icons/images (if any)
    const images = await page.locator('img').count();
    if (images > 0) {
      await expect(page.locator('img').first()).toHaveAttribute('alt');
    }
    
    // Check for proper form labels
    await page.click('button:has-text("Super Admin")');
    await expect(page.locator('label:has-text("Email Address")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Reload page to catch any console errors
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should have no critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('extension') &&
      !error.includes('DevTools')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});