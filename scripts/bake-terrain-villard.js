#!/usr/bin/env node
// Prepare terrain data for Villard-Reculas
// Uses existing DEM (AWS Terrain Tiles with IGN/SRTM sources)
// Generates terrain chunks for LOD rendering

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../public/terrain/villard');
const DEM_JSON = path.join(__dirname, '../public/dem-villard.json');
const DEM_BIN = path.join(__dirname, '../public/dem-villard.bin');

console.log('Villard-Reculas Terrain Preparation');
console.log('====================================');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load existing DEM
const demMeta = JSON.parse(fs.readFileSync(DEM_JSON, 'utf-8'));
const demData = new Int16Array(fs.readFileSync(DEM_BIN).buffer);

console.log(`DEM: ${demMeta.nx}×${demMeta.ny} grid (${demData.length} points)`);
console.log(`Step: ${demMeta.step}° (~${(demMeta.step * 111000).toFixed(0)}m)`);
console.log(`Elevation range: ${demMeta.min.toFixed(0)}m - ${demMeta.max.toFixed(0)}m`);
console.log(`Source: ${demMeta.source}`);

// Split DEM into 2x2 chunks for LOD
const chunkNx = Math.floor(demMeta.nx / 2);
const chunkNy = Math.floor(demMeta.ny / 2);

console.log(`\nGenerating 2×2 terrain chunks (${chunkNx}×${chunkNy} each)...`);

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

// Generate chunk metadata
const chunkMeta = {
  version: '1.0',
  source: demMeta.source,
  license: 'AWS Terrain Tiles (includes IGN data)',
  attribution: 'Source: IGN',
  bbox: {
    minLat: demMeta.latN - demMeta.ny * demMeta.step,
    maxLat: demMeta.latN,
    minLon: demMeta.lonW,
    maxLon: demMeta.lonW + demMeta.nx * demMeta.step
  },
  chunks: {
    nx: 2,
    ny: 2,
    chunkSizeX: chunkNx,
    chunkSizeY: chunkNy
  },
  step: demMeta.step,
  minElevation: demMeta.min,
  maxElevation: demMeta.max,
  format: 'int16 LE, row 0 = north'
};

const metaPath = path.join(OUTPUT_DIR, 'metadata.json');
fs.writeFileSync(metaPath, JSON.stringify(chunkMeta, null, 2));
console.log(`  ✓ metadata.json`);

// Calculate total size
const files = fs.readdirSync(OUTPUT_DIR);
const totalSize = files.reduce((sum, file) => {
  return sum + fs.statSync(path.join(OUTPUT_DIR, file)).size;
}, 0);

console.log('\n====================================');
console.log('Terrain preparation complete!');
console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Files: ${files.length}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log('====================================\n');
