import { test } from '@playwright/test';

test('debug timer with console logs', async ({ page }) => {
  page.on('console', msg => console.log('[BROWSER]', msg.text()));
  
  await page.goto('http://localhost:5173');
  
  await page.fill('#ftp-input', '160');
  await page.click('#ftp-ok');
  await page.click('#mode-ok');
  await page.click('#ride-go');
  
  console.log('Waiting 30 seconds to observe timer behavior...');
  await page.waitForTimeout(30000);
  
  const timer = await page.locator('#ride-time').textContent();
  console.log('Final timer value:', timer);
});
