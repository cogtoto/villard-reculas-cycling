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
  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  // Select workout
  await page.click('input[name="mode"][value="sweet-spot"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  // Select route
  await page.click('input[name="route"][value="normandy"]');
  await page.waitForTimeout(500);

  // Start ride
  await page.click('#ride-go');
  await page.waitForTimeout(3000);
  
  console.log('Waiting for first message...');

  // Wait for message
  await page.waitForFunction(() => {
    const banner = document.getElementById('coaching-message');
    if (!banner) return false;
    const style = window.getComputedStyle(banner);
    return style.visibility === 'visible' && parseFloat(style.opacity) > 0.5;
  }, { timeout: 60000 });

  // Log banner state
  const bannerInfo = await page.evaluate(() => {
    const banner = document.getElementById('coaching-message');
    const style = window.getComputedStyle(banner);
    const rect = banner.getBoundingClientRect();
    return {
      text: banner.textContent,
      display: style.display,
      opacity: style.opacity,
      visibility: style.visibility,
      zIndex: style.zIndex,
      position: style.position,
      top: style.top,
      left: style.left,
      transform: style.transform,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
  });

  console.log('Banner info:', JSON.stringify(bannerInfo, null, 2));

  // Take screenshot with full page
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: '/workspace/screenshots/coaching-debug-fullpage.png',
    fullPage: true
  });

  // Take regular screenshot
  await page.screenshot({ 
    path: '/workspace/screenshots/coaching-debug-viewport.png',
    fullPage: false
  });

  console.log('Screenshots saved!');
  await page.waitForTimeout(2000);
  await browser.close();
})();
