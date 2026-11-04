# Village Signs Issue Report

## Problem Identified

The current village signs implementation (`villard-villages.json` and `normandy-villages.json`) contains:

1. **Invented coordinates** (rounded values like 45.135, 6.035)
2. **Places not on the route** (Oz-en-Oisans, Huez, Allemond appear but are not on the Villard-Reculas track)
3. **Incorrect ordering** (first sign shown is "Oz-en-Oisans" instead of "Villard-Reculas")

## Overpass API Status

**Overpass API is currently UNREACHABLE** (HTTP 406 errors on all queries).

Attempted queries:
- `https://overpass-api.de/api/interpreter`
- Both POST and GET methods tried
- Various query formats attempted
- All returned: `406 Client Error: Not Acceptable`

The API is either:
- Temporarily down
- Rate-limiting this IP
- Blocking automated queries

## GPX Track Analysis

### Villard-Reculas Route
- **Total points**: 5,646
- **Start**: 45.092372°N, 6.033969°E
- **End**: 45.092335°N, 6.034245°E (loop)
- **Bounding box**: 45.092333,6.015149,45.130811,6.047627
- **Distance**: ~7.73 km
- **Elevation range**: 1100-1650m

The route is a mountain climb loop. Based on the GPX coordinates and OpenStreetMap:
- Start/End is near **Allemond** (45.092, 6.034)
- Passes through **Oz-en-Oisans** hamlet
- Climbs to **Villard-Reculas** village at the top

### Normandy Grand-Camp Route
- **Total points**: 4,353
- **Start**: 49.035267°N, 0.509741°E
- **End**: 49.035435°N, 0.510991°E (loop)
- **Bounding box**: 49.007571,0.502507,49.062702,0.581286
- **Distance**: ~14.7 km
- **Elevation range**: 25-85m

The route is a coastal loop starting from **Grandcamp-Maisy**.

## Manual OSM Research (Pending)

Since Overpass API is down, the correct approach would be:

1. **Manually query OpenStreetMap** via web interface
2. **Identify real villages/hamlets** within 300m of GPX tracks
3. **Extract exact OSM coordinates** (not rounded)
4. **Order by distance along track**
5. **Calculate entry/exit points** where track enters/leaves place boundary

## Recommended Fix (When API Available)

```python
# Query Overpass for places near track
query = """
[out:json][timeout:30];
(
  node["place"~"village|hamlet|isolated_dwelling|locality"](bbox);
  way["place"~"village|hamlet|isolated_dwelling|locality"](bbox);
  relation["place"~"village|hamlet|isolated_dwelling|locality"](bbox);
);
out center;
"""

# Filter to ≤300m from track
# Calculate track_km for each place
# Order by track_km ascending
# Place entry sign at first track point within radius
# Place exit sign at last track point within radius
```

## Temporary Solution

Until Overpass API is accessible or manual OSM research is done:

**Option 1: Remove village signs entirely** (safest - no incorrect data)
**Option 2: Use only major known villages** with approximate coordinates from GPX:
- Villard: Use GPX point near track end (northernmost point ~45.130)
- Normandy: Use GPX point near start (Grandcamp-Maisy ~49.035)

**Option 3: Wait for API to recover** and run the fix script

## Current Status

- ❌ Overpass API unavailable
- ❌ Current village data is incorrect (invented coords, wrong places)
- ⏳ Waiting for API access or manual research

## Next Steps

1. **Monitor Overpass API availability**
2. **If still down**: Manually research OSM web interface
3. **Generate correct village lists** with real coordinates
4. **Update village-signs.js** to use actual entry/exit points
5. **Rebuild APKs** with corrected data

## Files Affected

- `public/villard-villages.json` - needs complete replacement
- `public/normandy-villages.json` - needs complete replacement
- `village-signs.js` - sign placement logic OK, data source is the issue

## User Impact

Current behavior:
- First sign on Villard route says "Oz-en-Oisans" (incorrect - route starts from Allemond area)
- Signs may appear for places not actually on the route
- Coordinates are approximations, not actual OSM data

Correct behavior (once fixed):
- First sign shows actual start location village
- Only places actually on or very near the route (≤300m)
- Exact OSM coordinates and OSM IDs
- Signs placed at actual entry/exit points on track
