import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('sign') || text.includes('Village')) {
      console.log('[Browser]', text);
    }
  });

  console.log('Testing Villard sign readable from rider...');
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

  // Screenshot: Villard-Reculas sign should be readable (not mirrored)
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-villard-sign-readable.png' });
  console.log('✓ Screenshot: Villard sign (should be readable, not mirrored)');

  await page.waitForTimeout(2000);
  await browser.close();
})();
