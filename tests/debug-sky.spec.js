// Debug sky rendering
import { test } from '@playwright/test';

test('debug sky setup', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    window.selectedRoute = 'normandy';
  });
  
  await page.reload();
  await page.waitForTimeout(15000);
  
  // Check if sky dome exists
  const skyInfo = await page.evaluate(() => {
    return {
      skyDomeExists: !!window._skyDome,
      skyDomePosition: window._skyDome ? { x: window._skyDome.position.x, y: window._skyDome.position.y, z: window._skyDome.position.z } : null,
      skyDomeVisible: window._skyDome ? window._skyDome.visible : null,
      sceneChildren: window.scene ? window.scene.children.length : 0,
      sceneBackground: window.scene ? window.scene.background : null
    };
  });
  
  console.log('Sky dome info:', JSON.stringify(skyInfo, null, 2));
});
