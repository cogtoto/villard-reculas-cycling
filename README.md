# Virtual Cycling — Villard-Reculas & Normandy

3D virtual cycling app for Android that connects to your home trainer via Bluetooth. Ride through realistic terrain with physics-based simulation.

## Routes

Choose between two real GPS routes:

### 1. Villard-Reculas (Oisans, Alps)
- **Type**: Mountain descent + climb
- **Distance**: ~26.5 km
- **Elevation**: 718–1495 m
- **Scenery**: Alpine chalets, fir forests, snow-capped peaks

### 2. Normandy Countryside – Grand-Camp (Eure)
- **Type**: Rolling countryside
- **Distance**: ~21 km  
- **Elevation**: 120–185 m (~147 m gain)
- **Scenery**: Bocage landscape, half-timbered houses, apple orchards, grazing cows

## Download & Install (Android)

1. **Download the APK** from the [Releases page](https://github.com/cogtoto/villard-reculas-cycling/releases)
2. **Enable "Install from unknown sources"** in your Android settings
3. **Install** the APK file
4. **Rotate to landscape mode** for the best experience
5. **Enter your FTP** (Functional Threshold Power)
6. **Choose your route** (Villard-Reculas or Normandy)
7. **Connect your HomeTrainer** via Bluetooth (supports FTMS, Cycling Power, and Cadence/Speed sensors)
8. **Use +/− buttons** to shift gears during your ride
9. **Press Stop** when finished to see your ride summary

## Features

- **Two real GPS routes** with accurate terrain from AWS DEM tiles
- **Route-specific scenery**: Alpine or Normandy countryside
- **Bluetooth connectivity** for home trainers (FTMS, Cycling Power, Cadence/Speed)
- **Physics-based cycling** with realistic gradients and inertia
- **FTP-based power zones** (Coggan 7-zone model)
- **Virtual gear shifting** (+/− buttons adjust trainer resistance)
- **Interactive minimap** with terrain classification
- **Ride statistics**: time, distance, speed, climbing, power, cadence, normalized power
- **TCX export** for Garmin/Strava upload

## Development

```bash
npm install
npm run dev          # Development server
npm run build        # Production build
npm run android:sync # Sync to Android
npm run android:apk  # Build debug APK
```

## Credits

- Terrain data: AWS Terrain Tiles (Terrarium RGB, z13)
- Routes: Real Strava GPX recordings
- Built with Three.js, Vite, Capacitor 7
