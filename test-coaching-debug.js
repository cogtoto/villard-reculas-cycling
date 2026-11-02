import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Inject some mock power data
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
  await page.waitForTimeout(3000);
  console.log('Scene loaded');

  // Inject some simulated power to trigger performance messages
  await page.evaluate(() => {
    // Override state.watts to simulate power
    if (window.state) {
      window.state.watts = 90; // Close to target
    }
  });

  console.log('Waiting for messages...');
  
  // Take multiple screenshots to catch messages
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(8000);
    
    // Check if coaching message is visible
    const messageVisible = await page.evaluate(() => {
      const banner = document.getElementById('coaching-message');
      return banner && banner.style.display !== 'none' && banner.textContent.length > 0;
    });
    
    if (messageVisible) {
      const messageText = await page.evaluate(() => {
        return document.getElementById('coaching-message').textContent;
      });
      console.log(`Message ${i}: "${messageText}"`);
      await page.screenshot({ path: `/workspace/screenshots/coaching-captured-${i}.png` });
    } else {
      console.log(`No message visible at ${i * 8}s`);
    }
  }

  console.log('Test complete!');
  await page.waitForTimeout(2000);
  await browser.close();
})();
