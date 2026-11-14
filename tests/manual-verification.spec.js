import { test, expect } from '@playwright/test';

test.describe('Manual Visual Verification', () => {
  
  test('verify timer visible before start - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.waitForTimeout(1000);
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText('00:00');
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-timer-before-start-desktop.png',
      fullPage: false
    });
  });

  test('verify timer during free ride - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.check('input[name="route"][value="villard"]');
    await page.click('#ride-go');
    
    await page.waitForTimeout(8000);
    
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    const timeText = await timer.textContent();
    expect(timeText).toMatch(/^\d{2}:\d{2}$/);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-timer-free-ride-desktop.png',
      fullPage: false
    });
  });

  test('verify timer during free ride - mobile landscape', async ({ page }) => {
    await page.setViewportSize({ width: 854, height: 480 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.check('input[name="route"][value="normandy"]');
    await page.click('#ride-go');
    
    await page.waitForTimeout(8000);
    
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-timer-free-ride-mobile.png',
      fullPage: false
    });
  });

  test('verify FTP Ramp Test with warm-up labels - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="ftp-ramp-test"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#workout-hud')).toBeVisible();
    await expect(page.locator('#workout-name')).toHaveText('FTP Ramp Test');
    await expect(page.locator('#workout-legend')).toBeVisible();
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-ftp-ramp-test-desktop.png',
      fullPage: false
    });
  });

  test('verify Sweet Spot workout with warm-up labels - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#workout-name')).toHaveText('Sweet Spot');
    await expect(page.locator('#workout-legend')).toBeVisible();
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-sweet-spot-desktop.png',
      fullPage: false
    });
  });

  test('verify Explosive Power workout with warm-up labels - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="explosive-power"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#workout-name')).toHaveText('Explosiveness / Power');
    await expect(page.locator('#workout-legend')).toBeVisible();
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-explosive-power-desktop.png',
      fullPage: false
    });
  });

  test('verify workout HUD on mobile landscape', async ({ page }) => {
    await page.setViewportSize({ width: 854, height: 480 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#workout-legend')).toBeVisible();
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-workout-hud-mobile.png',
      fullPage: false
    });
  });

  test('verify FTP 200W changes labels correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '200');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#workout-legend')).toBeVisible();
    const legendText = await page.locator('#workout-legend').textContent();
    
    // Warm-up should be 30-50% FTP for 60-100W at FTP=200
    expect(legendText).toContain('30–50%');
    expect(legendText).toContain('60–100W');
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.9-ftp-200-labels.png',
      fullPage: false
    });
  });
});
