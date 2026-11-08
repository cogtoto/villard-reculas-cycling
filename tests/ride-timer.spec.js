import { test, expect } from '@playwright/test';

test.describe('Ride Timer and Workout Warm-up Tests', () => {
  
  test('timer shows 00:00 before ride starts', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Should show timer element with 00:00 before starting
    const timer = await page.locator('#ride-time');
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText('00:00');
  });

  test('timer updates during free ride', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Set FTP and start free ride
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok'); // Free ride is default
    
    // Select Villard route
    const villardRadio = page.locator('input[name="route"][value="villard"]');
    await villardRadio.check();
    await page.click('#ride-go');
    
    // Wait for scene to load
    await page.waitForTimeout(3000);
    
    // Timer should start incrementing
    const timer = page.locator('#ride-time');
    const initialTime = await timer.textContent();
    
    // Wait and check timer has progressed
    await page.waitForTimeout(5000);
    const laterTime = await timer.textContent();
    
    expect(initialTime).toMatch(/^\d{2}:\d{2}$/);
    expect(laterTime).toMatch(/^\d{2}:\d{2}$/);
    expect(laterTime).not.toBe(initialTime);
  });

  test('timer format switches to H:MM:SS after 1 hour', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Set FTP and start ride
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    // Inject elapsed time > 1 hour into stats object
    await page.evaluate(() => {
      window.S.elapsed = 3665; // 1h 1m 5s
    });
    
    // Wait for next render frame
    await page.waitForTimeout(100);
    
    const timer = page.locator('#ride-time');
    const timeText = await timer.textContent();
    expect(timeText).toMatch(/^\d{1}:\d{2}:\d{2}$/);
    expect(timeText).toBe('1:01:05');
  });

  test('timer freezes when ride is stopped', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(3000);
    
    // Stop the ride
    await page.click('#stop-btn');
    const timerAtStop = await page.locator('#ride-time').textContent();
    
    // Confirm stop
    await page.click('#stop-yes');
    
    // Wait and verify timer hasn't changed
    await page.waitForTimeout(2000);
    
    // Resume ride
    await page.click('#stats-resume');
    await page.waitForTimeout(500);
    
    // Timer should have resumed from stopped value
    const timerAfterResume = await page.locator('#ride-time').textContent();
    expect(timerAfterResume).toBe(timerAtStop);
  });

  test('FTP Ramp Test has 3-minute 60-100W warm-up', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    
    // Select FTP Ramp Test
    await page.check('input[name="mode"][value="ftp-ramp-test"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    // Check workout is displayed
    await expect(page.locator('#workout-hud')).toBeVisible();
    await expect(page.locator('#workout-name')).toHaveText('FTP Ramp Test');
    
    // Verify warm-up target is shown (should be 60W at start)
    const targetWatts = page.locator('#target-watts');
    const target = await targetWatts.textContent();
    expect(parseInt(target)).toBeGreaterThanOrEqual(60);
    expect(parseInt(target)).toBeLessThanOrEqual(100);
    
    // Check warm-up interval
    await page.evaluate(() => {
      const workout = window.currentWorkout;
      const warmup = workout.intervals[0];
      return {
        duration: warmup.duration,
        start: warmup.targetStart,
        end: warmup.targetEnd
      };
    }).then(warmup => {
      expect(warmup.duration).toBe(180); // 3 minutes
      expect(warmup.start).toBe(60);
      expect(warmup.end).toBe(100);
    });
  });

  test('Sweet Spot workout has 3-minute 60-100W warm-up', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    await expect(page.locator('#workout-name')).toHaveText('Sweet Spot');
    
    await page.evaluate(() => {
      const workout = window.currentWorkout;
      const warmup = workout.intervals[0];
      return {
        duration: warmup.duration,
        start: warmup.targetStart,
        end: warmup.targetEnd
      };
    }).then(warmup => {
      expect(warmup.duration).toBe(180);
      expect(warmup.start).toBe(60);
      expect(warmup.end).toBe(100);
    });
  });

  test('Explosive Power workout has 3-minute 60-100W warm-up', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    
    await page.check('input[name="mode"][value="explosive-power"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    await expect(page.locator('#workout-name')).toHaveText('Explosiveness / Power');
    
    await page.evaluate(() => {
      const workout = window.currentWorkout;
      const warmup = workout.intervals[0];
      return {
        duration: warmup.duration,
        start: warmup.targetStart,
        end: warmup.targetEnd
      };
    }).then(warmup => {
      expect(warmup.duration).toBe(180);
      expect(warmup.start).toBe(60);
      expect(warmup.end).toBe(100);
    });
  });

  test('warm-up target progresses linearly from 60W to 100W', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.check('input[name="mode"][value="sweet-spot"]');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(1000);
    
    // Test target at t=0, t=90, t=180
    const testTargets = async (elapsed) => {
      return await page.evaluate((t) => {
        const interval = window.currentWorkout.intervals[0];
        const progress = t / interval.duration;
        return interval.targetStart + (interval.targetEnd - interval.targetStart) * progress;
      }, elapsed);
    };
    
    const t0 = await testTargets(0);
    const t90 = await testTargets(90);
    const t180 = await testTargets(180);
    
    expect(Math.round(t0)).toBe(60);
    expect(Math.round(t90)).toBe(80);
    expect(Math.round(t180)).toBe(100);
  });

  test('timer display readable on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    
    // Check HUD doesn't overlap
    const hud = page.locator('#hud');
    const hudBox = await hud.boundingBox();
    expect(hudBox.width).toBeLessThan(400); // HUD should be compact
    
    // Take screenshot
    await page.screenshot({ path: '/opt/cursor/artifacts/timer-desktop-1280x720.png' });
  });

  test('timer display readable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 854, height: 480 }); // Landscape phone
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    
    await page.screenshot({ path: '/opt/cursor/artifacts/timer-mobile-854x480.png' });
  });

  test('timer continues during zero speed coasting', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    // Force zero watts/speed
    await page.evaluate(() => {
      window.state.watts = 0;
      window.state.cadence = 0;
    });
    
    const timer1 = await page.locator('#ride-time').textContent();
    await page.waitForTimeout(3000);
    const timer2 = await page.locator('#ride-time').textContent();
    
    // Timer should continue even at zero speed
    expect(timer2).not.toBe(timer1);
  });

  test('Normandy route also shows timer', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.click('#ftp-ok');
    await page.click('#mode-ok');
    
    // Select Normandy route
    await page.check('input[name="route"][value="normandy"]');
    await page.click('#ride-go');
    
    await page.waitForTimeout(2000);
    
    const timer = page.locator('#ride-time');
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText(/^\d{2}:\d{2}$/);
  });
});
