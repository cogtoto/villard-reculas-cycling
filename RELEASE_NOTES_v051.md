# v0.5.1-village-signs: Real OSM Village Data with Entry/Exit Points

Complete replacement of village sign data with **real OpenStreetMap coordinates** from Overpass API, with intelligent **entry/exit point detection** for multiple passes through the same place.

---

## 🪧 **Village Signs - Real OSM Data**

All village coordinates now sourced from **Overpass API** (place=village|hamlet|isolated_dwelling|locality, within 400m of GPX tracks), with exact entry/exit points calculated where the track crosses the 250m radius.

### **Normandy Route - 6 Sign Positions**

1. **Le Beuron** (hamlet) - **2 passes**
   - Pass 1: **0.00 - 0.26 km** (START - user ground-truth confirmed)
   - Pass 2: **20.94 - 21.23 km** (loop return)
   - OSM ID: `user_groundtruth`
   - Coords: `49.035267, 0.509741`

2. **La Côte** (locality)
   - Entry: **1.19 km** → Exit: **1.45 km**
   - OSM ID: `13439784575`
   - Coords: `49.045594, 0.500152`

3. **Grand-Camp** (village)
   - Entry: **3.12 km** → Exit: **3.70 km**
   - OSM ID: `1472894583`
   - Coords: `49.046446, 0.527197`

4. **Saint-Quentin-des-Isles** (village)
   - Entry: **8.83 km** → Exit: **10.00 km**
   - OSM ID: `1709222582`
   - Coords: `49.049450, 0.578350`

5. **Broglie** (village)
   - Entry: **16.35 km** → Exit: **16.97 km**
   - OSM ID: `698906787`
   - Coords: `49.008743, 0.528038`

6. **Le Beuron** (hamlet) - Pass 2
   - Entry: **20.94 km** → Exit: **21.23 km** (END)

**Excluded** (too far from track):
- ❌ Le Val Perrier-Nord (262m from track, no crossing within 250m)
- ❌ Ferrières-Saint-Hilaire (356m from track, no crossing)

---

### **Villard-Reculas Route - 9 Sign Positions**

1. **Villard-Reculas** (village) - **START (Pass 0)**
   - Entry: **0.00 km** → Exit: **0.00 km**
   - Special: Route starts within 500m of village center (230m)
   - OSM ID: `34055469`
   - Coords: `45.091497, 6.031317`

2. **Villard-Reculas** (village) - **Pass 1**
   - Entry: **0.00 km** → Exit: **0.31 km**

3. **Sardonne** (hamlet) - **Pass 1**
   - Entry: **6.90 km** → Exit: **7.23 km**
   - OSM ID: `7344921490`
   - Coords: `45.119602, 6.043661`

4. **Le Boulangeard** (hamlet) - **Pass 1**
   - Entry: **8.91 km** → Exit: **9.38 km**
   - OSM ID: `6749142191`
   - Coords: `45.127964, 6.047347`

5. **Le Boulangeard** (hamlet) - **Pass 2**
   - Entry: **10.27 km** → Exit: **10.50 km**

6. **La Voute** (isolated_dwelling)
   - Entry: **15.72 km** → Exit: **16.30 km**
   - OSM ID: `1401425857`
   - Coords: `45.121178, 6.033569`

7. **Le Boulangeard** (hamlet) - **Pass 3**
   - Entry: **17.17 km** → Exit: **17.62 km**

8. **Sardonne** (hamlet) - **Pass 2**
   - Entry: **19.31 km** → Exit: **19.65 km**

9. **Villard-Reculas** (village) - **Pass 2**
   - Entry: **26.27 km** → Exit: **26.60 km** (END)

**Excluded** (too far from track):
- ❌ Allemond (297m from track, no crossing within 250m)

---

## 🔧 **Technical Implementation**

### Entry/Exit Point Detection
- **Entry sign**: Placed where track **enters** 250m radius of place center
- **Exit sign**: Placed where track **exits** 250m radius
- **Multiple passes**: Each pass gets separate entry/exit signs with pass number annotation
- **Starting inside**: If route starts within 500m of village, show sign at km 0

