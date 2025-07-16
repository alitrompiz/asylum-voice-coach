import { test, expect } from '@playwright/test';

test.describe('AsylumPrep Auth Flow', () => {
  test('complete auth flow: signup, verify, login, delete account', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'password123';

    // Navigate to signup page
    await page.goto('/auth/signup');
    
    // Fill signup form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Submit signup form
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Navigate to verify page (simulating email verification)
    await page.goto('/auth/verify');
    
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Fill login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to settings
    await page.goto('/settings');
    
    // Find and click delete account button
    await page.click('button:has-text("Delete My Data")');
    
    // Confirm deletion in alert dialog
    await page.click('button:has-text("Yes, delete everything")');
    
    // Should show success message and redirect to home
    await expect(page.locator('text=Account deleted successfully')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('login form validation', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Test password validation
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('signup form validation', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Test password validation
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    
    // Test password confirmation
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password456');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords don\'t match')).toBeVisible();
  });

  test('forgot password form validation', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('navigation between auth pages', async ({ page }) => {
    // Start at login page
    await page.goto('/auth/login');
    
    // Navigate to signup
    await page.click('text=Sign up');
    await expect(page).toHaveURL('/auth/signup');
    
    // Navigate back to login
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/auth/login');
    
    // Navigate to forgot password
    await page.click('text=Forgot your password?');
    await expect(page).toHaveURL('/auth/forgot-password');
    
    // Navigate back to login
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/auth/login');
  });

  test('protected route redirects to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/auth/login');
  });

  test('loading states', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Mock slow network response
    await page.route('https://*/auth/v1/token**', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('text=Signing in...')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});