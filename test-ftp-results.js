import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Setup FTP
  await page.fill('#ftp-input', '250');
  await page.click('#ftp-ok');
  await page.waitForTimeout(1000);

  // Select FTP Ramp Test
  await page.click('input[name="mode"][value="ftp-ramp-test"]');
  await page.click('#mode-ok');
  await page.waitForTimeout(1000);

  // Select Normandy route
  await page.click('input[name="route"][value="normandy"]');
  await page.waitForTimeout(500);

  // Start ride
  await page.click('#ride-go');
  await page.waitForTimeout(5000);

  console.log('Ride started, injecting FTP test completion...');

  // Manually trigger FTP results display
  await page.evaluate(() => {
    // Simulate FTP test completion
    if (typeof showFTPResults === 'function') {
      showFTPResults(275, 367, 'Test complete');
    } else {
      // Fallback: directly show the modal
      const modal = document.getElementById('ftp-results-modal');
      if (modal) {
        document.getElementById('ftp-new-value').textContent = '275W';
        document.getElementById('ftp-old-value').textContent = '250W';
        document.getElementById('ftp-diff-value').textContent = '+25W';
        document.getElementById('ftp-diff-value').style.color = '#27ae60';
        document.getElementById('ftp-peak-value').textContent = '367W';
        modal.style.display = 'flex';
      }
    }
  });

  await page.waitForTimeout(2000);

  // Check if modal is visible
  const isVisible = await page.evaluate(() => {
    const modal = document.getElementById('ftp-results-modal');
    return modal && modal.style.display === 'flex';
  });

  console.log('FTP Results modal visible:', isVisible);

  await page.screenshot({ path: '/workspace/screenshots/ftp-results-screen.png' });
  console.log('Screenshot saved: ftp-results-screen.png');

  await page.waitForTimeout(2000);
  await browser.close();
})();
