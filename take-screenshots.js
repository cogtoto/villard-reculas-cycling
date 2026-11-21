import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('Starting Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  console.log('Loading app...');
  const distPath = path.join(__dirname, 'dist', 'index.html');
  await page.goto(`file://${distPath}`, { waitUntil: 'networkidle' });
  
  // Wait for app JavaScript to load
  await page.waitForTimeout(3000);
  
  // Check if FTP input is visible
  await page.waitForSelector('#ftp-input', { state: 'visible', timeout: 10000 });
  
  console.log('Taking screenshot 1: FTP entry screen');
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/screenshots/01-ftp-entry.png',
    fullPage: false 
  });
  
  // Enter FTP and continue
  console.log('Entering FTP...');
  await page.fill('#ftp-input', '200');
  
  // Manually trigger the FTP OK flow via JavaScript
  await page.evaluate(() => {
    document.getElementById('ftp-step').style.display = 'none';
    document.getElementById('route-step').style.display = '';
  });
  
  await page.waitForTimeout(1000);
  
  console.log('Taking screenshot 2: Route selection screen');
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/screenshots/02-route-selection.png',
    fullPage: false 
  });
  
  // Select Normandy route (click on the label instead)
  console.log('Selecting Normandy route...');
  await page.click('input[value="normandy"]', { force: true });
  await page.waitForTimeout(500);
  
  console.log('Taking screenshot 3: Normandy selected');
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/screenshots/03-normandy-selected.png',
    fullPage: false 
  });
  
  // Start ride
  console.log('Starting ride...');
  await page.click('#ride-go');
  
  // Wait for scene to load and render
  console.log('Waiting for scene to load...');
  await page.waitForTimeout(8000);
  
  console.log('Taking screenshot 4: Normandy scene start');
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/screenshots/04-normandy-scene-start.png',
    fullPage: false 
  });
  
  // Wait a bit more for scene details
  await page.waitForTimeout(3000);
  
  console.log('Taking screenshot 5: Normandy scene detail');
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/screenshots/05-normandy-scene-detail.png',
    fullPage: false 
  });
  
  // Check console for terrain/decor info
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'log' && 
        (msg.text().includes('Half-timbered') || 
         msg.text().includes('Vegetation') || 
         msg.text().includes('Cows') ||
         msg.text().includes('GPX'))) {
      logs.push(msg.text());
    }
  });
  
  await page.waitForTimeout(2000);
  
  console.log('\n=== Scene Loading Info ===');
  if (logs.length > 0) {
    logs.forEach(log => console.log(log));
  }
  
  console.log('\nScreenshots saved to /opt/cursor/artifacts/screenshots/');
  
  await browser.close();
  console.log('Done!');
})();
