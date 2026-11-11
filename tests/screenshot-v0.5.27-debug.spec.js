// v0.5.27 screenshot capture with full console/error logging
import { test } from '@playwright/test';

async function setupRoute(page, route, quality = 'low') {
  const logs = [];
  const errors = [];
  
  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('BROWSER CONSOLE:', text);
  });
  
  // Capture all errors
  page.on('pageerror', err => {
    const msg = `ERROR: ${err.message}\n${err.stack}`;
    errors.push(msg);
    console.error('BROWSER ERROR:', msg);
  });
  
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
  
  // Step 2: Mode selection
  await page.click('#mode-ok');
  await page.waitForTimeout(500);
  
  // Step 3: Route selection
  await page.click(`input[name="route"][value="${route}"]`);
  await page.waitForTimeout(300);
  await page.click('#ride-go');
  await page.waitForTimeout(15000);
  
  return { logs, errors };
}

test('v0.5.27 normandy-road-low', async ({ page }) => {
  const { logs, errors } = await setupRoute(page, 'normandy', 'low');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(4); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.27-normandy-road-low.png', fullPage: false });
  
  console.log('\n=== NORMANDY LOW - Console Logs (last 20) ===');
  logs.slice(-20).forEach(log => console.log(log));
  console.log('\n=== NORMANDY LOW - Errors ===');
  if (errors.length === 0) {
    console.log('No errors');
  } else {
    errors.forEach(err => console.error(err));
  }
});

test('v0.5.27 normandy-road-high', async ({ page }) => {
  const { logs, errors } = await setupRoute(page, 'normandy', 'high');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(4); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.27-normandy-road-high.png', fullPage: false });
  
  console.log('\n=== NORMANDY HIGH - Console Logs (last 20) ===');
  logs.slice(-20).forEach(log => console.log(log));
  console.log('\n=== NORMANDY HIGH - Errors ===');
  if (errors.length === 0) {
    console.log('No errors');
  } else {
    errors.forEach(err => console.error(err));
  }
});

test('v0.5.27 villard-start-low', async ({ page }) => {
  const { logs, errors } = await setupRoute(page, 'villard', 'low');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(0); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.27-villard-start-low.png', fullPage: false });
  
  console.log('\n=== VILLARD START LOW - Console Logs (last 20) ===');
  logs.slice(-20).forEach(log => console.log(log));
  console.log('\n=== VILLARD START LOW - Errors ===');
  if (errors.length === 0) {
    console.log('No errors');
  } else {
    errors.forEach(err => console.error(err));
  }
});

test('v0.5.27 villard-hairpins-low', async ({ page }) => {
  const { logs, errors } = await setupRoute(page, 'villard', 'low');
  
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(2.5); 
  });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/opt/cursor/artifacts/v0.5.27-villard-hairpins-low.png', fullPage: false });
  
  console.log('\n=== VILLARD HAIRPINS LOW - Console Logs (last 20) ===');
  logs.slice(-20).forEach(log => console.log(log));
  console.log('\n=== VILLARD HAIRPINS LOW - Errors ===');
  if (errors.length === 0) {
    console.log('No errors');
  } else {
    errors.forEach(err => console.error(err));
  }
});
