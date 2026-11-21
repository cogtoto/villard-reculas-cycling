import { test, expect } from '@playwright/test';

test.describe('v0.5.15 Screenshot Comparison (with Real Terrain)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Villard-Reculas Medium Quality (Real Terrain)', async ({ page }) => {
    await page.fill('#ftp-input', '200');
    await page.selectOption('#graphics-quality', 'medium');
    await page.click('#ftp-ok');
    
    await page.waitForSelector('#mode-step', { state: 'visible' });
    await page.click('input[name="mode"][value="free"]');
    await page.click('#mode-ok');
    
    await page.waitForSelector('#route-step', { state: 'visible' });
    await page.click('input[name="route"][value="villard"]');
    await page.click('#ride-go');
    
    await page.waitForFunction(() => {
      const watts = document.getElementById('watts');
      return watts && watts.textContent !== '—';
    }, { timeout: 10000 });
    
    // Wait longer for real terrain to load
    await page.waitForTimeout(5000);
    
    await page.keyboard.press('f');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.15-villard-medium-terrain.png',
      fullPage: false
    });
  });

  test('Villard-Reculas High Quality (Real Terrain)', async ({ page }) => {
    await page.fill('#ftp-input', '200');
    await page.selectOption('#graphics-quality', 'high');
    await page.click('#ftp-ok');
    
    await page.waitForSelector('#mode-step', { state: 'visible' });
    await page.click('input[name="mode"][value="free"]');
    await page.click('#mode-ok');
    
    await page.waitForSelector('#route-step', { state: 'visible' });
    await page.click('input[name="route"][value="villard"]');
    await page.click('#ride-go');
    
    await page.waitForFunction(() => {
      const watts = document.getElementById('watts');
      return watts && watts.textContent !== '—';
    }, { timeout: 10000 });
    
    await page.waitForTimeout(5000);
    await page.keyboard.press('f');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.15-villard-high-terrain.png',
      fullPage: false
    });
  });
});
