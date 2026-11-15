// Village chalets must stay out of the Villard road corridor and cluster near the finish.
import { readFileSync } from 'fs';
import { parseGpx, buildTrack } from '../gpx.js';
import { createAlpineHeightField } from '../alpine.js';
import { VEG_CLEARANCE, TERRAIN_CELL_SIZE } from '../road-corridor.js';
import {
  planChaletPlacements, footprintMinDist, footprintsOverlap, VARIANTS,
  HERO_EXCLUSION_M, VILLAGE_MIN_SEP
} from '../chalets.js';

let passed = 0, failed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function run(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; }
  catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}

console.log('Testing Villard village chalet placement...\n');

const meta = JSON.parse(readFileSync(new URL('../public/dem-villard.json', import.meta.url), 'utf8'));
const raw = readFileSync(new URL('../public/dem-villard.bin', import.meta.url));
const data = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
const track = buildTrack(parseGpx(readFileSync(new URL('../public/villard-reculas.gpx', import.meta.url), 'utf8')));
const field = createAlpineHeightField(track, { meta, data }, { cellSize: TERRAIN_CELL_SIZE });

const planned = planChaletPlacements(track, field);
const { list, village, hamlets } = planned;
const finish = track.pts[track.pts.length - 1];
console.log(`  planned ${village} village + ${hamlets} hamlet chalets (${list.length} total), ${VARIANTS.length} variants`);

run('village has a substantial cluster of chalets', () => {
  assert(village >= 28, `only ${village} village chalets`);
  assert(list.length >= 40, `only ${list.length} chalets in total`);
});

run('at least four chalet sizes are used', () => {
  const used = new Set(list.map((c) => c.variant));
  assert(used.size >= 4, `variants used: ${[...used]}`);
});

run('no chalet footprint enters the road corridor', () => {
  const bad = [];
  for (const c of list) {
    const d = footprintMinDist(c.x, c.z, c.rot, c.W, c.D, field.distTo);
    if (d < VEG_CLEARANCE) bad.push({ ...c, d });
  }
  if (bad.length) {
    const w = bad.slice(0, 6).map((c) => `d=${c.d.toFixed(2)}m at (${c.x.toFixed(0)},${c.z.toFixed(0)})`).join('; ');
    throw new Error(`${bad.length} chalets intersect the ${VEG_CLEARANCE} m corridor: ${w}`);
  }
  const minD = list.reduce((m, c) => Math.min(m, footprintMinDist(c.x, c.z, c.rot, c.W, c.D, field.distTo)), Infinity);
  console.log(`  min footprint clearance ${minD.toFixed(2)} m (need ≥ ${VEG_CLEARANCE})`);
});

run('no village chalet sits in the hero-chalet exclusion zone', () => {
  const r2 = HERO_EXCLUSION_M * HERO_EXCLUSION_M;
  const bad = list.filter((c) => (c.x - finish.x) ** 2 + (c.z - finish.z) ** 2 < r2);
  assert(bad.length === 0, `${bad.length} chalets within ${HERO_EXCLUSION_M} m of the finish`);
});

run('village chalets are clustered (not a sparse ring)', () => {
  const vill = list.slice(0, village);
  let close = 0;
  for (let i = 0; i < vill.length; i++) {
    for (let j = i + 1; j < vill.length; j++) {
      const d = Math.hypot(vill[i].x - vill[j].x, vill[i].z - vill[j].z);
      if (d < 22) close++;
    }
  }
  console.log(`  ${close} village pairs within 22 m (min sep ${VILLAGE_MIN_SEP} m)`);
  assert(close >= 20, `only ${close} close pairs — village looks too sparse`);
});

run('no chalet is in water', () => {
  const wet = list.filter((c) => field.waterAt && field.waterAt(c.x, c.z));
  assert(wet.length === 0, `${wet.length} chalets in water`);
});

run('no two chalet roofs or balconies overlap', () => {
  let hits = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (footprintsOverlap(a.x, a.z, a.rot, a.W, a.D, b.x, b.z, b.rot, b.W, b.D, 0.4)) hits++;
    }
  }
  assert(hits === 0, `${hits} overlapping chalet pairs`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
