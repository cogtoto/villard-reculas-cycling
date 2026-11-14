import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  
  console.log('=== v0.5.6 Verification Test ===\n');
  
  // Test 1: Villard sign close-up
  console.log('1. Villard sign close-up at spawn...');
  const villardCtx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const villardPage = await villardCtx.newPage();

  villardPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('sign') || text.includes('dot product') || text.includes('Village') || text.includes('===')) {
      console.log('[Villard]', text);
    }
  });

  await villardPage.goto('http://localhost:5173');
  await villardPage.waitForTimeout(2000);

  await villardPage.fill('#ftp-input', '250');
  await villardPage.click('#ftp-ok');
  await villardPage.waitForTimeout(1000);

  await villardPage.click('input[name="mode"][value="free"]');
  await villardPage.click('#mode-ok');
  await villardPage.waitForTimeout(1000);

  await villardPage.click('input[name="route"][value="villard"]');
  await villardPage.waitForTimeout(500);

  await villardPage.click('#ride-go');
  await villardPage.waitForTimeout(7000);

  // Screenshot at spawn - sign should be ahead, on the right, facing camera
  await villardPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-villard-sign-closeup.png' });
  console.log('✓ Villard sign close-up captured\n');

  await villardCtx.close();

  // Test 2: Normandy sign + cows close-up
  console.log('2. Normandy sign and cows...');
  const normandyCtx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const normandyPage = await normandyCtx.newPage();

  normandyPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('Cow') || text.includes('Pasture') || text.includes('field') || 
        text.includes('sign') || text.includes('dot product') || text.includes('===') ||
        text.includes('dist')) {
      console.log('[Normandy]', text);
    }
  });

  await normandyPage.goto('http://localhost:5173');
  await normandyPage.waitForTimeout(2000);

  await normandyPage.fill('#ftp-input', '250');
  await normandyPage.click('#ftp-ok');
  await normandyPage.waitForTimeout(1000);

  await normandyPage.click('input[name="mode"][value="free"]');
  await normandyPage.click('#mode-ok');
  await normandyPage.waitForTimeout(1000);

  await normandyPage.click('input[name="route"][value="normandy"]');
  await normandyPage.waitForTimeout(500);

  await normandyPage.click('#ride-go');
  await normandyPage.waitForTimeout(8000);

  // Screenshot at spawn - Le Beuron sign should be visible
  await normandyPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-normandy-sign-closeup.png' });
  console.log('✓ Normandy sign close-up captured');

  // Ride forward to first cow pasture (should be within 150-250m)
  console.log('Riding to first cow pasture (within 250m)...');
  for (let i = 0; i < 8; i++) {
    await normandyPage.keyboard.press('ArrowUp');
    await normandyPage.waitForTimeout(600);
  }

  // Screenshot - cows should be visible close-up
  await normandyPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-normandy-cows-closeup.png' });
  console.log('✓ Normandy cows close-up captured\n');

  await normandyCtx.close();
  await browser.close();
  
  console.log('✅ v0.5.6 verification screenshots captured!');
  console.log('  - Villard sign close-up (spawn view, right side, readable)');
  console.log('  - Normandy sign close-up (spawn view, right side, readable)');
  console.log('  - Normandy cows close-up (within first 250m)');
  console.log('\nPlease VERIFY visually that:');
  console.log('  1. Signs are on the RIGHT side of the road');
  console.log('  2. Sign text is READABLE (not mirrored, not edge-on)');
  console.log('  3. Cows and fences are VISIBLE in the cow screenshot');
})();
