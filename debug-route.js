import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('Starting Chromium for debugging...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[CONSOLE ${type.toUpperCase()}]`, text);
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });
  
  // Capture network errors
  page.on('requestfailed', request => {
    console.error('[REQUEST FAILED]', request.url(), request.failure().errorText);
  });
  
  console.log('Loading app...');
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(3000);
  
  console.log('\n=== ENTERING FTP ===');
  await page.fill('#ftp-input', '200');
  
  // Manually trigger route step display
  await page.evaluate(() => {
    document.getElementById('ftp-step').style.display = 'none';
    document.getElementById('route-step').style.display = '';
  });
  
  await page.waitForTimeout(1000);
  
  console.log('\n=== SELECTING NORMANDY ROUTE ===');
  await page.click('input[value="normandy"]', { force: true });
  await page.waitForTimeout(500);
  
  console.log('\n=== CLICKING START RIDE BUTTON ===');
  console.log('Button exists:', await page.locator('#ride-go').count());
  console.log('Button visible:', await page.locator('#ride-go').isVisible());
  
  // Click and wait to see what happens
  await page.click('#ride-go');
  
  console.log('\n=== WAITING FOR SCENE TO LOAD (15s) ===');
  await page.waitForTimeout(15000);
  
  console.log('\n=== CHECKING INTRO DIALOG ===');
  const introExists = await page.locator('#intro').count();
  console.log('Intro dialog still exists:', introExists > 0);
  
  if (introExists > 0) {
    const introVisible = await page.locator('#intro').isVisible();
    console.log('Intro dialog still visible:', introVisible);
  }
  
  await browser.close();
  console.log('\n=== DEBUG SESSION COMPLETE ===');
})();
