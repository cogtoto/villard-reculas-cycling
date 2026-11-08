# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/verification-v0.5.10.spec.js >> v0.5.10 Verification - Timer and Complete Legend >> timer continues after stop and resume
- Location: tests/verification-v0.5.10.spec.js:195:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#stats-resume')
    - locator resolved to <button class="vv-b" id="stats-resume">Resume ride</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - text: "Power:"
      - strong [ref=e4]: "185"
      - text: W
      - generic [ref=e5]: Z5
    - generic [ref=e6]:
      - text: "Your FTP:"
      - strong [ref=e7]: "160"
      - text: W (116 %)
    - generic [ref=e8]:
      - text: "Cadence:"
      - strong [ref=e9]: "65"
      - text: rpm
    - generic [ref=e10]:
      - text: "Speed:"
      - strong [ref=e11]: "11.9"
      - text: km/h
    - generic [ref=e12]:
      - text: "Grade:"
      - strong [ref=e13]: "-0.9"
      - text: "% (GPX) · Alt:"
      - strong [ref=e14]: "1495"
      - text: m
    - generic [ref=e15]:
      - text: "Distance:"
      - strong [ref=e16]: 0.00 / 26.6
      - text: km
    - generic [ref=e17]:
      - text: "Time:"
      - strong [ref=e18]: 00:26
    - generic [ref=e19]:
      - text: "Source:"
      - strong [ref=e20]: mock
    - button "Connect HomeTrainer" [ref=e22]
  - generic [ref=e23]: Real GPS routes · Mock data by default · BLE when FTMS/Power sensor found · +/− = virtual gears (trainer resistance)
  - generic [ref=e24]:
    - button "Gear up" [ref=e25]: +
    - generic [ref=e26]: "12"
    - button "Gear down" [ref=e27]: −
  - button "Stop ride" [ref=e28]: ■ Stop
  - generic [ref=e30]:
    - heading "Ride summary" [level=2] [ref=e31]
    - generic [ref=e32]: Villard-Reculas (Oisans) · ride paused
    - generic [ref=e33]:
      - generic [ref=e34]: Time & distance
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]: Riding time
          - generic [ref=e38]: 0m 01s
          - generic [ref=e39]: "Total: 0m 01s"
        - generic [ref=e40]:
          - generic [ref=e41]: Distance
          - generic [ref=e42]: 0.00 km
        - generic [ref=e43]:
          - generic [ref=e44]: Average speed
          - generic [ref=e45]: 4.4 km/h
        - generic [ref=e46]:
          - generic [ref=e47]: Top speed
          - generic [ref=e48]: 6.0 km/h
      - generic [ref=e49]: Climbing
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]: Climbed
          - generic [ref=e53]: 0 m
        - generic [ref=e54]:
          - generic [ref=e55]: Descended
          - generic [ref=e56]: 0 m
        - generic [ref=e57]:
          - generic [ref=e58]: Average slope
          - generic [ref=e59]: —
          - generic [ref=e60]: uphill minus downhill
      - generic [ref=e61]: Effort
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]: Average power
          - generic [ref=e65]: 120 W
          - generic [ref=e66]: 75 % of your FTP
        - generic [ref=e67]:
          - generic [ref=e68]: Max power
          - generic [ref=e69]: 157 W
        - generic [ref=e70]:
          - generic [ref=e71]: Normalized power
          - generic [ref=e72]: —
          - generic [ref=e73]: how hard it really felt
        - generic [ref=e74]:
          - generic [ref=e75]: Average cadence
          - generic [ref=e76]: 79 rpm
          - generic [ref=e77]: pedal turns per minute
      - generic [ref=e78]: "Time in each power zone (your FTP: 160 W)"
      - generic [ref=e79]:
        - generic [ref=e80]: Z1
        - generic [ref=e81]: Easy recovery
        - generic [ref=e84]: 0m 00s
      - generic [ref=e85]:
        - generic [ref=e86]: Z2
        - generic [ref=e87]: Endurance
        - generic [ref=e90]: 0m 00s
      - generic [ref=e91]:
        - generic [ref=e92]: Z3
        - generic [ref=e93]: Tempo
        - generic [ref=e96]: 0m 00s
      - generic [ref=e97]:
        - generic [ref=e98]: Z4
        - generic [ref=e99]: Threshold
        - generic [ref=e102]: 0m 00s
      - generic [ref=e103]:
        - generic [ref=e104]: Z5
        - generic [ref=e105]: VO2 max
        - generic [ref=e107]: 0m 00s
      - generic [ref=e108]:
        - generic [ref=e109]: Z6
        - generic [ref=e110]: Anaerobic
        - generic [ref=e112]: 0m 00s
      - generic [ref=e113]:
        - generic [ref=e114]: Z7
        - generic [ref=e115]: Sprint
        - generic [ref=e117]: 0m 00s
    - generic [ref=e118]:
      - button "⬇ Download for Garmin" [ref=e119]
      - button "Resume ride" [ref=e120]
      - button "End ride" [ref=e121]
  - generic "Cliquer sur le parcours pour s’y téléporter" [ref=e123] [cursor=pointer]
