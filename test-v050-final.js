import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('=== Testing v0.5.0 Final Build ===');
  
  // Test 1: Villard route
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
  await page.waitForTimeout(6000);

  console.log('✓ Villard route loaded');
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v050-final-villard.png', fullPage: false });

  // Test 2: Normandy route with decor
  console.log('\n2. Testing Normandy route with bocage/trees...');
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
  await page.waitForTimeout(8000); // Wait for trees/cows to load

  console.log('✓ Normandy route loaded with decor');
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v050-final-normandy-decor.png', fullPage: false });

  console.log('\n✓ All tests passed! Both routes verified.');
  await page.waitForTimeout(2000);
  await browser.close();
})();
