import { test, expect } from '@playwright/test';

test.describe('v0.5.11 Verification - Compact FTP Ramp Legend', () => {
  
  test('FTP Ramp legend compact and does not hide left HUD - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="ftp-ramp-test"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(8000);
    
    // Verify left HUD is visible
    const leftHud = page.locator('#hud');
    await expect(leftHud).toBeVisible();
    
    // Verify timer is visible and advancing
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    const timerText = await timer.textContent();
    expect(timerText).toMatch(/\d{2}:\d{2}/);
    console.log('Timer shows:', timerText);
    
    // Verify power is visible
    const power = page.locator('#watts');
    await expect(power).toBeVisible();
    
    // Verify workout panel legend is compact
    const legend = page.locator('#workout-legend');
    await expect(legend).toBeVisible();
    const legendText = await legend.textContent();
    console.log('Legend text:', legendText);
    
    // Legend should mention ramp range, not list 30 stages
    expect(legendText).toContain('Warm');
    expect(legendText).toContain('Ramp');
    expect(legendText).toContain('→'); // Shows range
    expect(legendText).toContain('+20W/min'); // Shows increment info
    
    // Legend should NOT have 30 separate "Ramp:" entries
    const rampCount = (legendText.match(/Ramp:/g) || []).length;
    expect(rampCount).toBeLessThanOrEqual(1);
    
    // Verify workout HUD panel is bounded
    const workoutHud = page.locator('#workout-hud');
    const workoutBox = await workoutHud.boundingBox();
    console.log('Workout HUD width:', workoutBox.width);
    
    // Workout panel should not exceed reasonable width (e.g., 400px)
    expect(workoutBox.width).toBeLessThanOrEqual(450);
    
    // Verify left and right panels don't overlap
    const leftBox = await leftHud.boundingBox();
    const rightBox = await workoutHud.boundingBox();
    
    // Left panel should be on left side (x < 300)
    expect(leftBox.x).toBeLessThan(300);
    
    // Right panel should be on right side (x > 800)
    expect(rightBox.x).toBeGreaterThan(800);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.11-ftp-ramp-compact-legend-desktop.png',
      fullPage: false
    });
  });

  test('FTP Ramp legend compact on mobile landscape', async ({ page }) => {
    await page.setViewportSize({ width: 854, height: 480 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="ftp-ramp-test"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(8000);
    
    // Verify left HUD is visible
    const leftHud = page.locator('#hud');
    await expect(leftHud).toBeVisible();
    
    // Verify timer is visible
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    
    // Verify legend is compact
    const legend = page.locator('#workout-legend');
    const legendText = await legend.textContent();
    console.log('Mobile legend:', legendText);
    
    expect(legendText).toContain('Ramp');
    const rampCount = (legendText.match(/Ramp:/g) || []).length;
    expect(rampCount).toBeLessThanOrEqual(1);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.11-ftp-ramp-compact-legend-mobile.png',
      fullPage: false
    });
  });

  test('Sweet Spot legend unchanged and timer accurate', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(8000);
    
    const legend = page.locator('#workout-legend');
    const legendText = await legend.textContent();
    console.log('Sweet Spot legend:', legendText);
    
    // Verify all 4 phases still present
    expect(legendText).toContain('Warm');
    expect(legendText).toContain('Work');
    expect(legendText).toContain('Rec');
    expect(legendText).toContain('Cool');
    
    // Verify timer is visible and accurate
    const timer = page.locator('#ride-time');
    const timerText = await timer.textContent();
    console.log('Timer:', timerText);
    expect(timerText).toMatch(/00:0[5-9]|00:1[0-5]/); // Should be 5-15 seconds
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.11-sweet-spot-unchanged-desktop.png',
      fullPage: false
    });
  });

  test('Explosive Power legend unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="explosive-power"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(8000);
    
    const legend = page.locator('#workout-legend');
    const legendText = await legend.textContent();
    console.log('Explosive Power legend:', legendText);
    
    // Verify all phases present
    expect(legendText).toContain('Warm');
    expect(legendText).toContain('Work');
    expect(legendText).toContain('Rec');
    expect(legendText).toContain('Cool');
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.11-explosive-unchanged-desktop.png',
      fullPage: false
    });
  });

  test('Timer accuracy maintained in free ride', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok'); // Free ride
    await page.click('#ride-go');
    
    await page.waitForTimeout(3000);
    const initial = await page.locator('#ride-time').textContent();
    
    await page.waitForTimeout(15000);
    const final = await page.locator('#ride-time').textContent();
    
    console.log('Timer initial:', initial, '→ final:', final);
    
    // Should advance roughly 15 seconds
    const [m1, s1] = initial.split(':').map(Number);
    const [m2, s2] = final.split(':').map(Number);
    const elapsed = (m2 * 60 + s2) - (m1 * 60 + s1);
    
    expect(elapsed).toBeGreaterThanOrEqual(13);
    expect(elapsed).toBeLessThanOrEqual(20);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.11-timer-accuracy-free-ride.png',
      fullPage: false
    });
  });
});
