import { chromium } from 'playwright';

async function testRoute(routeName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING ${routeName.toUpperCase()} ROUTE`);
  console.log('='.repeat(80));
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  const loadedRoute = { name: null };
  
  page.on('console', msg => {
    const text = msg.text();
    // Capture which GPX was loaded
    if (text.includes('GPX villard:') || text.includes('GPX normandy:')) {
      console.log('[ROUTE LOADED]', text);
      loadedRoute.name = text.includes('villard') ? 'villard' : 'normandy';
    }
    if (text.includes('Half-timbered') || text.includes('Chalets:') || 
        text.includes('Vegetation:') || text.includes('Cows:')) {
      console.log('[DECOR]', text);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[ERROR]', error.message);
  });
  
  console.log('Loading app...');
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('Entering FTP...');
  await page.fill('#ftp-input', '200');
  await page.evaluate(() => {
    document.getElementById('ftp-step').style.display = 'none';
    document.getElementById('route-step').style.display = '';
  });
  await page.waitForTimeout(500);
  
  await page.screenshot({ 
    path: `/opt/cursor/artifacts/screenshots/test-${routeName}-01-selection.png` 
  });
  
  console.log(`Selecting ${routeName} route...`);
  await page.click(`input[value="${routeName}"]`, { force: true });
  await page.waitForTimeout(500);
  
  await page.screenshot({ 
    path: `/opt/cursor/artifacts/screenshots/test-${routeName}-02-selected.png` 
  });
  
  console.log('Clicking Start Ride...');
  await page.click('#ride-go');
  
  console.log('Waiting for scene to load (12s)...');
  await page.waitForTimeout(12000);
  
  await page.screenshot({ 
    path: `/opt/cursor/artifacts/screenshots/test-${routeName}-03-scene.png`,
    fullPage: false 
  });
  
  await page.waitForTimeout(3000);
  
  await page.screenshot({ 
    path: `/opt/cursor/artifacts/screenshots/test-${routeName}-04-scene-detail.png`,
    fullPage: false 
  });
  
  const introExists = await page.locator('#intro').count();
  const rideStarted = introExists === 0;
  
  console.log('\n--- RESULTS ---');
  console.log('Intro removed:', rideStarted ? '✅ YES' : '❌ NO');
  console.log('Route loaded:', loadedRoute.name || 'UNKNOWN');
  console.log('Expected:', routeName);
  console.log('Match:', loadedRoute.name === routeName ? '✅ YES' : '❌ NO');
  
  await browser.close();
  
  return {
    success: rideStarted && loadedRoute.name === routeName,
    loadedRoute: loadedRoute.name
  };
}

(async () => {
  const villardResult = await testRoute('villard');
  const normandyResult = await testRoute('normandy');
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));
  console.log('Villard:', villardResult.success ? '✅ PASS' : '❌ FAIL');
  console.log('Normandy:', normandyResult.success ? '✅ PASS' : '❌ FAIL');
  
  process.exit(villardResult.success && normandyResult.success ? 0 : 1);
})();
