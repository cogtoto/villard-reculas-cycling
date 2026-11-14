import { test, expect } from '@playwright/test';

test.describe('v0.5.10 Verification - Timer and Complete Legend', () => {
  
  test('timer advances during free ride - 20 second wait', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok'); // Free ride
    await page.click('#ride-go');
    
    // Wait for scene to fully load
    await page.waitForTimeout(3000);
    
    const timer = page.locator('#ride-time');
    const initialTime = await timer.textContent();
    console.log('Initial time:', initialTime);
    
    // Wait 20 seconds to ensure timer advances significantly
    await page.waitForTimeout(20000);
    
    const finalTime = await timer.textContent();
    console.log('Final time after 20s:', finalTime);
    
    // Timer should show at least 00:18 or more
    const [mins, secs] = finalTime.split(':').map(Number);
    const totalSecs = mins * 60 + secs;
    
    expect(totalSecs).toBeGreaterThanOrEqual(18);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-timer-free-ride-20s-desktop.png',
      fullPage: false
    });
  });

  test('timer advances during Sweet Spot workout - 20 second wait', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    // Wait for scene and workout to load
    await page.waitForTimeout(3000);
    
    const timer = page.locator('#ride-time');
    const initialTime = await timer.textContent();
    console.log('Initial workout time:', initialTime);
    
    // Wait 20 seconds
    await page.waitForTimeout(20000);
    
    const finalTime = await timer.textContent();
    console.log('Final workout time after 20s:', finalTime);
    
    // Timer should show at least 00:18
    const [mins, secs] = finalTime.split(':').map(Number);
    const totalSecs = mins * 60 + secs;
    
    expect(totalSecs).toBeGreaterThanOrEqual(18);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-timer-sweet-spot-20s-desktop.png',
      fullPage: false
    });
  });

  test('Sweet Spot workout shows complete legend with all phases', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    const legend = page.locator('#workout-legend');
    await expect(legend).toBeVisible();
    
    const legendText = await legend.textContent();
    console.log('Legend text:', legendText);
    
    // Should contain all distinct phase types
    expect(legendText).toContain('Warm');
    expect(legendText).toContain('Work');
    expect(legendText).toContain('Rec'); // Recovery
    expect(legendText).toContain('Cool'); // Cooldown
    
    // Should show FTP percentages and watts
    expect(legendText).toMatch(/\d+%/); // Has percentage
    expect(legendText).toMatch(/\d+W/); // Has watts
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-sweet-spot-complete-legend-desktop.png',
      fullPage: false
    });
  });

  test('FTP Ramp Test shows complete legend with all phases', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="ftp-ramp-test"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    const legend = page.locator('#workout-legend');
    await expect(legend).toBeVisible();
    
    const legendText = await legend.textContent();
    console.log('FTP Ramp legend:', legendText);
    
    // Should contain warm-up and ramp phases
    expect(legendText).toContain('Warm');
    expect(legendText).toContain('Ramp');
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-ftp-ramp-complete-legend-desktop.png',
      fullPage: false
    });
  });

  test('Explosive Power shows complete legend with all phases', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="explosive-power"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    const legend = page.locator('#workout-legend');
    await expect(legend).toBeVisible();
    
    const legendText = await legend.textContent();
    console.log('Explosive Power legend:', legendText);
    
    // Should contain all phase types
    expect(legendText).toContain('Warm');
    expect(legendText).toContain('Work');
    expect(legendText).toContain('Rec'); // Recovery
    expect(legendText).toContain('Cool'); // Cooldown
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-explosive-complete-legend-desktop.png',
      fullPage: false
    });
  });

  test('Mobile landscape shows complete legend readable', async ({ page }) => {
    await page.setViewportSize({ width: 854, height: 480 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    const legend = page.locator('#workout-legend');
    await expect(legend).toBeVisible();
    
    const legendText = await legend.textContent();
    
    // Verify all phases present
    expect(legendText).toContain('Warm');
    expect(legendText).toContain('Work');
    expect(legendText).toContain('Rec');
    expect(legendText).toContain('Cool');
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-sweet-spot-complete-legend-mobile.png',
      fullPage: false
    });
  });

  test('timer continues after stop and resume', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    const timer1 = await page.locator('#ride-time').textContent();
    console.log('Time before stop:', timer1);
    
    // Stop
    await page.click('#stop-btn');
    await page.waitForTimeout(500);
    const timerAtStop = await page.locator('#ride-time').textContent();
    console.log('Time at stop:', timerAtStop);
    
    // Confirm stop (opens stats modal)
    await page.click('#stop-yes');
    await page.waitForTimeout(1000);
    
    // Resume
    await page.click('#stats-resume');
    await page.waitForTimeout(500);
    
    const timerAfterResume = await page.locator('#ride-time').textContent();
    console.log('Time after resume:', timerAfterResume);
    
    // Timer should have kept the value from stop
    expect(timerAfterResume).toBe(timerAtStop);
    
    // Wait a bit and verify it continues
    await page.waitForTimeout(5000);
    const timerContinued = await page.locator('#ride-time').textContent();
    console.log('Time after continuing:', timerContinued);
    
    expect(timerContinued).not.toBe(timerAfterResume);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-timer-resume-verification.png',
      fullPage: false
    });
  });

  test('legend shows correct values for FTP 200W', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    // Use FTP 200 instead of 160
    await page.fill('#ftp-input', '200');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(5000);
    
    const legendText = await page.locator('#workout-legend').textContent();
    console.log('Legend with FTP 200:', legendText);
    
    // Warm-up 60-100W should be 30-50% at FTP 200
    expect(legendText).toContain('30–50%');
    expect(legendText).toContain('60–100W');
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.10-ftp-200-complete-legend.png',
      fullPage: false
    });
  });
});
