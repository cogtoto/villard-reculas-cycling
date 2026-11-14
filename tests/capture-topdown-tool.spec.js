import { test } from '@playwright/test';

test('Capture standalone top-down terrain view', async ({ page }) => {
  // Navigate to standalone tool page
  await page.goto('http://localhost:5173/tools/terrain-topdown.html');
  
  // Wait for terrain to load
  await page.waitForFunction(() => {
    return document.querySelector('#info').textContent.includes('Ready');
  }, { timeout: 30000 });
  
  // Wait a bit more for render
  await page.waitForTimeout(2000);
  
  // Capture screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/v0.5.19-terrain-topdown-standalone.png',
    fullPage: false
  });
  
  // Capture console logs
  const logText = await page.textContent('#log');
  console.log('=== TERRAIN TOP-DOWN LOG ===');
  console.log(logText);
});
