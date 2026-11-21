import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Cow') || text.includes('cube') || text.includes('===') || text.includes('DEBUG')) {
      console.log('[Console]', text);
    }
  });

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
  await page.waitForTimeout(8000);

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/test-cow-cube-spawn.png' });
  console.log('✓ Spawn screenshot');

  // Ride to 150m
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(700);
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/test-cow-cube-150m.png' });
  console.log('✓ 150m screenshot - RED CUBE should be visible if cow position is visible from road');

  await ctx.close();
  await browser.close();
  
  console.log('\n✅ Test done! Check test-cow-cube-150m.png for the RED CUBE');
})();
