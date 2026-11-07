import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  
  // Test on PC resolution
  console.log('\n=== Creating HUD Mockups (PC 1280x720) ===\n');
  
  const pcContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
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

  // Move a bit to get sensors data
  await pcPage.keyboard.press('ArrowUp');
  await pcPage.waitForTimeout(3000);

  // Screenshot 1: BEFORE (current layout)
  await pcPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/mockup-hud-pc-before.png' });
  console.log('✓ PC Before screenshot');

  // Apply CSS changes for AFTER mockup
  await pcPage.evaluate(() => {
    // Increase HUD metrics size by ~28%
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.fontSize = '18px'; // was ~14px default
      hud.style.padding = '16px';  // was ~12px
      hud.style.minWidth = '240px'; // was ~190px
    }

    // Reduce Stop button size by ~30%
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
      stopBtn.style.fontSize = '14px'; // was ~20px
      stopBtn.style.padding = '8px 16px'; // was ~12px 24px
    }

    // Reduce gear/shift pad size by ~30%
    const shiftPad = document.getElementById('shift-pad');
    if (shiftPad) {
      shiftPad.style.transform = 'scale(0.7)';
      shiftPad.style.transformOrigin = 'bottom right';
    }
  });

  await pcPage.waitForTimeout(500);

  // Screenshot 2: AFTER (proposed layout)
  await pcPage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/mockup-hud-pc-after.png' });
  console.log('✓ PC After screenshot');

  await pcContext.close();

  // Test on Phone landscape resolution
  console.log('\n=== Creating HUD Mockups (Phone landscape 853x480) ===\n');
  
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

  // Screenshot 3: BEFORE (current layout on phone)
  await phonePage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/mockup-hud-phone-before.png' });
  console.log('✓ Phone Before screenshot');

  // Apply CSS changes for AFTER mockup
  await phonePage.evaluate(() => {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.fontSize = '16px'; // slightly smaller on phone but still bigger than current
      hud.style.padding = '12px';
      hud.style.minWidth = '200px';
    }

    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
      stopBtn.style.fontSize = '12px';
      stopBtn.style.padding = '6px 12px';
    }

    const shiftPad = document.getElementById('shift-pad');
    if (shiftPad) {
      shiftPad.style.transform = 'scale(0.7)';
      shiftPad.style.transformOrigin = 'bottom right';
    }
  });

  await phonePage.waitForTimeout(500);

  // Screenshot 4: AFTER (proposed layout on phone)
  await phonePage.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/mockup-hud-phone-after.png' });
  console.log('✓ Phone After screenshot');

  await phoneContext.close();
  await browser.close();
  
  console.log('\n✓ All HUD mockups created!');
  console.log('  - mockup-hud-pc-before.png (current PC layout)');
  console.log('  - mockup-hud-pc-after.png (proposed PC layout)');
  console.log('  - mockup-hud-phone-before.png (current phone landscape)');
  console.log('  - mockup-hud-phone-after.png (proposed phone landscape)');
})();
