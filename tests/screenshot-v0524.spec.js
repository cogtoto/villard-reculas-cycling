import { test } from '@playwright/test';

test.describe('v0.5.24 Screenshots (Deep blue sky, shadows, realistic trees)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Villard - Start (Low quality)', async ({ page }) => {
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
      path: '/opt/cursor/artifacts/v0.5.24-villard-start-low.png',
      fullPage: false
    });
  });

  test('Villard - Hairpins (km 8, Low)', async ({ page }) => {
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
      path: '/opt/cursor/artifacts/v0.5.24-villard-hairpins-low.png',
      fullPage: false
    });
  });

  test('Villard - km 11 village (Low)', async ({ page }) => {
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
      window.veloTeleportKm(11);
    });
    
    await page.waitForTimeout(2000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.24-villard-km11-low.png',
      fullPage: false
    });
  });

  test('Normandy - Road with trees (km 5, Low)', async ({ page }) => {
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
    
    await page.waitForTimeout(8000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(5);
    });
    
    await page.waitForTimeout(2000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.24-normandy-road-low.png',
      fullPage: false
    });
  });

  test('Normandy - Village (km 10, Low)', async ({ page }) => {
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
    
    await page.waitForTimeout(8000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(10);
    });
    
    await page.waitForTimeout(2000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.24-normandy-village-low.png',
      fullPage: false
    });
  });

  test('Normandy - Road with trees (km 5, High quality)', async ({ page }) => {
    await page.fill('#ftp-input', '160');
    await page.selectOption('#graphics-quality', 'high');
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
    
    await page.waitForTimeout(8000);
    
    await page.evaluate(() => {
      window.veloTeleportKm(5);
    });
    
    await page.waitForTimeout(2000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.24-normandy-road-high.png',
      fullPage: false
    });
  });
});
