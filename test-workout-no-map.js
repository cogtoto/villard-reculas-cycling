import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('=== Testing Workout Mode - No Minimap ===\n');
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="mode"][value="sweet-spot"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="route"][value="villard"]');
  await page.waitForTimeout(500);

  await page.click('#ride-go');
  await page.waitForTimeout(5000);

  // Check if minimap is hidden
  const minimapWorkout = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[style*="position: fixed"][style*="top: 12px"]');
    if (!canvas) return { exists: false };
    const style = window.getComputedStyle(canvas);
    return {
      exists: true,
      visible: style.display !== 'none',
      display: style.display
    };
  });

  console.log('Workout minimap status:', minimapWorkout);
  if (minimapWorkout.exists && !minimapWorkout.visible) {
    console.log('✓ Minimap hidden in workout mode');
  } else {
    console.log('✗ ERROR: Minimap should be hidden in workout mode');
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v052-workout-no-map.png' });
  console.log('✓ Screenshot captured');

  await page.waitForTimeout(2000);
  await browser.close();
})();
