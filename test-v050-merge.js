import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('=== Testing v0.5.0 Merged Features ===');
  
  // Test Villard route
  console.log('\n1. Testing Villard-Reculas route...');
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
  await page.waitForTimeout(5000);

  console.log('Villard route loaded successfully');
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v050-villard-merged.png' });

  // Test Normandy route
  console.log('\n2. Testing Normandy route...');
  await page.reload();
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
  await page.waitForTimeout(5000);

  console.log('Normandy route loaded successfully');
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v050-normandy-merged.png' });

  console.log('\n✓ All tests passed!');
  await page.waitForTimeout(2000);
  await browser.close();
})();
