
import { test, expect } from '@playwright/test';

test.describe('Persona Position Management', () => {
  test('admin can change persona position and see reordering', async ({ page }) => {
    // Navigate to login and sign in as admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'atrompiz1@gmail.com');
    await page.fill('input[type="password"]', 'password123'); // Replace with actual password
    await page.click('button[type="submit"]');

    // Navigate to admin panel
    await page.goto('/admin');
    await page.click('text=Personas Management');

    // Wait for personas to load
    await page.waitForSelector('[data-testid="persona-card"]', { timeout: 10000 });

    // Get the first persona card
    const firstPersonaCard = page.locator('[data-testid="persona-card"]').first();
    const firstPersonaName = await firstPersonaCard.locator('input[id*="name-"]').inputValue();

    // Change position to 99
    const positionInput = firstPersonaCard.locator('input[id*="position-"]');
    await positionInput.fill('99');

    // Wait for save indication (success checkmark)
    await expect(firstPersonaCard.locator('svg.text-green-500')).toBeVisible({ timeout: 5000 });

    // Reload page to verify persistence
    await page.reload();
    await page.waitForSelector('[data-testid="persona-card"]', { timeout: 10000 });

    // Check that the persona is now at the end (last position)
    const allPersonaCards = page.locator('[data-testid="persona-card"]');
    const lastPersonaCard = allPersonaCards.last();
    const lastPersonaName = await lastPersonaCard.locator('input[id*="name-"]').inputValue();

    expect(lastPersonaName).toBe(firstPersonaName);
  });

  test('personas display in correct order by position', async ({ page }) => {
    // Navigate to admin panel
    await page.goto('/admin/personas');

    // Wait for personas to load
    await page.waitForSelector('[data-testid="persona-card"]', { timeout: 10000 });

    // Get all position values
    const positionInputs = page.locator('input[id*="position-"]');
    const positions = await positionInputs.evaluateAll(inputs => 
      inputs.map(input => parseInt((input as HTMLInputElement).value))
    );

    // Verify positions are in ascending order
    const sortedPositions = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sortedPositions);
  });

  test('persona cards display as squares', async ({ page }) => {
    await page.goto('/admin/personas');
    
    // Wait for personas to load
    await page.waitForSelector('[data-testid="persona-card"]', { timeout: 10000 });

    // Check that persona images have square aspect ratio
    const personaImage = page.locator('[data-testid="persona-card"] img').first();
    
    // Verify the image has aspect-square class
    await expect(personaImage).toHaveClass(/aspect-square/);
    await expect(personaImage).toHaveClass(/object-cover/);
  });
});
