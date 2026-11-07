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
  console.log('Scene loaded, monitoring for coaching messages...');

  let captureCount = 0;
  const maxCaptures = 6;
  const maxTime = 150000; // 2.5 minutes max
  const startTime = Date.now();

  // Poll frequently for messages
  while (captureCount < maxCaptures && (Date.now() - startTime) < maxTime) {
    try {
      // Wait for message to become visible with good opacity
      await page.waitForFunction(() => {
        const banner = document.getElementById('coaching-message');
        if (!banner) return false;
        const style = window.getComputedStyle(banner);
        const opacity = parseFloat(style.opacity);
        const visibility = style.visibility;
        return visibility === 'visible' && opacity > 0.8;
      }, { timeout: 30000 });

      // Get the message text
      const messageText = await page.evaluate(() => {
        return document.getElementById('coaching-message').textContent;
      });

      console.log(`Capturing message ${captureCount}: "${messageText}"`);
      
      // Small delay to ensure animation is complete
      await page.waitForTimeout(200);
      
      await page.screenshot({ 
        path: `/workspace/screenshots/coaching-final-${captureCount}.png`,
        fullPage: false
      });
      
      captureCount++;
      
      // Wait for it to fade before looking for next
      await page.waitForTimeout(5000);
    } catch (e) {
      console.log('Timeout waiting for message, continuing...');
    }
  }

  console.log(`Test complete! Captured ${captureCount} coaching messages.`);
  await page.waitForTimeout(1000);
  await browser.close();
})();
