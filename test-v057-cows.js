import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Cow') || text.includes('cow') || text.includes('Pasture') || text.includes('field') || text.includes('dist')) {
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

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v057-normandy-spawn.png' });
  console.log('✓ Spawn');

  // Ride forward slowly to approach cows (should be at 12-25m from road, within 150-250m track distance)
  for (let dist = 0; dist < 200; dist += 20) {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: `/agent/repos/villard-reculas-cycling/screenshots/v057-normandy-${dist + 20}m.png` });
    console.log(`  ✓ ~${dist + 20}m`);
  }

  await ctx.close();
  await browser.close();
  
  console.log('\n✅ v0.5.7 screenshots captured!');
  console.log('Check v057-normandy-*.png for DETAILED COWS (body, legs, head, horns, udder, white+brown)');
})();
