// Terrain under the Villard road corridor must stay below the paved surface.
import { readFileSync } from 'fs';
import { parseGpx, buildTrack } from '../gpx.js';
import { createAlpineHeightField } from '../alpine.js';
import {
  buildRoadIndex, clampHeightToRoadCorridor, roadEnvelopeY,
  sampleRoadCorridor, corridorViolations,
  ROAD_Y_LIFT, ROAD_CLEARANCE, ROAD_HARD_HALF, TERRAIN_CELL_SIZE
} from '../road-corridor.js';

let passed = 0, failed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertEquals(a, e, msg = '') {
  if (a !== e) throw new Error(`Expected ${e}, got ${a} ${msg}`);
}
function run(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; }
  catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}

console.log('Testing road-corridor terrain clearance...\n');

run('hard corridor envelope is below the GPX height', () => {
  assertEquals(roadEnvelopeY(1000, 0), 1000 - ROAD_CLEARANCE);
  assertEquals(roadEnvelopeY(1000, ROAD_HARD_HALF), 1000 - ROAD_CLEARANCE);
  assert(roadEnvelopeY(1000, ROAD_HARD_HALF + 5) > 1000 - ROAD_CLEARANCE);
});

run('hairpin: a vertex near the upper bend is still clamped below the lower road', () => {
  // Two stacked switchbacks 20 m apart in X, 15 m of elevation between them.
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push({ x: i * 2, y: 100, z: 0 });
  for (let i = 0; i <= 10; i++) pts.push({ x: 20 - i * 2, y: 115, z: 20 });
  const index = buildRoadIndex(pts, 2);
  // Midway between the two legs, slightly closer to the upper road in XZ
  const y = clampHeightToRoadCorridor(130, 10, 12, index);
  assert(y <= 100 - ROAD_CLEARANCE + 1e-6, `terrain ${y.toFixed(2)} must stay under the lower road at y=100`);
});

const gpxPath = new URL('../public/villard-reculas.gpx', import.meta.url);
const meta = JSON.parse(readFileSync(new URL('../public/dem-villard.json', import.meta.url), 'utf8'));
const raw = readFileSync(new URL('../public/dem-villard.bin', import.meta.url));
const data = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
assert(data.length === meta.nx * meta.ny, `DEM size ${data.length} != ${meta.nx * meta.ny}`);
const track = buildTrack(parseGpx(readFileSync(gpxPath, 'utf8')));

const t0 = Date.now();
const field = createAlpineHeightField(track, { meta, data }, { cellSize: TERRAIN_CELL_SIZE });
const builtMs = Date.now() - t0;
console.log(`  height field ${field.SX + 1}×${field.SZ + 1} cells of ${field.CS} m in ${builtMs} ms`);

run('terrain mesh is finer than 40 m so the corridor is actually sampled', () => {
  assert(field.CS <= 20, `cellSize=${field.CS}`);
});

run('height field exposes the DEM meta used by the lake / dam mesh', () => {
  assert(field.M && field.M.nx > 0 && field.wMask, 'M and wMask must be returned for buildAlpineTerrain');
});

const samples = sampleRoadCorridor(track, field.heightAt, { stepM: 4 });
const paved = samples.filter((s) => Math.abs(s.off) <= 2.01);
const shoulder = samples.filter((s) => Math.abs(s.off) > 2.01 && Math.abs(s.off) <= 8.01);
const badPaved = corridorViolations(paved, 0.2);
const badShoulder = corridorViolations(shoulder, 0.05);

run('terrain stays below the road surface everywhere along the Villard corridor', () => {
  if (badPaved.length) {
    const w = badPaved.slice(0, 8).map((s) =>
      `s=${s.s.toFixed(0)}m off=${s.off} clearance=${s.clearance.toFixed(2)} (terrain ${s.terrainY.toFixed(2)} vs road ${s.roadY.toFixed(2)})`
    ).join('; ');
    throw new Error(`${badPaved.length}/${paved.length} paved samples bury the road: ${w}`);
  }
  const minC = paved.reduce((m, s) => Math.min(m, s.clearance), Infinity);
  console.log(`  min paved clearance ${minC.toFixed(2)} m over ${paved.length} samples`);
  assert(minC >= 0.2, `min clearance ${minC}`);
});

run('terrain under the shoulders also stays below the ribbon', () => {
  if (badShoulder.length) {
    const w = badShoulder.slice(0, 6).map((s) =>
      `s=${s.s.toFixed(0)}m off=${s.off} clearance=${s.clearance.toFixed(2)}`
    ).join('; ');
    throw new Error(`${badShoulder.length} shoulder samples poke through: ${w}`);
  }
});

run('hairpin stretch (km 3–7) stays clear', () => {
  const hp = paved.filter((s) => s.s >= 3000 && s.s <= 7500);
  const bad = corridorViolations(hp, 0.2);
  assert(bad.length === 0, `${bad.length} hairpin failures, first at ${bad[0] && bad[0].s} m`);
  assert(hp.length > 100, 'expected a dense hairpin sample set');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
