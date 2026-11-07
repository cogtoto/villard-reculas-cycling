import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Cow') || text.includes('cow') || text.includes('Added')) {
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

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/cow-closer-spawn.png' });
  console.log('✓ Spawn');

  // Ride closer to cows (140m)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(800);
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/cow-closer-140m.png' });
  console.log('✓ 140m - COWS should be MORE visible');

  // Even closer (170m)
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(800);
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/cow-closer-170m.png' });
  console.log('✓ 170m - COWS should be EVEN MORE visible (close-up)');

  await ctx.close();
  await browser.close();
  
  console.log('\n✅ Done! Check cow-closer-170m.png for WHITE COWS');
})();
