import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('=== Testing Start Signs Visibility ===\n');
  
  // Test 1: Villard-Reculas Free Ride - check start sign
  console.log('1. Testing Villard-Reculas Free Ride start sign...');
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
  
  // Wait for scene to load and signs to be placed
  await page.waitForTimeout(5000);
  
  // Check console logs for sign placement
  const villardLogs = await page.evaluate(() => {
    return {
      bodyExists: document.body !== null,
      canvasExists: !!document.querySelector('canvas')
    };
  });
  
  console.log('  Villard scene loaded:', villardLogs);
  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v053-villard-start-free.png' });
  console.log('  ✓ Screenshot: v053-villard-start-free.png');

  // Test 2: Villard-Reculas Workout mode
  console.log('\n2. Testing Villard-Reculas Workout start sign...');
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

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v053-villard-start-workout.png' });
  console.log('  ✓ Screenshot: v053-villard-start-workout.png');

  // Test 3: Normandy Free Ride - check Le Beuron start sign
  console.log('\n3. Testing Normandy Free Ride start sign (Le Beuron)...');
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
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v053-normandy-start-free.png' });
  console.log('  ✓ Screenshot: v053-normandy-start-free.png');

  // Test 4: Normandy Workout mode
  console.log('\n4. Testing Normandy Workout start sign...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="mode"][value="sweet-spot"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  await page.click('input[name="route"][value="normandy"]');
  await page.waitForTimeout(500);

  await page.click('#ride-go');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v053-normandy-start-workout.png' });
  console.log('  ✓ Screenshot: v053-normandy-start-workout.png');

  console.log('\n✓ All start sign tests completed!');
  console.log('Check screenshots for sign visibility at spawn.');
  
  await page.waitForTimeout(2000);
  await browser.close();
})();
