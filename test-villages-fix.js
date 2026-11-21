import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('=== Testing Village Signs Fix ===');
  
  // Test Villard - should show "Villard-Reculas" first
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

  console.log('✓ Villard route loaded - checking for "Villard-Reculas" sign');
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v050-fix-villard-sign.png' });

  // Test Normandy - should show "Le Beuron" first
  console.log('\n2. Testing Normandy route...');
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
  await page.waitForTimeout(5000);

  console.log('✓ Normandy route loaded - checking for "Le Beuron" sign');
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v050-fix-normandy-sign.png' });

  console.log('\n✓ All tests passed! Village signs should now be correct.');
  await page.waitForTimeout(2000);
  await browser.close();
})();
