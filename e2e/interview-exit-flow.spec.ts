import { test, expect } from '@playwright/test';

test.describe('Interview Exit Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        })
      });
    });

    // Navigate to interview page
    await page.goto('/interview');
  });

  test('should stop TTS immediately when exit button is pressed', async ({ page }) => {
    // Wait for interview to start
    await page.waitForSelector('[data-testid="officer-image"]');
    
    // Click exit button
    await page.click('[data-testid="exit-button"]');
    
    // Check if audio element is paused
    const audioElement = await page.locator('#tts-audio').first();
    if (await audioElement.count() > 0) {
      const isPaused = await audioElement.evaluate((audio: HTMLAudioElement) => audio.paused);
      expect(isPaused).toBe(true);
    }
    
    // Verify session end dialog appears
    await expect(page.locator('[data-testid="session-end-dialog"]')).toBeVisible();
  });

  test('should show session duration based on first TTS start', async ({ page }) => {
    // Wait for interview to start and first TTS to play
    await page.waitForSelector('[data-testid="officer-image"]');
    await page.waitForTimeout(2000); // Wait for first TTS
    
    // Click exit button
    await page.click('[data-testid="exit-button"]');
    
    // Check that session duration is displayed and > 0
    const durationText = await page.locator('[data-testid="session-duration"]').textContent();
    expect(durationText).toMatch(/\d+[ms]/); // Should show time format
  });

  test('should show generating feedback modal and then feedback popup', async ({ page }) => {
    // Start interview and exit
    await page.waitForSelector('[data-testid="officer-image"]');
    await page.click('[data-testid="exit-button"]');
    
    // Click feedback button
    await page.click('button:has-text("Get my session feedback")');
    
    // Should show generating feedback modal
    await expect(page.locator('text=Generating Feedback...')).toBeVisible();
    await expect(page.locator('[data-testid="loader-icon"]')).toBeVisible();
    
    // Click OK button
    await page.click('button:has-text("OK")');
    
    // Should show feedback popup (mock feedback)
    await expect(page.locator('text=How did we do?')).toBeVisible();
  });
});