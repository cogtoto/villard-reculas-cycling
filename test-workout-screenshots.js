import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5178 }, logLevel: 'error' });
await server.listen();

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

page.on('console', msg => {
  const txt = msg.text();
  if (txt.includes('Workout') || txt.includes('ERG') || txt.includes('error')) {
    console.log('→', txt);
  }
});

await page.goto('http://localhost:5178');
await page.waitForTimeout(2000);

// FTP screen
await page.screenshot({ path: '/workspace/screenshots/01-ftp-screen.png' });
await page.fill('#ftp-input', '200');
await page.click('#ftp-ok');
await page.waitForTimeout(800);

// Mode selection screen
await page.screenshot({ path: '/workspace/screenshots/02-mode-selection.png' });
await page.click('input[name="mode"][value="sweet-spot"]');
await page.waitForTimeout(300);
await page.click('#mode-ok');
await page.waitForTimeout(800);

// Route selection screen
await page.screenshot({ path: '/workspace/screenshots/03-route-selection.png' });
await page.click('input[name="route"][value="normandy"]');
await page.waitForTimeout(300);
await page.click('#ride-go');
console.log('=== Ride started with workout ===');

// Wait for scene to load and workout to start
await page.waitForTimeout(10000);

// Capture workout UI
await page.screenshot({ path: '/workspace/screenshots/04-workout-active.png' });
console.log('Screenshot: Workout active');

await page.waitForTimeout(5000);
await page.screenshot({ path: '/workspace/screenshots/05-workout-progress.png' });
console.log('Screenshot: Workout in progress');

await browser.close();
await server.close();
console.log('\n✓ Workflow test complete');
