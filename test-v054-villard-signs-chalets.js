import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Monitor console for village signs debug info
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Village') || text.includes('sign') || text.includes('Placed') || text.includes('===')) {
      console.log('[Browser]', text);
    }
  });

  console.log('Testing Villard-Reculas route: signs visible + simplified chalets...');
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
  
  // Wait for scene + signs to load
  await page.waitForTimeout(8000);

  // Screenshot 1: Start (should show Villard-Reculas sign ahead)
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v054-villard-start-with-sign.png' });
  console.log('✓ Screenshot 1: Villard start');

  // Move forward a bit (simulate riding)
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(5000);
  
  // Screenshot 2: Riding with chalets visible
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v054-villard-chalets.png' });
  console.log('✓ Screenshot 2: Villard chalets');

  await page.waitForTimeout(2000);
  await browser.close();
  console.log('✓ Villard test complete');
})();
