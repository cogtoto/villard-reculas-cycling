import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  
  console.log('=== v0.5.6 Re-verification Test ===\n');
  
  // Test 1: Villard sign - ride forward 50m
  console.log('1. Villard sign - riding forward 50m...');
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

  // Ride forward 20m
  for (let i = 0; i < 3; i++) {
    await villardPage.keyboard.press('ArrowUp');
    await villardPage.waitForTimeout(800);
  }

  await villardPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-villard-sign-closer.png' });
  console.log('✓ Villard sign (closer) captured\n');

  await villardCtx.close();

  // Test 2: Normandy cows - check if they're even in the scene
  console.log('2. Normandy cows debug...');
  const normandyCtx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const normandyPage = await normandyCtx.newPage();

  let cowMeshCount = 0;
  normandyPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('Cow') || text.includes('Pasture') || text.includes('field') || 
        text.includes('cow') || text.includes('===') || text.includes('dist')) {
      console.log('[Normandy]', text);
      if (text.includes('CowMesh')) cowMeshCount++;
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

  // Screenshot at spawn
  await normandyPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v056-normandy-spawn.png' });
  console.log('✓ Normandy spawn captured');

  // Ride forward slowly (30m steps, check at 100m, 150m, 200m, 250m)
  for (let dist = 0; dist < 250; dist += 30) {
    for (let i = 0; i < 4; i++) {
      await normandyPage.keyboard.press('ArrowUp');
      await normandyPage.waitForTimeout(600);
    }
    await normandyPage.screenshot({ path: `/agent/repos/villard-reculas-cycling/screenshots/v056-normandy-${dist + 30}m.png` });
    console.log(`  ✓ Screenshot at ~${dist + 30}m`);
  }

  console.log(`\nCow debug log count: ${cowMeshCount > 0 ? 'Found CowMesh debug' : 'NO CowMesh debug'}\n`);

  await normandyCtx.close();
  await browser.close();
  
  console.log('✅ v0.5.6 re-verification done!');
  console.log('\nPlease LOOK at:');
  console.log('  - v056-villard-sign-closer.png (sign should be visible ahead)');
  console.log('  - v056-normandy-spawn.png through v056-normandy-240m.png');
  console.log('  - Check if ANY white/brown cow shapes are visible');
})();
