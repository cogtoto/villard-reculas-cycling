// Debug route loading
import { test } from '@playwright/test';

test('debug route load', async ({ page }) => {
  // Capture all console messages
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('BROWSER:', text);
  });
  
  // Capture errors
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    logs.push('ERROR: ' + err.message);
  });
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  console.log('\n=== Initial logs ===');
  logs.forEach(log => console.log(log));
  
  // Try to select route
  await page.evaluate(() => {
    console.log('Selected route before:', window.selectedRoute);
    window.selectedRoute = 'normandy';
    console.log('Selected route after:', window.selectedRoute);
  });
  
  await page.waitForTimeout(2000);
  
  // Check if there's a route selection UI
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.textContent);
  });
  console.log('Buttons on page:', buttons);
  
  // Try clicking Normandy button if it exists
  const normandyBtn = await page.$('button:has-text("Normandy")');
  if (normandyBtn) {
    console.log('Clicking Normandy button...');
    await normandyBtn.click();
    await page.waitForTimeout(15000);
  }
  
  console.log('\n=== Final logs ===');
  logs.slice(-30).forEach(log => console.log(log));
  
  const finalState = await page.evaluate(() => {
    return {
      selectedRoute: window.selectedRoute,
      track: !!window.track,
      scene: window.scene ? { children: window.scene.children.length, background: window.scene.background } : null,
      _skyDome: !!window._skyDome
    };
  });
  
  console.log('\nFinal state:', JSON.stringify(finalState, null, 2));
});
