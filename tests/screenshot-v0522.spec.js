import { test } from '@playwright/test';

test.describe('v0.5.22 Screenshots (Real DEM + Procedural Color)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Villard - Start', async ({ page }) => {
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
    
    await page.waitForTimeout(8000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.22-villard-start.png',
      fullPage: false
    });
  });

  test('Villard - Mid-climb hairpins (km 8)', async ({ page }) => {
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
    
    await page.waitForTimeout(8000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(8);
    });
    
    await page.waitForTimeout(2000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.22-villard-midclimb.png',
      fullPage: false
    });
  });

  test('Villard - Valley view (km 6)', async ({ page }) => {
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
    
    await page.waitForTimeout(8000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(6);
    });
    
    await page.waitForTimeout(2000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.22-villard-valley.png',
      fullPage: false
    });
  });

  test('Villard - Village with chalets (km 0.5)', async ({ page }) => {
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
    
    await page.waitForTimeout(8000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(0.5);
    });
    
    await page.waitForTimeout(2000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.22-villard-village.png',
      fullPage: false
    });
  });
});
