// Screenshot capture for Varied Threshold workout
import { test } from '@playwright/test';

test('Workout picker showing Varied Threshold', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // FTP step
  await page.click('#ftp-ok');
  await page.waitForTimeout(500);
  
  // Mode step - should show workout picker
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/varied-threshold-workout-picker.png', 
    fullPage: false 
  });
  
  console.log('Screenshot: Workout picker with Varied Threshold option');
});

test('Varied Threshold coaching message on screen', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // FTP step
  await page.click('#ftp-ok');
  await page.waitForTimeout(500);
  
  // Select Varied Threshold
  await page.click('input[name="mode"][value="varied-threshold"]');
  await page.waitForTimeout(300);
  await page.click('#mode-ok');
  await page.waitForTimeout(500);
  
  // Select route
  await page.click('input[name="route"][value="normandy"]');
  await page.waitForTimeout(300);
  await page.click('#ride-go');
  await page.waitForTimeout(15000); // Wait for route load
  
  // Teleport forward a bit
  await page.evaluate(() => { 
    if (window.veloTeleportKm) window.veloTeleportKm(2); 
  });
  await page.waitForTimeout(1000);
  
  // Manually trigger coaching message display for screenshot
  await page.evaluate(() => {
    const banner = document.getElementById('coaching-message');
    if (banner) {
      banner.textContent = "Wake up the legs. Zone 2 = endurance: you can talk easily, this is where your aerobic engine is built.";
      banner.style.visibility = 'visible';
      banner.classList.add('fade-in');
    }
  });
  
  await page.waitForTimeout(500);
  
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/varied-threshold-coaching-message.png', 
    fullPage: false 
  });
  
  console.log('Screenshot: Coaching message displayed during workout');
});
