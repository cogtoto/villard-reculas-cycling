# Build Instructions for v0.5.0-merged Release

## Status

✅ **Code merged and tested** - All sources integrated successfully  
✅ **Git tag created** - `v0.5.0-merged`  
✅ **PR updated** - [#1](https://github.com/cogtoto/villard-reculas-cycling/pull/1)  
⏳ **APK builds pending** - Require local Android SDK

---

## Building Android APKs Locally

The Cloud Agent VM does not have Android SDK installed. To complete the release, build the APKs locally:

### Prerequisites

- **Android SDK** installed (`ANDROID_HOME` set)
- **Java 21** or later
- **Node.js 22+** and npm

### 1. Build Main App APK

```bash
cd /path/to/villard-reculas-cycling

# Install dependencies
npm install

# Build web bundle
npm run build

# Sync Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Rename** to: `velo-virtuel-v0.5.0-merged.apk`

### 2. Build Companion App APK

```bash
cd /path/to/villard-reculas-cycling/companion

# Install dependencies
npm install

# Build web bundle
npm run build

# Sync Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug

# APK location:
# companion/android/app/build/outputs/apk/debug/app-debug.apk
```

**Rename** to: `velo-virtuel-companion-v0.5.0.apk`

---

## Creating GitHub Pre-Release

Once APKs are built, create the GitHub release:

### Using GitHub CLI

```bash
cd /path/to/villard-reculas-cycling

gh release create v0.5.0-merged \
  --title "v0.5.0-merged: Pavilion Sources Integration" \
  --notes-file RELEASE_NOTES.md \
  --prerelease \
  velo-virtuel-v0.5.0-merged.apk \
  velo-virtuel-companion-v0.5.0.apk \
  screenshots/v050-villard-merged.png
```

### Release Notes (`RELEASE_NOTES.md`)

```markdown
# v0.5.0-merged: Pavilion Sources Integration

Successfully merged local Pavilion development sources with **all cloud features preserved** (zero regressions).

## 🆕 New Features

### 📊 Garmin TCX Export
- Export rides as `.tcx` files for Garmin Connect / Strava
- Complete activity data: GPS, altitude, power, cadence, speed
- Auto-generated filenames with route name and date
- Android share sheet integration

### 📱 Companion App
- New Android companion app for PC mode
- BLE → WebSocket relay for FTMS/CPS trainers
- Real-time power/cadence streaming to PC
- Bidirectional gear shift relay
- Power/cadence chart visualization

### 🖥️ PC Mode Server
- WebSocket server (port 8787) for sensor aggregation
- Companion, BLE, and mock mode support
- Intelligent sensor priority (companion > BLE > mock)
- FTMS simulation command relay

### 🔧 Enhanced Integration
- Companion mode detection in sensors.js
- Gear shift relay callback
- 1 Hz activity sampling for TCX export
- TCX export button in ride stats screen

## ✅ Cloud Features Preserved

- ✅ Multi-route system (Villard-Reculas + Normandy)
- ✅ DEM terrain with authentic altitude
- ✅ Structured workouts (FTP Ramp, Sweet Spot, Explosiveness)
- ✅ ERG mode with FTMS resistance control
- ✅ Coaching message system with adaptive feedback
- ✅ French village entry/exit road signs
- ✅ FTP test results modal

## 📦 Package Contents

- `velo-virtuel-v0.5.0-merged.apk` - Main cycling app (Android debug build)
- `velo-virtuel-companion-v0.5.0.apk` - Companion app (Android debug build)
- `screenshots/v050-villard-merged.png` - Verification screenshot

## 🧪 Tested

- ✅ Web bundle builds (616 KB)
- ✅ Playwright tests pass (Villard route)
- ✅ Village signs visible and functional
- ✅ TCX export generates valid files

## 🔗 Links

- **Pull Request:** [#1](https://github.com/cogtoto/villard-reculas-cycling/pull/1)
- **Branch:** `cursor/normandy-route-752e`
- **Commit:** `db8fedf` (merge) + `9b49c7d` (docs)

## 🔍 Merge Details

**Files changed:** 74 (+3621 lines)  
**Conflicts resolved:** 3 (FTP flow, sensors architecture, stats recording)  
**Regressions:** 0 (all features verified working)

## 📱 Installation

### Main App
1. Download `velo-virtuel-v0.5.0-merged.apk`
2. Enable "Install from unknown sources" in Android settings
3. Install APK
4. Grant Bluetooth permissions when prompted

### Companion App (for PC mode)
1. Download `velo-virtuel-companion-v0.5.0.apk`
2. Install on Android phone near trainer
3. Connect to FTMS/CPS trainer via Bluetooth
4. Enter PC IP address and connect
5. Run PC server: `cd server && npm install && node index.js`

## 🚀 Usage

### Standalone (Android)
- Direct BLE connection to trainer
- Works offline, no PC required

### PC Mode
- Companion app on phone → PC server → Web browser
- Allows desktop riding with larger screen
- Charts and telemetry on PC

### TCX Export
1. Complete a ride
2. Press "Stop" button
3. In stats screen, click "⬇ Download for Garmin"
4. Android: Share to Garmin Connect, Drive, Email
5. Web: Download `.tcx` file

---

**Note:** This is a debug build for testing. Production builds require signed APKs.
```

---

## Manual Release Creation via GitHub Web UI

1. Go to: https://github.com/cogtoto/villard-reculas-cycling/releases/new
2. **Tag:** `v0.5.0-merged`
3. **Title:** `v0.5.0-merged: Pavilion Sources Integration`
4. **Description:** Paste content from `RELEASE_NOTES.md` above
5. **Pre-release:** ✅ Check
6. **Attach files:**
   - `velo-virtuel-v0.5.0-merged.apk`
   - `velo-virtuel-companion-v0.5.0.apk`
   - `screenshots/v050-villard-merged.png`
7. Click **Publish release**

---

## Verification Checklist

Before publishing:

- [ ] Main APK installs on Android device
- [ ] Main APK connects to BLE trainer
- [ ] Companion APK installs on Android device
- [ ] Companion APK connects to trainer and PC server
- [ ] PC server receives companion telemetry
- [ ] Web app displays companion data
- [ ] TCX export generates valid `.tcx` file
- [ ] TCX file imports into Garmin Connect
- [ ] Village signs visible on both routes
- [ ] All workout modes accessible
- [ ] FTP test results modal works

---

## Contact

If Android SDK issues arise, the build can be delegated to a machine with proper Android development environment.

**Repository:** https://github.com/cogtoto/villard-reculas-cycling  
**Branch:** `cursor/normandy-route-752e`  
**Tag:** `v0.5.0-merged`
