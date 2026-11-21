import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5177 }, logLevel: 'error' });
await server.listen();

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

// Capture ALL console messages
page.on('console', msg => {
  console.log('BROWSER:', msg.text());
});

await page.goto('http://localhost:5177');
await page.waitForTimeout(2000);

await page.fill('#ftp-input', '250');
await page.click('#ftp-ok');
await page.waitForTimeout(500);

await page.click('input[name="route"][value="normandy"]');
await page.waitForTimeout(300);

await page.click('#ride-go');
console.log('=== Starting Normandy route ===');

// Wait longer for scene to fully load and log
await page.waitForTimeout(8000);

await page.screenshot({ path: '/workspace/test-debug.png', fullPage: false });

await browser.close();
await server.close();
console.log('Done');
