// Terrain under the Villard road corridor must stay below the paved surface
// and sit flush with it (no deep trench, no perched embankment).
import { readFileSync } from 'fs';
import { parseGpx, buildTrack } from '../gpx.js';
import { createAlpineHeightField } from '../alpine.js';
import {
  buildRoadIndex, fitHeightToRoadCorridor, roadEnvelopeY,
  sampleRoadCorridor, corridorViolations, perchViolations,
  ROAD_Y_LIFT, ROAD_CLEARANCE, ROAD_HARD_HALF, ROAD_BLEND,
  ROAD_MAX_PERCH, TERRAIN_CELL_SIZE
} from '../road-corridor.js';

let passed = 0, failed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertEquals(a, e, msg = '') {
  if (a !== e) throw new Error(`Expected ${e}, got ${a} ${msg}`);
}
function assertClose(a, e, eps, msg = '') {
  if (Math.abs(a - e) > eps) throw new Error(`Expected ${e} ± ${eps}, got ${a} ${msg}`);
}
function run(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; }
  catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}

console.log('Testing road-corridor terrain clearance and flush fit...\n');

run('flush envelope sits a few centimetres below the GPX height', () => {
  assertEquals(roadEnvelopeY(1000, 0), 1000 - ROAD_CLEARANCE);
  assertEquals(roadEnvelopeY(1000, ROAD_HARD_HALF), 1000 - ROAD_CLEARANCE);
  const mid = roadEnvelopeY(1000, ROAD_HARD_HALF + ROAD_BLEND / 2, { naturalY: 1000 - ROAD_CLEARANCE + 4 });
  assert(mid > 1000 - ROAD_CLEARANCE, 'blend should rise off the flush band');
  assert(mid < 1000 - ROAD_CLEARANCE + 4, 'blend should not yet reach natural ground');
  assertEquals(roadEnvelopeY(1000, ROAD_HARD_HALF + ROAD_BLEND, { naturalY: 980 }), 980);
});

run('terrain below the road is raised to sit flush, not left as a trench', () => {
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push({ x: i * 4, y: 200, z: 0 });
  const index = buildRoadIndex(pts, 2);
  const y = fitHeightToRoadCorridor(180, 40, 0, index);
  assertClose(y, 200 - ROAD_CLEARANCE, 1e-6, `raised to flush, got ${y}`);
});

