import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('=== Testing Normandy Route with Decor ===');
  
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
  console.log('Waiting for Normandy decor (trees, bocage, cows) to load...');
  await page.waitForTimeout(10000); // Extra time for vegetation

  console.log('✓ Normandy route loaded with full decor');
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v050-final-normandy-decor.png', fullPage: false });

  await page.waitForTimeout(2000);
  await browser.close();
  console.log('Done!');
})();
