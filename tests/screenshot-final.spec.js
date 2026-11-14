// Final screenshot capture for v0.5.26 with proper UI interaction
import { test } from '@playwright/test';

test('v0.5.26 normandy-road-low', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // Click Start ride or select route
  const startBtn = await page.$('button:has-text("Start ride")');
  if (startBtn) await startBtn.click();
  await page.waitForTimeout(500);
  
  // Look for route selection - might be in a dialog
  const normandyBtn = await page.$('button:has-text("Normandy")');
  if (normandyBtn) {
    await normandyBtn.click();
    await page.waitForTimeout(12000); // Wait for route load
    
    // Teleport to km 4
    await page.evaluate(() => { 
      if (window.veloTeleportKm) window.veloTeleportKm(4); 
    });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-low.png', fullPage: false });
  }
});

test('v0.5.26 normandy-road-high', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // Try to set quality to high before route selection
  await page.evaluate(() => {
    if (window.graphicsSettings) {
      window.graphicsSettings.setQuality('high');
    }
  });
  
  const startBtn = await page.$('button:has-text("Start ride")');
  if (startBtn) await startBtn.click();
  await page.waitForTimeout(500);
  
  const normandyBtn = await page.$('button:has-text("Normandy")');
  if (normandyBtn) {
    await normandyBtn.click();
    await page.waitForTimeout(12000);
    
    await page.evaluate(() => { 
      if (window.veloTeleportKm) window.veloTeleportKm(4); 
    });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-high.png', fullPage: false });
  }
});

test('v0.5.26 villard-start-low', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  const startBtn = await page.$('button:has-text("Start ride")');
  if (startBtn) await startBtn.click();
  await page.waitForTimeout(500);
  
  // Select Villard
  const villardBtn = await page.$('button:has-text("Villard")');
  if (villardBtn) {
    await villardBtn.click();
    await page.waitForTimeout(12000);
    
    await page.evaluate(() => { 
      if (window.veloTeleportKm) window.veloTeleportKm(0); 
    });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-start-low.png', fullPage: false });
  }
});

test('v0.5.26 villard-hairpins-low', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  const startBtn = await page.$('button:has-text("Start ride")');
  if (startBtn) await startBtn.click();
  await page.waitForTimeout(500);
  
  const villardBtn = await page.$('button:has-text("Villard")');
  if (villardBtn) {
    await villardBtn.click();
    await page.waitForTimeout(12000);
    
    await page.evaluate(() => { 
      if (window.veloTeleportKm) window.veloTeleportKm(2.5); 
    });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-hairpins-low.png', fullPage: false });
  }
});
