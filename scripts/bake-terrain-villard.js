#!/usr/bin/env node
// Bake real terrain for Villard-Reculas with IGN orthoimagery
// Fetches IGN BD ORTHO aerial photos and elevation (GeoTIFF)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../public/terrain/villard');
const DEM_JSON = path.join(__dirname, '../public/dem-villard.json');
const DEM_BIN = path.join(__dirname, '../public/dem-villard.bin');

console.log('Villard-Reculas Terrain Baker with IGN Orthoimagery');
console.log('===================================================');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load existing DEM
const demMeta = JSON.parse(fs.readFileSync(DEM_JSON, 'utf-8'));
const demData = new Int16Array(fs.readFileSync(DEM_BIN).buffer);

const BBOX = {
  minLat: demMeta.latN - demMeta.ny * demMeta.step,
  maxLat: demMeta.latN,
  minLon: demMeta.lonW,
  maxLon: demMeta.lonW + demMeta.nx * demMeta.step
};

console.log(`DEM: ${demMeta.nx}×${demMeta.ny} grid`);
console.log(`Bbox: ${BBOX.minLat.toFixed(4)},${BBOX.minLon.toFixed(4)} to ${BBOX.maxLat.toFixed(4)},${BBOX.maxLon.toFixed(4)}`);
console.log(`Elevation: ${demMeta.min.toFixed(0)}m - ${demMeta.max.toFixed(0)}m`);

// Fetch with User-Agent (IGN requires it)
function fetchIGN(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'velo-virtuel-terrain-baker/1.0'
      }
    };
    
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Step 1: Fetch IGN orthoimagery (aerial photos) in 2x2 tiles
async function fetchOrthoimagery() {
  console.log('\n1. Fetching IGN BD ORTHO aerial imagery...');
  
  const midLat = (BBOX.minLat + BBOX.maxLat) / 2;
  const midLon = (BBOX.minLon + BBOX.maxLon) / 2;
  
  const tiles = [
    { name: 'nw', minLat: midLat, maxLat: BBOX.maxLat, minLon: BBOX.minLon, maxLon: midLon },
    { name: 'ne', minLat: midLat, maxLat: BBOX.maxLat, minLon: midLon, maxLon: BBOX.maxLon },
    { name: 'sw', minLat: BBOX.minLat, maxLat: midLat, minLon: BBOX.minLon, maxLon: midLon },
    { name: 'se', minLat: BBOX.minLat, maxLat: midLat, minLon: midLon, maxLon: BBOX.maxLon }
  ];
  
  const orthoMeta = [];
  
  for (const tile of tiles) {
    console.log(`  Fetching ${tile.name}...`);
    
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetMap',
      LAYERS: 'ORTHOIMAGERY.ORTHOPHOTOS',
      STYLES: '',
      CRS: 'EPSG:4326',
      BBOX: `${tile.minLat},${tile.minLon},${tile.maxLat},${tile.maxLon}`,
      WIDTH: 1024,
      HEIGHT: 1024,
      FORMAT: 'image/jpeg'
    });
    
    const url = `https://data.geopf.fr/wms-r?${params}`;
    
    try {
      const buffer = await fetchIGN(url);
      console.log(`  ✓ Fetched ${tile.name}: ${(buffer.length / 1024).toFixed(1)} KB`);
      
      // Convert to WebP
      const webpPath = path.join(OUTPUT_DIR, `ortho-${tile.name}.webp`);
      await sharp(buffer)
        .webp({ quality: 85 })
        .toFile(webpPath);
      
      const webpSize = fs.statSync(webpPath).size;
      console.log(`  ✓ Saved WebP: ${(webpSize / 1024).toFixed(1)} KB`);
      
      orthoMeta.push({
        file: `ortho-${tile.name}.webp`,
        bbox: tile
      });
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      return null;
    }
  }
  
  return orthoMeta;
}

// Step 2: Split DEM into chunks matching ortho tiles
function splitDEMChunks() {
  console.log('\n2. Splitting DEM into 2×2 chunks...');
  
  const chunkNx = Math.floor(demMeta.nx / 2);
  const chunkNy = Math.floor(demMeta.ny / 2);
  
  const chunks = [
    { name: 'nw', ox: 0, oy: 0 },
    { name: 'ne', ox: chunkNx, oy: 0 },
    { name: 'sw', ox: 0, oy: chunkNy },
    { name: 'se', ox: chunkNx, oy: chunkNy }
  ];
  
  for (const chunk of chunks) {
    const chunkData = new Int16Array(chunkNx * chunkNy);
    
    for (let y = 0; y < chunkNy; y++) {
      for (let x = 0; x < chunkNx; x++) {
        const srcX = chunk.ox + x;
        const srcY = chunk.oy + y;
        const srcIdx = srcY * demMeta.nx + srcX;
        const dstIdx = y * chunkNx + x;
        chunkData[dstIdx] = demData[srcIdx];
      }
    }
    
    const chunkPath = path.join(OUTPUT_DIR, `heightmap-${chunk.name}.bin`);
    fs.writeFileSync(chunkPath, Buffer.from(chunkData.buffer));
    console.log(`  ✓ ${chunk.name}: ${(chunkData.length * 2 / 1024).toFixed(1)} KB`);
  }
  
  return { chunkNx, chunkNy };
}

// Step 3: Generate metadata
function generateMetadata(orthoMeta, chunkSize) {
  console.log('\n3. Generating metadata...');
  
  const metadata = {
    version: '1.0',
    source: 'IGN Géoplateforme',
    elevation_source: demMeta.source,
    license: 'Licence Ouverte / Open License',
    attribution: 'Source: IGN',
    bbox: BBOX,
    chunks: {
      nx: 2,
      ny: 2,
      chunkSizeX: chunkSize.chunkNx,
      chunkSizeY: chunkSize.chunkNy
    },
    step: demMeta.step,
    minElevation: demMeta.min,
    maxElevation: demMeta.max,
    format: 'int16 LE, row 0 = north',
    orthoimagery: orthoMeta
  };
  
  const metaPath = path.join(OUTPUT_DIR, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  console.log(`  ✓ metadata.json`);
  
  return metadata;
}

// Main
async function main() {
  try {
    const orthoMeta = await fetchOrthoimagery();
    
    if (!orthoMeta) {
      console.error('\n✗ Failed to fetch orthoimagery, cannot continue');
      process.exit(1);
    }
    
    const chunkSize = splitDEMChunks();
    const metadata = generateMetadata(orthoMeta, chunkSize);
    
    // Calculate total size
    const files = fs.readdirSync(OUTPUT_DIR);
    const totalSize = files.reduce((sum, file) => {
      return sum + fs.statSync(path.join(OUTPUT_DIR, file)).size;
    }, 0);
    
    console.log('\n===================================================');
    console.log('Terrain baking complete!');
    console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Files: ${files.length}`);
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log('===================================================\n');
    
  } catch (err) {
    console.error('\n✗ Terrain baking failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