run('hairpin: the upper leg stays flush and is not carved down to the lower road', () => {
  // Two stacked switchbacks 20 m apart in XZ, 15 m of elevation between them.
  // The 180° cap is offset to the right so it does not pollute samples at x=10.
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push({ x: i * 2, y: 100, z: 0 });
  for (let i = 1; i <= 6; i++) {
    const t = i / 6, ang = Math.PI * t;
    pts.push({ x: 20 + Math.sin(ang) * 8, y: 100 + 15 * t, z: 10 - Math.cos(ang) * 10 });
  }
  for (let i = 0; i <= 10; i++) pts.push({ x: 20 - i * 2, y: 115, z: 20 });
  const index = buildRoadIndex(pts, 2);
  const upper = fitHeightToRoadCorridor(130, 10, 18, index);
  assertClose(upper, 115 - ROAD_CLEARANCE, 0.05, `upper flush, got ${upper}`);
  const lower = fitHeightToRoadCorridor(90, 10, 2, index);
  assertClose(lower, 100 - ROAD_CLEARANCE, 0.05, `lower flush, got ${lower}`);
  const mid = fitHeightToRoadCorridor(107, 10, 10, index);
  assert(mid > 100 - ROAD_CLEARANCE + 1, `mid ${mid} should rise off the lower road`);
  assert(mid < 115 - ROAD_CLEARANCE - 1, `mid ${mid} should sit below the upper road`);
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

run('terrain mesh stays at 20 m so the i3 keeps a light coarse grid', () => {
  assert(field.CS <= 20, `cellSize=${field.CS}`);
  assert(field.CS >= 15, `cellSize=${field.CS} is denser than planned`);
});

run('height field exposes the DEM meta used by the lake / dam mesh', () => {
  assert(field.M && field.M.nx > 0 && field.wMask, 'M and wMask must be returned for buildAlpineTerrain');
});

const samples = sampleRoadCorridor(track, field.heightAt, { stepM: 4, roadIndex: field.roadIndex });
const paved = samples.filter((s) => Math.abs(s.off) <= 2.01);
const center = samples.filter((s) => Math.abs(s.off) <= 0.51);
const edge = samples.filter((s) => Math.abs(s.off) <= 6.01);
const badPaved = corridorViolations(paved, 0.02);
const perchedCenter = perchViolations(center, ROAD_MAX_PERCH);
const perchedHard = perchViolations(edge, 0.40);

run('terrain stays below the road surface everywhere along the Villard corridor', () => {
  if (badPaved.length) {
    const w = badPaved.slice(0, 8).map((s) =>
      `s=${s.s.toFixed(0)}m off=${s.off} clearance=${s.clearance.toFixed(2)} (terrain ${s.terrainY.toFixed(2)} vs road ${s.roadY.toFixed(2)})`
    ).join('; ');
    throw new Error(`${badPaved.length}/${paved.length} paved samples bury the road: ${w}`);
  }
  const minC = paved.reduce((m, s) => Math.min(m, s.clearance), Infinity);
  console.log(`  min paved clearance ${minC.toFixed(3)} m over ${paved.length} samples`);
  assert(minC >= 0.02, `min clearance ${minC}`);
});

run('terrain at the road centre and shoulder stays flush (no perched embankment)', () => {
  if (perchedCenter.length) {
    const w = perchedCenter.slice(0, 6).map((s) =>
      `s=${s.s.toFixed(0)}m off=${s.off} clearance=${s.clearance.toFixed(2)}`
    ).join('; ');
    throw new Error(`${perchedCenter.length} centreline samples sit more than ${ROAD_MAX_PERCH} m below the road: ${w}`);
  }
  if (perchedHard.length) {
    const w = perchedHard.slice(0, 6).map((s) =>
      `s=${s.s.toFixed(0)}m off=${s.off} clearance=${s.clearance.toFixed(2)}`
    ).join('; ');
    throw new Error(`${perchedHard.length} samples sit more than 40 cm below the road: ${w}`);
  }
  const over15 = edge.filter((s) => s.clearance > ROAD_MAX_PERCH);
  const frac = 1 - over15.length / edge.length;
  const maxC = edge.reduce((m, s) => Math.max(m, s.clearance), -Infinity);
  const minC = edge.reduce((m, s) => Math.min(m, s.clearance), Infinity);
  console.log(`  edge/shoulder clearance ${minC.toFixed(3)}–${maxC.toFixed(3)} m; ${(frac * 100).toFixed(2)}% within ${ROAD_MAX_PERCH} m (${over15.length} tight inner-bend outliers)`);
  assert(frac >= 0.999, `only ${(frac * 100).toFixed(2)}% of shoulder samples are within ${ROAD_MAX_PERCH} m`);
  const cmin = center.reduce((m, s) => Math.min(m, s.clearance), Infinity);
  const cmax = center.reduce((m, s) => Math.max(m, s.clearance), -Infinity);
  console.log(`  centreline clearance ${cmin.toFixed(3)}–${cmax.toFixed(3)} m over ${center.length} samples`);
});

run('hairpin stretch (km 3–7) stays clear and flush', () => {
  const hp = paved.filter((s) => s.s >= 3000 && s.s <= 7500);
  const hpCenter = center.filter((s) => s.s >= 3000 && s.s <= 7500);
  const buried = corridorViolations(hp, 0.02);
  const high = perchViolations(hp, 0.40);
  const highC = perchViolations(hpCenter, ROAD_MAX_PERCH);
  assert(buried.length === 0, `${buried.length} hairpin burials, first at ${buried[0] && buried[0].s} m`);
  assert(high.length === 0, `${high.length} hairpin perches >40 cm, first at ${high[0] && high[0].s} m`);
  assert(highC.length === 0, `${highC.length} hairpin centreline perches, first at ${highC[0] && highC[0].s} m`);
  assert(hp.length > 100, 'expected a dense hairpin sample set');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
