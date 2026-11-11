// Screenshot capture for v0.5.26 verification
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
});

test('v0.5.26 normandy-road-low', async ({ page }) => {
  // Select quality Low
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Quality")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Low")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Settings")');
  
  // Select Normandy route
  await page.click('button:has-text("Select Route")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Normandy")');
  await page.waitForTimeout(8000); // Wait for route load and rendering
  
  // Teleport to km 4 (nice road view)
  await page.evaluate(() => { window.veloTeleportKm(4); });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-low.png' });
});

test('v0.5.26 normandy-road-high', async ({ page }) => {
  // Select quality High
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Quality")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("High")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Settings")');
  
  // Select Normandy route
  await page.click('button:has-text("Select Route")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Normandy")');
  await page.waitForTimeout(8000);
  
  // Teleport to km 4
  await page.evaluate(() => { window.veloTeleportKm(4); });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-normandy-road-high.png' });
});

test('v0.5.26 villard-start-low', async ({ page }) => {
  // Select quality Low
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Quality")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Low")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Settings")');
  
  // Select Villard route
  await page.click('button:has-text("Select Route")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Villard")');
  await page.waitForTimeout(8000);
  
  // Start (km 0)
  await page.evaluate(() => { window.veloTeleportKm(0); });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-start-low.png' });
});

test('v0.5.26 villard-hairpins-low', async ({ page }) => {
  // Select quality Low
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Quality")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Low")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Settings")');
  
  // Select Villard route
  await page.click('button:has-text("Select Route")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Villard")');
  await page.waitForTimeout(8000);
  
  // Hairpins (km 2.5)
  await page.evaluate(() => { window.veloTeleportKm(2.5); });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.26-villard-hairpins-low.png' });
});
