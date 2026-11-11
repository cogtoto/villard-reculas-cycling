import { test } from '@playwright/test';

test('Check terrain alignment', async ({ page }) => {
  // Capture console messages
  page.on('console', msg => {
    console.log('BROWSER:', msg.text());
  });
  
  await page.goto('http://localhost:5173/tools/check-alignment.html');
  
  // Wait for completion
  await page.waitForFunction(() => {
    const text = document.getElementById('output').textContent;
    return text.includes('Sampling more points') || text.includes('FATAL ERROR');
  }, { timeout: 30000 });
  
  await page.waitForTimeout(2000);
  
  // Get the output
  const output = await page.textContent('#output');
  console.log('\n=== ALIGNMENT CHECK ===');
  console.log(output);
});
