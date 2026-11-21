import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('=== Testing v0.5.2 No Map in Workout Mode ===\n');
  
  // Test 1: Free ride mode - minimap should be visible
  console.log('1. Testing Free Ride mode (minimap should be visible)...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="mode"][value="free"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="route"][value="villard"]');
  await page.waitForTimeout(500);

  await page.click('#ride-go');
  await page.waitForTimeout(4000);

  // Check if minimap exists and is visible
  const minimapFree = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[style*="position: fixed"][style*="top: 12px"]');
    if (!canvas) return { exists: false };
    const style = window.getComputedStyle(canvas);
    return {
      exists: true,
      visible: style.display !== 'none',
      position: style.position,
      top: style.top,
      right: style.right
    };
  });

  console.log('  Free ride minimap:', minimapFree);
  if (minimapFree.exists && minimapFree.visible) {
    console.log('  ✓ Minimap visible in free ride mode');
  } else {
    console.log('  ✗ ERROR: Minimap should be visible in free ride mode');
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v052-free-ride-map.png' });

  // Test 2: Workout mode - minimap should be hidden
  console.log('\n2. Testing Workout mode (minimap should be hidden)...');
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
  await page.waitForTimeout(4000);

  // Check if minimap is hidden
  const minimapWorkout = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[style*="position: fixed"][style*="top: 12px"]');
    if (!canvas) return { exists: false };
    const style = window.getComputedStyle(canvas);
    return {
      exists: true,
      visible: style.display !== 'none',
      display: style.display,
      position: style.position
    };
  });

  console.log('  Workout minimap:', minimapWorkout);
  if (minimapWorkout.exists && !minimapWorkout.visible) {
    console.log('  ✓ Minimap hidden in workout mode');
  } else {
    console.log('  ✗ ERROR: Minimap should be hidden in workout mode');
  }

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v052-workout-no-map.png' });

  console.log('\n✓ All tests completed!');
  await page.waitForTimeout(2000);
  await browser.close();
})();
