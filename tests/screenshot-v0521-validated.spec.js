import { test, expect } from '@playwright/test';
import fs from 'fs';
import { PNG } from 'pngjs';

// Helper function to validate screenshot has terrain visible
async function validateTerrainVisible(screenshotPath, testName) {
  const png = PNG.sync.read(fs.readFileSync(screenshotPath));
  const width = png.width;
  const height = png.height;
  
  // Sample centre-bottom quarter
  const startY = Math.floor(height * 0.5);
  const endY = height;
  const startX = Math.floor(width * 0.25);
  const endX = Math.floor(width * 0.75);
  
  let totalPixels = 0;
  let skyOrBlackPixels = 0;
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (width * y + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      
      totalPixels++;
      
      // Sky color check (light blue/white washed out)
      const isSky = (r > 200 && g > 200 && b > 220);
      
      // Near-black check (camera inside terrain or void)
      const isBlack = (r < 30 && g < 30 && b < 30);
      
      if (isSky || isBlack) {
        skyOrBlackPixels++;
      }
    }
  }
  
  const percentBad = (skyOrBlackPixels / totalPixels) * 100;
  console.log(`${testName}: ${percentBad.toFixed(1)}% sky/black pixels in centre-bottom quarter`);
  
  expect(percentBad).toBeLessThan(50); // Fail if > 50% is void/black
}

test.describe('v0.5.21 Screenshots (Validated)', () => {
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
    
    const path = '/opt/cursor/artifacts/v0.5.21-villard-low-start.png';
    await page.screenshot({ path, fullPage: false });
    
    // Validate terrain is visible
    await validateTerrainVisible(path, 'Low Start');
  });

  test('Villard Low Quality - km 4', async ({ page }) => {
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
      window.veloTeleportKm(4);
    });
    
    await page.waitForTimeout(1000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    const path = '/opt/cursor/artifacts/v0.5.21-villard-low-km4.png';
    await page.screenshot({ path, fullPage: false });
    
    await validateTerrainVisible(path, 'Low km 4');
  });

  test('Villard Low Quality - km 8 hairpins', async ({ page }) => {
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
    
    const path = '/opt/cursor/artifacts/v0.5.21-villard-low-km8.png';
    await page.screenshot({ path, fullPage: false });
    
    await validateTerrainVisible(path, 'Low km 8');
  });

  test('Villard Low Quality - km 15', async ({ page }) => {
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
      window.veloTeleportKm(15);
    });
    
    await page.waitForTimeout(1000);
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    const path = '/opt/cursor/artifacts/v0.5.21-villard-low-km15.png';
    await page.screenshot({ path, fullPage: false });
    
    await validateTerrainVisible(path, 'Low km 15');
  });
});
