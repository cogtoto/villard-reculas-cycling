import { test, expect } from '@playwright/test';

test.describe('v0.5.14 Screenshot Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Villard-Reculas Low Quality', async ({ page }) => {
    // Set FTP
    await page.fill('#ftp-input', '200');
    
    // Set graphics to Low
    await page.selectOption('#graphics-quality', 'low');
    
    await page.click('#ftp-ok');
    
    // Wait for mode step to appear
    await page.waitForSelector('#mode-step', { state: 'visible' });
    
    // Select free ride mode
    await page.click('input[name="mode"][value="free"]');
    await page.click('#mode-ok');
    
    // Wait for route step
    await page.waitForSelector('#route-step', { state: 'visible' });
    
    // Select Villard route
    await page.click('input[name="route"][value="villard"]');
    await page.click('#ride-go');
    
    // Wait for scene to load (look for watts display)
    await page.waitForFunction(() => {
      const watts = document.getElementById('watts');
      return watts && watts.textContent !== '—';
    }, { timeout: 10000 });
    
    // Wait a bit more for terrain/sky to render
    await page.waitForTimeout(3000);
    
    // Toggle FPS counter on
    await page.keyboard.press('f');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.14-villard-low.png',
      fullPage: false
    });
  });

  test('Villard-Reculas High Quality', async ({ page }) => {
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
    
    await page.waitForTimeout(3000);
    await page.keyboard.press('f');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.14-villard-high.png',
      fullPage: false
    });
  });

  test('Normandy Low Quality', async ({ page }) => {
    await page.fill('#ftp-input', '200');
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
    
    await page.waitForTimeout(3000);
    await page.keyboard.press('f');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.14-normandy-low.png',
      fullPage: false
    });
  });

  test('Normandy High Quality', async ({ page }) => {
    await page.fill('#ftp-input', '200');
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
    
    await page.waitForTimeout(3000);
    await page.keyboard.press('f');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.14-normandy-high.png',
      fullPage: false
    });
  });
  
  test('Measure FPS - Villard Low', async ({ page }) => {
    await page.fill('#ftp-input', '200');
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
    
    // Toggle FPS
    await page.keyboard.press('f');
    
    // Wait for FPS to stabilize (5 seconds of rendering)
    await page.waitForTimeout(5000);
    
    // Read FPS value
    const fpsText = await page.textContent('div:has-text("FPS:")');
    console.log('Villard Low FPS:', fpsText);
  });
  
  test('Measure FPS - Villard High', async ({ page }) => {
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
    
    await page.keyboard.press('f');
    await page.waitForTimeout(5000);
    
    const fpsText = await page.textContent('div:has-text("FPS:")');
    console.log('Villard High FPS:', fpsText);
  });
});
