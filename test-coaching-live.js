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
  const maxCaptures = 10;
  const maxTime = 180000; // 3 minutes max
  const startTime = Date.now();

  // Poll frequently for messages
  while (captureCount < maxCaptures && (Date.now() - startTime) < maxTime) {
    const messageData = await page.evaluate(() => {
      const banner = document.getElementById('coaching-message');
      if (banner && banner.style.display !== 'none') {
        const text = banner.textContent;
        const rect = banner.getBoundingClientRect();
        return {
          visible: rect.width > 0 && rect.height > 0,
          text: text,
          opacity: window.getComputedStyle(banner).opacity
        };
      }
      return { visible: false };
    });

    if (messageData.visible && parseFloat(messageData.opacity) > 0.5) {
      console.log(`Capturing message ${captureCount}: "${messageData.text}"`);
      await page.screenshot({ 
        path: `/workspace/screenshots/coaching-live-${captureCount}.png`,
        fullPage: false
      });
      captureCount++;
      // Wait for it to fade before looking for next
      await page.waitForTimeout(6000);
    }

    // Check frequently
    await page.waitForTimeout(200);
  }

  console.log(`Test complete! Captured ${captureCount} coaching messages.`);
  await page.waitForTimeout(1000);
  await browser.close();
})();
