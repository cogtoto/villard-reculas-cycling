import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Loading app...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Enter FTP
  console.log('Setting FTP...');
  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  // Select workout mode (Sweet Spot)
  console.log('Selecting Sweet Spot workout...');
  await page.click('input[name="mode"][value="sweet-spot"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  // Select route (Normandy)
  console.log('Selecting Normandy route...');
  await page.click('input[name="route"][value="normandy"]');
  await page.waitForTimeout(500);

  // Start ride
  console.log('Starting ride...');
  await page.click('#ride-go');
  
  // Wait for scene to load
  await page.waitForTimeout(5000);
  console.log('Scene loaded, workout started');

  // Wait for initial coaching message (should appear at interval start)
  await page.waitForTimeout(3000);
  console.log('Capturing coaching message 1 - Interval start');
  await page.screenshot({ path: '/workspace/screenshots/coaching-message-1-start.png' });

  // Wait for regular coaching message (~20-40s)
  console.log('Waiting for regular coaching message...');
  await page.waitForTimeout(25000);
  console.log('Capturing coaching message 2 - Regular');
  await page.screenshot({ path: '/workspace/screenshots/coaching-message-2-regular.png' });

  // Wait for more messages
  await page.waitForTimeout(30000);
  console.log('Capturing coaching message 3 - Progress');
  await page.screenshot({ path: '/workspace/screenshots/coaching-message-3-progress.png' });

  // Wait for interval change (warmup should be ~5 min = 300s, but let's fast forward by inspecting)
  console.log('Waiting for interval change...');
  await page.waitForTimeout(35000);
  console.log('Capturing coaching message 4 - Interval change');
  await page.screenshot({ path: '/workspace/screenshots/coaching-message-4-interval-change.png' });

  console.log('Test complete!');
  await page.waitForTimeout(2000);
  await browser.close();
})();
