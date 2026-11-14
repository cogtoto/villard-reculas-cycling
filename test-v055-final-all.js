import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  
  console.log('=== v0.5.5 Final Test Suite ===\n');
  
  // Test 1: Villard sign readable (PC)
  console.log('1. Villard sign readable (PC)...');
  const pcContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const pcPage = await pcContext.newPage();

  await pcPage.goto('http://localhost:5173');
  await pcPage.waitForTimeout(2000);

  await pcPage.fill('#ftp-input', '250');
  await pcPage.click('#ftp-ok');
  await pcPage.waitForTimeout(1000);

  await pcPage.click('input[name="mode"][value="free"]');
  await pcPage.click('#mode-ok');
  await pcPage.waitForTimeout(1000);

  await pcPage.click('input[name="route"][value="villard"]');
  await pcPage.waitForTimeout(500);

  await pcPage.click('#ride-go');
  await pcPage.waitForTimeout(6000);

  await pcPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-villard-sign-readable-pc.png' });
  console.log('  ✓ Villard sign readable (PC)');

  // Test 2: PC HUD final layout
  await pcPage.keyboard.press('ArrowUp');
  await pcPage.waitForTimeout(3000);
  await pcPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-hud-final-pc.png' });
  console.log('  ✓ HUD final layout (PC)');

  await pcContext.close();

  // Test 3: Normandy cows visible + sign readable
  console.log('\n2. Normandy cows and sign (PC)...');
  const normandyContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const normandyPage = await normandyContext.newPage();

  normandyPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('Cow') || text.includes('Pasture') || text.includes('field')) {
      console.log('  [Browser]', text);
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
  await normandyPage.waitForTimeout(6000);

  // Start: Le Beuron sign
  await normandyPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-normandy-sign-readable-pc.png' });
  console.log('  ✓ Normandy Le Beuron sign readable');

  // Ride to find cows (around 1.5-3km mark)
  console.log('  Riding to cow pastures...');
  for (let i = 0; i < 12; i++) {
    await normandyPage.keyboard.press('ArrowUp');
    await normandyPage.waitForTimeout(500);
  }

  await normandyPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-normandy-cows-visible-pc.png' });
  console.log('  ✓ Normandy cows in pasture');

  await normandyContext.close();

  // Test 4: Phone landscape
  console.log('\n3. Phone landscape HUD...');
  const phoneContext = await browser.newContext({
    viewport: { width: 853, height: 480 },
    deviceScaleFactor: 2
  });
  const phonePage = await phoneContext.newPage();

  await phonePage.goto('http://localhost:5173');
  await phonePage.waitForTimeout(2000);

  await phonePage.fill('#ftp-input', '250');
  await phonePage.click('#ftp-ok');
  await phonePage.waitForTimeout(1000);

  await phonePage.click('input[name="mode"][value="free"]');
  await phonePage.click('#mode-ok');
  await phonePage.waitForTimeout(1000);

  await phonePage.click('input[name="route"][value="villard"]');
  await phonePage.waitForTimeout(500);

  await phonePage.click('#ride-go');
  await phonePage.waitForTimeout(6000);

  await phonePage.keyboard.press('ArrowUp');
  await phonePage.waitForTimeout(3000);

  await phonePage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v055-hud-final-phone.png' });
  console.log('  ✓ HUD final layout (phone landscape)');

  await phoneContext.close();
  await browser.close();
  
  console.log('\n✅ All v0.5.5 screenshots captured!');
  console.log('  - Villard sign readable (PC)');
  console.log('  - Normandy sign readable (PC)');
  console.log('  - Normandy cows visible (PC)');
  console.log('  - HUD final layout (PC)');
  console.log('  - HUD final layout (phone landscape)');
})();
