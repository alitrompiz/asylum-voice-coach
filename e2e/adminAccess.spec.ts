import { test, expect } from '@playwright/test';

test.describe('Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
  });

  test('should navigate from footer link to admin code page', async ({ page }) => {
    await page.goto('/');
    
    // Click the Admin Login link in footer
    await page.click('text=Admin Login');
    
    // Should be on admin-login page
    await expect(page).toHaveURL('/admin-login');
    await expect(page.locator('text=Admin Access')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error for incorrect access code', async ({ page }) => {
    await page.goto('/admin-login');
    
    // Enter incorrect code
    await page.fill('input[type="password"]', 'wrongcode');
    await page.click('button:has-text("Submit")');
    
    // Should show error message
    await expect(page.locator('text=Incorrect code')).toBeVisible();
    
    // Should still be on admin-login page
    await expect(page).toHaveURL('/admin-login');
  });

  test('should redirect to admin panel with correct access code', async ({ page }) => {
    await page.goto('/admin-login');
    
    // Enter correct code
    await page.fill('input[type="password"]', '18433540');
    await page.click('button:has-text("Submit")');
    
    // Should navigate to admin panel
    await expect(page).toHaveURL('/admin');
    
    // Should see admin sidebar
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    
    // Check that localStorage was set
    const isUnlocked = await page.evaluate(() => localStorage.getItem('isAdminUnlocked'));
    expect(isUnlocked).toBe('true');
  });

  test('should handle Enter key submission', async ({ page }) => {
    await page.goto('/admin-login');
    
    // Enter correct code and press Enter
    await page.fill('input[type="password"]', '18433540');
    await page.press('input[type="password"]', 'Enter');
    
    // Should navigate to admin panel
    await expect(page).toHaveURL('/admin');
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/admin-login');
    
    // Click back to home link
    await page.click('text=Back to Home');
    
    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should redirect to admin-login when accessing admin without unlock', async ({ page }) => {
    // Try to access admin directly without code
    await page.goto('/admin');
    
    // Should be redirected to admin-login
    await expect(page).toHaveURL('/admin-login');
  });

  test('should allow access to admin when localStorage is set', async ({ page }) => {
    // Set localStorage to simulate unlocked state
    await page.evaluate(() => localStorage.setItem('isAdminUnlocked', 'true'));
    
    // Navigate to admin
    await page.goto('/admin');
    
    // Should stay on admin page
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });
});