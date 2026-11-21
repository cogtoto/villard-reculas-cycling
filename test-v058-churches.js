import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  
  console.log('=== v0.5.8 Churches + Sunny Normandy Test ===\n');
  
  // Test 1: PC viewport (1280x720)
  console.log('1. PC viewport (1280x720)...');
  const pcCtx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const pcPage = await pcCtx.newPage();

  pcPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('Church') || text.includes('Half-timbered') || text.includes('village')) {
      console.log('[PC]', text);
    }
  });

  await pcPage.goto('http://localhost:5173');
  await pcPage.waitForTimeout(2000);

  await pcPage.fill('#ftp-input', '250');
  await pcPage.click('#ftp-ok');
  await pcPage.waitForTimeout(1000);

  await pcPage.click('input[name="mode"][value="free"]');
  await pcPage.click('#mode-ok');
  await pcPage.waitForTimeout(1000);

  await pcPage.click('input[name="route"][value="normandy"]');
  await pcPage.waitForTimeout(500);

  await pcPage.click('#ride-go');
  await pcPage.waitForTimeout(8000);

  // Screenshots at spawn and villages
  await pcPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v058-pc-spawn.png' });
  console.log('✓ PC spawn (sun, blue sky, bright colors)');

  // Ride through to see villages/churches
  for (let dist = 0; dist < 300; dist += 50) {
    for (let i = 0; i < 6; i++) {
      await pcPage.keyboard.press('ArrowUp');
      await pcPage.waitForTimeout(600);
    }
    await pcPage.screenshot({ path: `/agent/repos/villard-reculas-cycling/screenshots/v058-pc-${dist + 50}m.png` });
    console.log(`  ✓ PC ~${dist + 50}m`);
  }

  await pcCtx.close();

  // Test 2: Android viewport (landscape phone)
  console.log('\n2. Android viewport (854x480)...');
  const androidCtx = await browser.newContext({ viewport: { width: 854, height: 480 }, deviceScaleFactor: 2 });
  const androidPage = await androidCtx.newPage();

  androidPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('Church')) {
      console.log('[Android]', text);
    }
  });

  await androidPage.goto('http://localhost:5173');
  await androidPage.waitForTimeout(2000);

  await androidPage.fill('#ftp-input', '250');
  await androidPage.click('#ftp-ok');
  await androidPage.waitForTimeout(1000);

  await androidPage.click('input[name="mode"][value="free"]');
  await androidPage.click('#mode-ok');
  await androidPage.waitForTimeout(1000);

  await androidPage.click('input[name="route"][value="normandy"]');
  await androidPage.waitForTimeout(500);

  await androidPage.click('#ride-go');
  await androidPage.waitForTimeout(8000);

  await androidPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v058-android-spawn.png' });
  console.log('✓ Android spawn');

  // Ride to village
  for (let i = 0; i < 12; i++) {
    await androidPage.keyboard.press('ArrowUp');
    await androidPage.waitForTimeout(600);
  }

  await androidPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v058-android-village.png' });
  console.log('✓ Android village view');

  await androidCtx.close();
  await browser.close();
  
  console.log('\n✅ v0.5.8 screenshots captured!');
  console.log('Check for:');
  console.log('  - Visible sun in sky');
  console.log('  - Bright blue sky');
  console.log('  - Vivid green colors');
  console.log('  - Norman churches in villages (stone nave, slate roof, bell tower)');
  console.log('  - Readable HUD and signs');
})();
