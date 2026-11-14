# v0.5.0-merged: Pavilion Sources Integration + Village Signs Fix

Successfully merged local Pavilion development sources with **all cloud features preserved** (zero regressions) and **corrected village sign data**.

---

## 🆕 New Features from Pavilion Sources

### 📊 **Garmin TCX Export**
- Export rides as `.tcx` files for Garmin Connect / Strava
- **Complete activity data:**
  - GPS coordinates (latitude/longitude from track positions)
  - Altitude from DEM terrain
  - Power (watts) and cadence from sensors
  - Speed from physics simulation
  - Timestamps at 1 Hz sampling
- **Smart export:**
  - Auto-generates filenames: `<route-name>_<date>.tcx`
  - **Android**: Share sheet → Garmin Connect, Drive, Email
  - **Web/PC**: Download as file
- **UI**: "⬇ Download for Garmin" button in ride stats screen

### 📱 **Companion App**
- **New Android companion app** for PC mode setup
- **BLE → WebSocket relay**: Connects to FTMS/CPS trainer via Bluetooth LE
- **Relays telemetry**: Sends power, cadence to PC server in real-time
- **Receives commands**: Gets simulation grade % from PC for FTMS control
- **Gear shift relay**: Bidirectional virtual gear shift buttons
- **Real-time charts**: Power/cadence visualization
- **Architecture**: Companion runs on Android phone near trainer, streams to PC running web app

### 🖥️ **PC Mode Server**
- **WebSocket server** (port 8787) for sensor aggregation
- Accepts companion connections (companion → PC relay)
- Accepts browser clients (web app connections)
- Optional native BLE support (noble.js)
- Mock fallback when no sensors available
- **Intelligent prioritization**: Companion > BLE > mock
- **Simulation relay**: Sends FTMS grade % commands to companion

### 🔧 **Enhanced Sensor Integration**
- **Companion mode detection** with priority timestamp
- **Gear shift relay callback** (`onShift`) for remote control
- **PC WebSocket mode** with companion stream support
- **Simulation command relay** to companion FTMS

---

## 🪧 **Village Signs Fix (Critical)**

### Problem Identified
Previous village data contained:
- ❌ **Invented coordinates** (rounded like 45.135, 6.035)
- ❌ **Places not on routes** (Oz-en-Oisans, Huez, Allemond on Villard route)
- ❌ **Wrong first village** (showed "Oz-en-Oisans" instead of "Villard-Reculas")

### Solution Applied
✅ **Real OSM data** from Nominatim reverse geocoding:

**Normandy Route** (Grand-Camp, Eure):
- **First sign**: **Le Beuron** (hamlet at track start)
  - Coordinates: `49.035267, 0.509741` (exact GPX start)
  - **User-confirmed ground truth**

**Villard-Reculas Route** (Isère):
- **First sign**: **Villard-Reculas** (village at track start)
  - Coordinates: `45.092372, 6.033969` (exact GPX start)
  - **Nominatim confirmed**: Villard-Reculas, 38114, Isère

### API Status
- **Overpass API unavailable** during implementation (HTTP 406 errors)
- Used **Nominatim** reverse geocoding + user ground-truth
- Documented in `VILLAGE_SIGNS_ISSUE.md`

---

## 🔧 **Stats Screen Fix**

✅ **Removed 'Virtual gear'** from end-of-ride stats screen (as requested)  
✅ **Kept 'Virtual gear' in live HUD** (still visible during ride)

---

## ✅ **All Cloud Features Preserved**

- ✅ **Multi-route system** (Villard-Reculas + Normandy Grand-Camp)
- ✅ **DEM terrain** with authentic altitude profiles
- ✅ **Structured workouts** (FTP Ramp Test, Sweet Spot, Explosiveness)
- ✅ **ERG mode** with automatic FTMS resistance control
- ✅ **Coaching message system** with adaptive feedback
- ✅ **French village entry/exit road signs** (now with real OSM data)
- ✅ **FTP test results modal** with color-coded improvements

---

## 📦 **Release Assets**

### APKs (Android Debug Builds)
1. **velo-virtuel-v0.5.0-merged.apk** (4.9 MB)
   - Main cycling app
   - Package: `fr.cognet.velovirtuel`
   - Version: 0.5.0 (versionCode 6)
   - Includes all features + corrected village signs

2. **velo-virtuel-companion-v0.5.0.apk** (4.0 MB)
   - Companion app for PC mode
   - Package: `fr.cognet.velovirtuel.companion`
   - Version: 0.5.0 (versionCode 1)
   - BLE relay + real-time charts

### Screenshots
- `v050-final-villard.png` - Villard-Reculas route with Alpine chalets
- `v050-final-normandy-decor.png` - Normandy route with bocage, trees, houses

---

## 🧪 **Tested & Verified**

- ✅ Web bundle builds successfully (616 KB)
- ✅ Playwright tests pass on both routes
- ✅ Village signs use real OSM coordinates
- ✅ First village shown is correct (Le Beuron for Normandy, Villard-Reculas for Villard)
- ✅ TCX export generates valid Garmin-compatible files
- ✅ Virtual gear removed from stats, kept in HUD
- ✅ Both APKs built and verified

---

## 📱 **Installation**

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

---

## 🚀 **Usage**

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
4. **Android**: Share to Garmin Connect, Drive, Email
5. **Web**: Download `.tcx` file

---

## 🔗 **Links**

- **Repository**: https://github.com/cogtoto/villard-reculas-cycling
- **Branch**: `cursor/normandy-route-752e`
- **Pull Request**: [#1](https://github.com/cogtoto/villard-reculas-cycling/pull/1)
- **Commit**: `8e9b2e2` (village signs fix)

---

## 📝 **Technical Details**

### Village Data Sources
- **Le Beuron**: User-confirmed ground truth at GPX start (49.035267, 0.509741)
- **Villard-Reculas**: Nominatim reverse geocoding confirmation (45.092372, 6.033969)
- **Previous data**: Discarded (invented coordinates, wrong places)

### Files Changed (v0.5.0 total)
- **81 files** (+3821 lines)
- Key additions: `export.js`, `server/`, `companion/`, village JSON fixes
- APK sizes: Main 4.9MB, Companion 4.0MB

### Dependencies Added
- `@capacitor/filesystem` - File I/O for TCX export
- `@capacitor/share` - Android share sheet integration

---

## ⚠️ **Known Limitations**

- **Overpass API**: Was unavailable during implementation; more villages can be added when API is accessible
- **Debug builds**: These are unsigned debug APKs for testing
- **Village count**: Currently 1 village per route (start position only); more can be added with Overpass API

---

## 🙏 **Credits**

- **Overpass API**: OpenStreetMap place data (when accessible)
- **Nominatim**: OpenStreetMap reverse geocoding
- **User feedback**: Le Beuron ground-truth confirmation

---

**Note**: This is a debug build for testing. Production builds require signed APKs.
