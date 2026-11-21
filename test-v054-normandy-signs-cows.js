import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Monitor console for signs, cows, pastures
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Village') || text.includes('sign') || text.includes('Cow') || 
        text.includes('Pasture') || text.includes('field') || text.includes('===')) {
      console.log('[Browser]', text);
    }
  });

  console.log('Testing Normandy route: signs visible + cows in pastures...');
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
  
  // Wait for scene + signs + cows to load
  await page.waitForTimeout(8000);

  // Screenshot 1: Start (should show Le Beuron sign ahead)
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v054-normandy-start-with-sign.png' });
  console.log('✓ Screenshot 1: Normandy start');

  // Move forward significantly to reach cow pastures
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
  }
  
  // Screenshot 2: Riding with cows in fenced pastures
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v054-normandy-cows-pasture.png' });
  console.log('✓ Screenshot 2: Normandy cows in pasture');

  await page.waitForTimeout(2000);
  await browser.close();
  console.log('✓ Normandy test complete');
})();
