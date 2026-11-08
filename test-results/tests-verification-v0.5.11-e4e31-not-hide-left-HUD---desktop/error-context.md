# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/verification-v0.5.11.spec.js >> v0.5.11 Verification - Compact FTP Ramp Legend >> FTP Ramp legend compact and does not hide left HUD - desktop
- Location: tests/verification-v0.5.11.spec.js:5:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - text: "Power:"
      - strong [ref=e4]: "108"
      - text: W
      - generic [ref=e5]: Z2
    - generic [ref=e6]:
      - text: "Your FTP:"
      - strong [ref=e7]: "160"
      - text: W (67 %)
    - generic [ref=e8]:
      - text: "Cadence:"
      - strong [ref=e9]: "85"
      - text: rpm
    - generic [ref=e10]:
      - text: "Speed:"
      - strong [ref=e11]: "10.8"
      - text: km/h
    - generic [ref=e12]:
      - text: "Grade:"
      - strong [ref=e13]: "-1.0"
      - text: "% (GPX) · Alt:"
      - strong [ref=e14]: "1495"
      - text: m
    - generic [ref=e15]:
      - text: "Distance:"
      - strong [ref=e16]: 0.01 / 26.6
      - text: km
    - generic [ref=e17]:
      - text: "Time:"
      - strong [ref=e18]: 00:27
    - generic [ref=e19]:
      - text: "Source:"
      - strong [ref=e20]: mock
    - button "Connect HomeTrainer" [ref=e22]
  - generic [ref=e23]: Breathe easy - in through nose, out through mouth
  - generic [ref=e24]:
    - generic [ref=e25]: FTP Ramp Test
    - strong [ref=e27]: Warm-up
    - generic [ref=e28]:
      - text: "Target:"
      - strong [ref=e29]: "66"
      - text: "W · Actual:"
      - strong [ref=e30]: "104"
      - text: W
    - generic [ref=e31]:
      - text: "Interval:"
      - strong [ref=e32]: 2:32
      - text: "· Total:"
      - strong [ref=e33]: 32:32
    - generic [ref=e34]: "Next: Ramp 100W"
    - generic [ref=e37]:
      - generic [ref=e38]: "Warm: 38–63% (60–100W)"
      - text: ·
      - generic [ref=e40]: "Ramp: 63%→425% (100W→680W, +20W/min)"
    - button "Stop Test" [ref=e42]
  - generic [ref=e43]: Real GPS routes · Mock data by default · BLE when FTMS/Power sensor found · +/− = virtual gears (trainer resistance)
  - button "Stop ride" [ref=e44]: ■ Stop
```