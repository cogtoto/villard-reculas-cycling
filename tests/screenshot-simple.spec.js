// Simple screenshot capture for v0.5.26 verification
import { test } from '@playwright/test';

test('v0.5.26 normandy-road-low', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  // Select Normandy via console
  await page.evaluate(() => {
    window.selectedRoute = 'normandy';
    // Trigger quality low
    if (window.graphicsSettings) {
      window.graphicsSettings.quality = 'low';
    }
  });
  
  await page.reload();
  await page.waitForTimeout(12000); // Wait for route load
  
  // Teleport to km 4
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(4); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-low.png', fullPage: false });
});

test('v0.5.26 normandy-road-high', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    window.selectedRoute = 'normandy';
    if (window.graphicsSettings) {
      window.graphicsSettings.quality = 'high';
    }
  });
  
  await page.reload();
  await page.waitForTimeout(12000);
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(4); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-high.png', fullPage: false });
});

test('v0.5.26 villard-start-low', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    window.selectedRoute = 'villard';
    if (window.graphicsSettings) {
      window.graphicsSettings.quality = 'low';
    }
  });
  
  await page.reload();
  await page.waitForTimeout(12000);
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(0); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-start-low.png', fullPage: false });
});

test('v0.5.26 villard-hairpins-low', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    window.selectedRoute = 'villard';
    if (window.graphicsSettings) {
      window.graphicsSettings.quality = 'low';
    }
  });
  
  await page.reload();
  await page.waitForTimeout(12000);
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(2.5); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-hairpins-low.png', fullPage: false });
});
