import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Church') || text.includes('village')) {
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

  // Ride through route, capturing screenshots
  const distances = [0, 100, 200, 300, 500, 800, 1200, 1600, 2000, 3000, 4000, 5000];
  
  for (let i = 0; i < distances.length; i++) {
    const dist = distances[i];
    await page.screenshot({ path: `/agent/repos/villard-reculas-cycling/screenshots/v058-village-${dist}m.png` });
    console.log(`✓ ${dist}m`);
    
    if (i < distances.length - 1) {
      const nextDist = distances[i + 1];
      const deltaM = nextDist - dist;
      const presses = Math.ceil(deltaM / 15); // ~15m per press sequence
      
      for (let j = 0; j < presses; j++) {
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(500);
      }
    }
  }

  await ctx.close();
  await browser.close();
  
  console.log('\n✅ Village tour complete! Check v058-village-*.png for churches');
})();
