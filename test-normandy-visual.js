import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5177 }, logLevel: 'error' });
await server.listen();

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

page.on('console', msg => {
  const txt = msg.text();
  if (txt.includes('✓') || txt.includes('Normandy') || txt.includes('error')) console.log('→', txt);
});

await page.goto('http://localhost:5177');

// Wait for page to load
await page.waitForTimeout(2000);

// Fill FTP
await page.fill('#ftp-input', '250');
await page.click('#ftp-ok');
await page.waitForTimeout(500);

// Select Normandy route
await page.click('input[name="route"][value="normandy"]');
await page.waitForTimeout(300);

// Start ride
await page.click('#ride-go');
console.log('Clicked Start Ride for Normandy route');

// Wait for scene to load
await page.waitForTimeout(5000);

// Take screenshot at start
await page.screenshot({ path: '/workspace/test-normandy-start.png', fullPage: false });
console.log('Screenshot 1: Start position');

// Move forward to see houses
await page.evaluate(() => {
  if (window.gameState && window.gameState.distMeters !== undefined) {
    window.gameState.distMeters = 500;
  }
});
await page.waitForTimeout(2000);
await page.screenshot({ path: '/workspace/test-normandy-houses.png', fullPage: false });
console.log('Screenshot 2: Houses at 500m');

// Move to see fields and hedgerows
await page.evaluate(() => {
  if (window.gameState && window.gameState.distMeters !== undefined) {
    window.gameState.distMeters = 2000;
  }
});
await page.waitForTimeout(2000);
await page.screenshot({ path: '/workspace/test-normandy-fields.png', fullPage: false });
console.log('Screenshot 3: Fields and hedgerows at 2km');

// Move to see trees
await page.evaluate(() => {
  if (window.gameState && window.gameState.distMeters !== undefined) {
    window.gameState.distMeters = 5000;
  }
});
await page.waitForTimeout(2000);
await page.screenshot({ path: '/workspace/test-normandy-trees.png', fullPage: false });
console.log('Screenshot 4: Trees at 5km');

await browser.close();
await server.close();
console.log('\n✓ All screenshots captured successfully');
