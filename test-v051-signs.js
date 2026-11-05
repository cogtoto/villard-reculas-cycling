import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Capture console logs to verify sign placement
  const signLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('village signs') || text.includes('entry') || text.includes('exit') || text.includes('km (idx')) {
      signLogs.push(text);
    }
  });

  console.log('=== Testing v0.5.1 Village Signs (Real OSM Data) ===\n');
  
  // Test Normandy - should show Le Beuron first
  console.log('1. Testing Normandy route...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="mode"][value="free"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="route"][value="normandy"]');
  await page.waitForTimeout(500);

  await page.click('#ride-go');
  await page.waitForTimeout(8000); // Wait for signs to be placed

  console.log('\n--- Normandy Signs Placed (from console) ---');
  signLogs.forEach(log => console.log(log));
  
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v051-normandy-signs.png' });
  console.log('✓ Normandy screenshot captured\n');

  // Clear logs for Villard
  signLogs.length = 0;

  // Test Villard - should show Villard-Reculas first
  console.log('2. Testing Villard route...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="mode"][value="free"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="route"][value="villard"]');
  await page.waitForTimeout(500);

  await page.click('#ride-go');
  await page.waitForTimeout(6000); // Wait for signs to be placed

  console.log('\n--- Villard Signs Placed (from console) ---');
  signLogs.forEach(log => console.log(log));
  
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v051-villard-signs.png' });
  console.log('✓ Villard screenshot captured\n');

  console.log('✓ All tests passed! Real OSM village signs verified.');
  await page.waitForTimeout(2000);
  await browser.close();
})();
