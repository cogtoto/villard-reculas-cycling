import { test } from '@playwright/test';

test.describe('v0.5.20 Screenshots (Brighter Lighting)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Villard Low Quality - Start', async ({ page }) => {
    await page.fill('#ftp-input', '160');
    await page.selectOption('#graphics-quality', 'low');
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
    
    await page.waitForTimeout(6000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.20-villard-low-start.png',
      fullPage: false
    });
  });

  test('Villard Low Quality - Mid-climb (km 8 hairpins)', async ({ page }) => {
    await page.fill('#ftp-input', '160');
    await page.selectOption('#graphics-quality', 'low');
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
    
    await page.waitForTimeout(6000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(8);
    });
    
    await page.waitForTimeout(1000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.20-villard-low-midclimb.png',
      fullPage: false
    });
  });

  test('Villard Low Quality - Valley view', async ({ page }) => {
    await page.fill('#ftp-input', '160');
    await page.selectOption('#graphics-quality', 'low');
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
    
    await page.waitForTimeout(6000);
    
    // Teleport to km 6 for valley view
    await page.evaluate(() => {
      window.veloTeleportKm(6);
    });
    
    await page.waitForTimeout(1000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.20-villard-low-valley.png',
      fullPage: false
    });
  });

  test('Villard High Quality - Valley view', async ({ page }) => {
    await page.fill('#ftp-input', '160');
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
    
    await page.waitForTimeout(6000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(6);
    });
    
    await page.waitForTimeout(1000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.20-villard-high-valley.png',
      fullPage: false
    });
  });
});
