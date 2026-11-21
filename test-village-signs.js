import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Test Villard route
  console.log('=== Testing Villard-Reculas Route ===');
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
  await page.waitForTimeout(8000);

  console.log('Villard route loaded, taking screenshots...');
  
  await page.screenshot({ path: '/workspace/screenshots/villard-with-signs-1.png' });
  
  await page.waitForTimeout(10000);
  await page.screenshot({ path: '/workspace/screenshots/villard-with-signs-2.png' });

  // Test Normandy route
  console.log('\n=== Testing Normandy Route ===');
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
  await page.waitForTimeout(8000);

  console.log('Normandy route loaded, taking screenshots...');
  
  await page.screenshot({ path: '/workspace/screenshots/normandy-with-signs-1.png' });
  
  await page.waitForTimeout(10000);
  await page.screenshot({ path: '/workspace/screenshots/normandy-with-signs-2.png' });

  console.log('\nTest complete!');
  await page.waitForTimeout(2000);
  await browser.close();
})();
