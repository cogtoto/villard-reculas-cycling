// Correct screenshot capture for v0.5.26 following the app UI flow
import { test } from '@playwright/test';

async function setupRoute(page, route, quality = 'low') {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // Step 1: FTP input
  if (quality === 'high') {
    await page.selectOption('#graphics-quality', 'high');
  } else {
    await page.selectOption('#graphics-quality', 'low');
  }
  await page.click('#ftp-ok');
  await page.waitForTimeout(500);
  
  // Step 2: Mode selection (default = free ride)
  await page.click('#mode-ok');
  await page.waitForTimeout(500);
  
  // Step 3: Route selection
  await page.click(`input[name="route"][value="${route}"]`);
  await page.waitForTimeout(300);
  await page.click('#ride-go');
  await page.waitForTimeout(15000); // Wait for route load
}

test('v0.5.26 normandy-road-low', async ({ page }) => {
  await setupRoute(page, 'normandy', 'low');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(4); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-low.png', fullPage: false });
});

test('v0.5.26 normandy-road-high', async ({ page }) => {
  await setupRoute(page, 'normandy', 'high');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(4); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-high.png', fullPage: false });
});

test('v0.5.26 villard-start-low', async ({ page }) => {
  await setupRoute(page, 'villard', 'low');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(0); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-start-low.png', fullPage: false });
});

test('v0.5.26 villard-hairpins-low', async ({ page }) => {
  await setupRoute(page, 'villard', 'low');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(2.5); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-hairpins-low.png', fullPage: false });
});
