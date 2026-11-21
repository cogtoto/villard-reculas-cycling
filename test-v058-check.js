import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[Console]', text);
  });

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
  await page.waitForTimeout(10000); // Wait for scene to load

  await page.screenshot({ path: '/agent/repos/villard-reculas-cycling/screenshots/v058-check.png' });

  await ctx.close();
  await browser.close();
  
  console.log('\n=== LOG SUMMARY ===');
  const houseLog = logs.find(l => l.includes('Half-timbered'));
  const churchLog = logs.find(l => l.includes('Churches:'));
  const vegLog = logs.find(l => l.includes('Vegetation:'));
  
  console.log('Houses:', houseLog || 'NOT FOUND');
  console.log('Churches:', churchLog || 'NOT FOUND');
  console.log('Vegetation:', vegLog || 'NOT FOUND');
})();
