import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5178 }, logLevel: 'error' });
await server.listen();

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] }); // Non-headless to see UI
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

page.on('console', msg => {
  console.log('BROWSER:', msg.text());
});

await page.goto('http://localhost:5178');
await page.waitForTimeout(2000);

// Fill FTP
console.log('=== Step 1: Enter FTP ===');
await page.fill('#ftp-input', '200');
await page.click('#ftp-ok');
await page.waitForTimeout(500);

// Select workout mode
console.log('=== Step 2: Select Mode (Sweet Spot) ===');
await page.click('input[name="mode"][value="sweet-spot"]');
await page.waitForTimeout(300);
await page.click('#mode-ok');
await page.waitForTimeout(500);

// Select route
console.log('=== Step 3: Select Route (Normandy) ===');
await page.click('input[name="route"][value="normandy"]');
await page.waitForTimeout(300);
await page.click('#ride-go');
console.log('=== Ride started ===');

// Wait for scene to load
await page.waitForTimeout(8000);

// Take screenshot
await page.screenshot({ path: '/workspace/test-workout-ui.png', fullPage: false });
console.log('Screenshot captured');

// Keep browser open for manual testing
console.log('\n=== Browser open for manual testing. Press Ctrl+C to exit ===');
await page.waitForTimeout(300000); // 5 minutes

await browser.close();
await server.close();
