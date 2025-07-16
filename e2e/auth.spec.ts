import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/auth/login');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should navigate to register page', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/auth/register');
    await expect(page.locator('h1')).toContainText('Create Account');
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('button[type="submit"]');
    
    // Check for HTML5 validation messages
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should show validation errors for empty register form', async ({ page }) => {
    await page.goto('/auth/register');
    await page.click('button[type="submit"]');
    
    // Check for HTML5 validation messages
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');
    
    const passwordInputs = page.locator('input[type="password"]');
    await expect(passwordInputs.first()).toHaveAttribute('required');
    await expect(passwordInputs.nth(1)).toHaveAttribute('required');
  });

  test('should navigate between auth pages', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login');
    
    // Go to register
    await page.click('text=Sign up');
    await expect(page).toHaveURL('/auth/register');
    
    // Go back to login
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/auth/login');
    
    // Go to forgot password
    await page.click('text=Forgot password?');
    await expect(page).toHaveURL('/auth/forgot-password');
    
    // Go back to login
    await page.click('text=Back to login');
    await expect(page).toHaveURL('/auth/login');
  });

  test('should show loading state on login submit', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Mock slow response
    await page.route('**/auth/v1/token**', async route => {
      await page.waitForTimeout(1000);
      await route.continue();
    });
    
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('text=Signing in...')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should show loading state on register submit', async ({ page }) => {
    await page.goto('/auth/register');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[type="password"]:nth-child(2)', 'password123');
    
    // Mock slow response
    await page.route('**/auth/v1/signup**', async route => {
      await page.waitForTimeout(1000);
      await route.continue();
    });
    
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('text=Creating account...')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Mock successful login
    await page.route('**/auth/v1/token**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          access_token: 'fake-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: 'user-id',
            email: 'test@example.com'
          }
        })
      });
    });
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should protect routes when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/settings');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
    
    // Mock successful login
    await page.route('**/auth/v1/token**', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          access_token: 'fake-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: 'user-id',
            email: 'test@example.com'
          }
        })
      });
    });
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should redirect to originally intended page
    await expect(page).toHaveURL('/settings');
  });
});