```

# Test source

```ts
  120 |     const legend = page.locator('#workout-legend');
  121 |     await expect(legend).toBeVisible();
  122 |     
  123 |     const legendText = await legend.textContent();
  124 |     console.log('FTP Ramp legend:', legendText);
  125 |     
  126 |     // Should contain warm-up and ramp phases
  127 |     expect(legendText).toContain('Warm');
  128 |     expect(legendText).toContain('Ramp');
  129 |     
  130 |     await page.screenshot({ 
  131 |       path: '/opt/cursor/artifacts/v0.5.10-ftp-ramp-complete-legend-desktop.png',
  132 |       fullPage: false
  133 |     });
  134 |   });
  135 | 
  136 |   test('Explosive Power shows complete legend with all phases', async ({ page }) => {
  137 |     await page.setViewportSize({ width: 1280, height: 720 });
  138 |     await page.goto('http://localhost:5173');
  139 |     
  140 |     await page.fill('#ftp-input', '160');
  141 |     await page.click('#ftp-ok');
  142 |     await page.check('input[name="mode"][value="explosive-power"]');
  143 |     await page.click('#mode-ok');
  144 |     await page.click('#ride-go');
  145 |     
  146 |     await page.waitForTimeout(5000);
  147 |     
  148 |     const legend = page.locator('#workout-legend');
  149 |     await expect(legend).toBeVisible();
  150 |     
  151 |     const legendText = await legend.textContent();
  152 |     console.log('Explosive Power legend:', legendText);
  153 |     
  154 |     // Should contain all phase types
  155 |     expect(legendText).toContain('Warm');
  156 |     expect(legendText).toContain('Work');
  157 |     expect(legendText).toContain('Rec'); // Recovery
  158 |     expect(legendText).toContain('Cool'); // Cooldown
  159 |     
  160 |     await page.screenshot({ 
  161 |       path: '/opt/cursor/artifacts/v0.5.10-explosive-complete-legend-desktop.png',
  162 |       fullPage: false
  163 |     });
  164 |   });
  165 | 
  166 |   test('Mobile landscape shows complete legend readable', async ({ page }) => {
  167 |     await page.setViewportSize({ width: 854, height: 480 });
  168 |     await page.goto('http://localhost:5173');
  169 |     
  170 |     await page.fill('#ftp-input', '160');
  171 |     await page.click('#ftp-ok');
  172 |     await page.check('input[name="mode"][value="sweet-spot"]');
  173 |     await page.click('#mode-ok');
  174 |     await page.click('#ride-go');
  175 |     
  176 |     await page.waitForTimeout(5000);
  177 |     
  178 |     const legend = page.locator('#workout-legend');
  179 |     await expect(legend).toBeVisible();
  180 |     
  181 |     const legendText = await legend.textContent();
  182 |     
  183 |     // Verify all phases present
  184 |     expect(legendText).toContain('Warm');
  185 |     expect(legendText).toContain('Work');
  186 |     expect(legendText).toContain('Rec');
  187 |     expect(legendText).toContain('Cool');
  188 |     
  189 |     await page.screenshot({ 
  190 |       path: '/opt/cursor/artifacts/v0.5.10-sweet-spot-complete-legend-mobile.png',
  191 |       fullPage: false
  192 |     });
  193 |   });
  194 | 
  195 |   test('timer continues after stop and resume', async ({ page }) => {
  196 |     await page.setViewportSize({ width: 1280, height: 720 });
  197 |     await page.goto('http://localhost:5173');
  198 |     
  199 |     await page.fill('#ftp-input', '160');
  200 |     await page.click('#ftp-ok');
  201 |     await page.click('#mode-ok');
  202 |     await page.click('#ride-go');
  203 |     
  204 |     await page.waitForTimeout(5000);
  205 |     
  206 |     const timer1 = await page.locator('#ride-time').textContent();
  207 |     console.log('Time before stop:', timer1);
  208 |     
  209 |     // Stop
  210 |     await page.click('#stop-btn');
  211 |     await page.waitForTimeout(500);
  212 |     const timerAtStop = await page.locator('#ride-time').textContent();
  213 |     console.log('Time at stop:', timerAtStop);
  214 |     
  215 |     // Confirm stop (opens stats modal)
  216 |     await page.click('#stop-yes');
  217 |     await page.waitForTimeout(1000);
  218 |     
  219 |     // Resume
> 220 |     await page.click('#stats-resume');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  221 |     await page.waitForTimeout(500);
  222 |     
  223 |     const timerAfterResume = await page.locator('#ride-time').textContent();
  224 |     console.log('Time after resume:', timerAfterResume);
  225 |     
  226 |     // Timer should have kept the value from stop
  227 |     expect(timerAfterResume).toBe(timerAtStop);
  228 |     
  229 |     // Wait a bit and verify it continues
  230 |     await page.waitForTimeout(5000);
  231 |     const timerContinued = await page.locator('#ride-time').textContent();
  232 |     console.log('Time after continuing:', timerContinued);
  233 |     
  234 |     expect(timerContinued).not.toBe(timerAfterResume);
  235 |     
  236 |     await page.screenshot({ 
  237 |       path: '/opt/cursor/artifacts/v0.5.10-timer-resume-verification.png',
  238 |       fullPage: false
  239 |     });
  240 |   });
  241 | 
  242 |   test('legend shows correct values for FTP 200W', async ({ page }) => {
  243 |     await page.setViewportSize({ width: 1280, height: 720 });
  244 |     await page.goto('http://localhost:5173');
  245 |     
  246 |     // Use FTP 200 instead of 160
  247 |     await page.fill('#ftp-input', '200');
  248 |     await page.click('#ftp-ok');
  249 |     await page.check('input[name="mode"][value="sweet-spot"]');
  250 |     await page.click('#mode-ok');
  251 |     await page.click('#ride-go');
  252 |     
  253 |     await page.waitForTimeout(5000);
  254 |     
  255 |     const legendText = await page.locator('#workout-legend').textContent();
  256 |     console.log('Legend with FTP 200:', legendText);
  257 |     
  258 |     // Warm-up 60-100W should be 30-50% at FTP 200
  259 |     expect(legendText).toContain('30–50%');
  260 |     expect(legendText).toContain('60–100W');
  261 |     
  262 |     await page.screenshot({ 
  263 |       path: '/opt/cursor/artifacts/v0.5.10-ftp-200-complete-legend.png',
  264 |       fullPage: false
  265 |     });
  266 |   });
  267 | });
  268 | 
```