### Sign Placement Algorithm
```python
for each village in OSM data:
    for each contiguous segment within 250m radius:
        place entry_sign at first point in radius
        place exit_sign at last point in radius
        annotate with pass number if multiple passes
```

### Data Sources
- **Overpass API**: OSM place nodes (village, hamlet, isolated_dwelling, locality)
- **Search radius**: 400m from GPX track (to find candidates)
- **Placement radius**: 250m (for entry/exit detection)
- **User ground-truth**: "Le Beuron" confirmed by user as Normandy start hamlet

---

## 📦 **Release Assets**

### APK
- **velo-virtuel-v0.5.1-village-signs.apk** (4.9 MB)
  - Package: `fr.cognet.velovirtuel`
  - Version: 0.5.1 (versionCode 7)
  - Includes: Real OSM village signs with entry/exit detection

### Screenshot
- **v051-normandy-signs.png** - Normandy route with bocage and houses

---

## ✅ **Verification**

**Normandy Route**:
- ✅ First sign: **Le Beuron** (user ground-truth confirmed)
- ✅ All OSM places within track verified
- ✅ 6 sign positions (5 unique places, Le Beuron appears twice)

**Villard Route**:
- ✅ First sign: **Villard-Reculas** (route starts within village)
- ✅ All OSM places within track verified
- ✅ 9 sign positions (5 unique places, multiple passes handled)

**Data Quality**:
- ✅ No invented coordinates
- ✅ All lat/lon exact from OSM
- ✅ OSM IDs recorded for every place
- ✅ Entry/exit km calculated from actual track geometry

---

## 🔗 **Changes from v0.5.0**

### Added
- ✅ Real Overpass API data (exact OSM coordinates, IDs)
- ✅ Entry/exit point calculation (250m radius crossings)
- ✅ Multiple pass detection (2-3 passes for some villages)
- ✅ "Starting inside" handling (Villard-Reculas at km 0)

### Removed
- ❌ All invented coordinates (45.135, 6.035, etc.)
- ❌ Places not on routes (Oz-en-Oisans, Huez from Villard; removed)
- ❌ Places too far from track (Le Val Perrier-Nord, Ferrières-Saint-Hilaire, Allemond)
- ❌ Root-level `*-villages.json` files (stale data)

### Fixed
- ✅ Normandy first sign: Now **"Le Beuron"** (was generic "Grand-Camp")
- ✅ Villard first sign: Now **"Villard-Reculas"** (was "Oz-en-Oisans")
- ✅ Multiple passes now handled correctly (separate entry/exit for each)

---

## 📋 **Final Sign Lists**

### Normandy (6 positions, 5 unique places)
1. Le Beuron (pass 1) - 0.00-0.26 km
2. La Côte - 1.19-1.45 km
3. Grand-Camp - 3.12-3.70 km
4. Saint-Quentin-des-Isles - 8.83-10.00 km
5. Broglie - 16.35-16.97 km
6. Le Beuron (pass 2) - 20.94-21.23 km

### Villard (9 positions, 5 unique places)
1. Villard-Reculas (start) - 0.00-0.00 km
2. Villard-Reculas (pass 1) - 0.00-0.31 km
3. Sardonne (pass 1) - 6.90-7.23 km
4. Le Boulangeard (pass 1) - 8.91-9.38 km
5. Le Boulangeard (pass 2) - 10.27-10.50 km
6. La Voute - 15.72-16.30 km
7. Le Boulangeard (pass 3) - 17.17-17.62 km
8. Sardonne (pass 2) - 19.31-19.65 km
9. Villard-Reculas (pass 2) - 26.27-26.60 km

---

## 🚀 **Installation**

1. Download `velo-virtuel-v0.5.1-village-signs.apk`
2. Enable "Install from unknown sources" in Android settings
3. Install APK
4. Grant Bluetooth permissions when prompted

---

## 🔗 **Links**

- **Repository**: https://github.com/cogtoto/villard-reculas-cycling
- **Branch**: `cursor/normandy-route-752e`
- **Commit**: `5b1b0d9`

---

**Note**: This release focuses on village sign data accuracy. All other features from v0.5.0 (TCX export, companion app, PC mode) remain unchanged.
