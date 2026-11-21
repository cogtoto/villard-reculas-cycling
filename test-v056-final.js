import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  
  console.log('=== v0.5.6 FINAL Verification Test ===\n');
  
  // Test: Normandy cows at 150m-200m
  console.log('Normandy route - checking cows at spawn + 150m + 200m...');
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Cow') || text.includes('cow') || text.includes('field') || text.includes('===') || text.includes('Pasture')) {
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

  // Screenshot at spawn
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-normandy-final-spawn.png' });
  console.log('✓ Spawn screenshot captured');

  // Ride to ~150m
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(700);
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-normandy-final-150m.png' });
  console.log('✓ 150m screenshot captured');

  // Ride to ~200m
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(700);
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-normandy-final-200m.png' });
  console.log('✓ 200m screenshot captured\n');

  await ctx.close();
  
  // Villard sign test
  console.log('Villard route - checking sign at spawn + 30m...');
  const vCtx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const vPage = await vCtx.newPage();

  vPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('sign') || text.includes('dot product') || text.includes('===')) {
      console.log('[Villard]', text);
    }
  });

  await vPage.goto('http://localhost:5173');
  await vPage.waitForTimeout(2000);

  await vPage.fill('#ftp-input', '250');
  await vPage.click('#ftp-ok');
  await vPage.waitForTimeout(1000);

  await vPage.click('input[name="mode"][value="free"]');
  await vPage.click('#mode-ok');
  await vPage.waitForTimeout(1000);

  await vPage.click('input[name="route"][value="villard"]');
  await vPage.waitForTimeout(500);

  await vPage.click('#ride-go');
  await vPage.waitForTimeout(7000);

  await vPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-villard-final-spawn.png' });
  console.log('✓ Villard spawn screenshot');

  // Ride forward 30m
  for (let i = 0; i < 4; i++) {
    await vPage.keyboard.press('ArrowUp');
    await vPage.waitForTimeout(800);
  }

  await vPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-villard-final-30m.png' });
  console.log('✓ Villard 30m screenshot\n');

  await vCtx.close();
  await browser.close();
  
  console.log('✅ v0.5.6 FINAL screenshots captured!');
  console.log('\nPlease LOOK at these files:');
  console.log('  - v056-normandy-final-spawn.png');
  console.log('  - v056-normandy-final-150m.png (cows SHOULD be visible here)');
  console.log('  - v056-normandy-final-200m.png (cows SHOULD be visible here)');
  console.log('  - v056-villard-final-spawn.png (sign SHOULD be visible ahead on RIGHT)');
  console.log('  - v056-villard-final-30m.png (sign SHOULD be clearly visible on RIGHT)');
})();
