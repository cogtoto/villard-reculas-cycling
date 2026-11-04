import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Test 1: FTP Results Screen
  console.log('=== Test 1: FTP Results Screen ===');
  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  // Select FTP Ramp Test
  await page.click('input[name="mode"][value="ftp-ramp-test"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  // Select Normandy route
  await page.click('input[name="route"][value="normandy"]');
  await page.waitForTimeout(500);

  // Start ride
  await page.click('#ride-go');
  await page.waitForTimeout(5000);

  // Stop test early to trigger FTP results
  await page.click('#stop-test-btn');
  await page.waitForTimeout(2000);

  // Wait for results modal
  await page.waitForSelector('#ftp-results-modal[style*="flex"]', { timeout: 5000 });
  console.log('FTP Results modal displayed!');
  
  await page.screenshot({ path: '/workspace/screenshots/ftp-results-screen.png' });
  console.log('Screenshot: ftp-results-screen.png');

  // Click Keep FTP to close modal
  await page.click('#ftp-keep-btn');
  await page.waitForTimeout(1000);

  // Test 2: Village Signs on Normandy Route
  console.log('\n=== Test 2: Village Signs on Normandy Route ===');
  
  // Reload and select free ride
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

  console.log('Riding Normandy route, looking for village signs...');
  
  // Take screenshots at different points
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/workspace/screenshots/normandy-start.png' });
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/workspace/screenshots/normandy-riding.png' });

  // Test 3: Village Signs on Villard Route
  console.log('\n=== Test 3: Village Signs on Villard Route ===');
  
  // Stop and switch route
  await page.click('#stop-btn');
  await page.waitForTimeout(500);
  await page.click('#stop-yes');
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

  console.log('Riding Villard route, looking for village signs...');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/workspace/screenshots/villard-start.png' });
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/workspace/screenshots/villard-riding.png' });

  console.log('\nTest complete!');
  await page.waitForTimeout(2000);
  await browser.close();
})();
