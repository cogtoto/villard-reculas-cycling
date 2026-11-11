import { test } from '@playwright/test';

test.describe('v0.5.21 Phase A Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Villard Low - Start', async ({ page }) => {
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
    
    await page.waitForTimeout(7000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.21-villard-low-start.png',
      fullPage: false
    });
  });

  test('Villard Low - Mid-climb hairpins (km 8)', async ({ page }) => {
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
    
    await page.waitForTimeout(7000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(8);
    });
    
    await page.waitForTimeout(1500);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.21-villard-low-midclimb.png',
      fullPage: false
    });
  });

  test('Villard High - Valley view (km 6)', async ({ page }) => {
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
    
    await page.waitForTimeout(7000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(6);
    });
    
    await page.waitForTimeout(1500);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.21-villard-high-valley.png',
      fullPage: false
    });
  });

  test('Villard Low - Village with chalets (start, facing village)', async ({ page }) => {
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
    
    await page.waitForTimeout(7000);
    
    // Teleport to km 0.5 to see village chalets
    await page.evaluate(() => {
      window.veloTeleportKm(0.5);
    });
    
    await page.waitForTimeout(1500);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.21-villard-low-village.png',
      fullPage: false
    });
  });

  test('Normandy Low - Village with houses', async ({ page }) => {
    await page.fill('#ftp-input', '160');
    await page.selectOption('#graphics-quality', 'low');
    await page.click('#ftp-ok');
    
    await page.waitForSelector('#mode-step', { state: 'visible' });
    await page.click('input[name="mode"][value="free"]');
    await page.click('#mode-ok');
    
    await page.waitForSelector('#route-step', { state: 'visible' });
    await page.click('input[name="route"][value="normandy"]');
    await page.click('#ride-go');
    
    await page.waitForFunction(() => {
      const watts = document.getElementById('watts');
      return watts && watts.textContent !== '—';
    }, { timeout: 10000 });
    
    await page.waitForTimeout(7000);
    
    // Teleport to km 25 for village
    await page.evaluate(() => {
      window.veloTeleportKm(25);
    });
    
    await page.waitForTimeout(1500);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.21-normandy-low-village.png',
      fullPage: false
    });
  });
});
