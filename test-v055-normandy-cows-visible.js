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
    if (text.includes('cow') || text.includes('Cow') || text.includes('Pasture') || 
        text.includes('field') || text.includes('sign') || text.includes('Village')) {
      console.log('[Browser]', text);
    }
  });

  console.log('Testing Normandy cows visible...');
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
  await page.waitForTimeout(6000);

  console.log('Riding forward to reach cow pastures...');
  
  // Ride forward to reach pastures (around 2-3km mark)
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(400);
  }

  // Screenshot: Should show cows clearly visible in fenced pasture
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-normandy-cows-visible.png' });
  console.log('✓ Screenshot: Normandy cows (should be visible in pasture)');

  // Continue a bit more to find another pasture
  await page.waitForTimeout(2000);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-normandy-cows-visible-2.png' });
  console.log('✓ Screenshot 2: Another cow pasture location');

  await page.waitForTimeout(2000);
  await browser.close();
})();
