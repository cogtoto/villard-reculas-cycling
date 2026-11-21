// Road visibility audit (node tests/test-road-visibility.mjs) for the Villard climb: samples the asphalt every STEP m
// (centre, ±1.5 m, ±2.3 m edges) and checks the actual rendered surfaces:
//  - coarse 20 m terrain triangles (after clearLandUnderRoad)
//  - 4 m corridor-bed triangles (after the hairpin fix)
//  - stone retaining walls (roadside.js placement) cutting into the asphalt
import { readFileSync, writeFileSync } from 'fs';
import { parseGpx, buildTrack, sampleTrack } from '../gpx.js';
import { createAlpineHeightField, clearLandUnderRoad, buildRoadBedHeights } from '../alpine.js';
import { TERRAIN_CELL_SIZE, ROAD_BED_CELL, ROAD_Y_LIFT, distToRoad } from '../road-corridor.js';
import { wallPlacements } from '../roadside.js';
import { makeSurfaceSampler } from '../alpine.js';
import { perchedEdges } from '../road-surface.js';

const meta = JSON.parse(readFileSync(new URL('../public/dem-villard.json', import.meta.url), 'utf8'));
const raw = readFileSync(new URL('../public/dem-villard.bin', import.meta.url));
const data = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
const track = buildTrack(parseGpx(readFileSync(new URL('../public/villard-reculas.gpx', import.meta.url), 'utf8')), 1200);
const F = createAlpineHeightField(track, { meta, data }, { cellSize: TERRAIN_CELL_SIZE });
const BEFORE = !!process.env.BEFORE;
const cleared = BEFORE ? { lowered: 0, fixes: 0, quads: new Set() } : clearLandUnderRoad(F);
const bed = buildRoadBedHeights(F, cleared.quads, { fix: !BEFORE && !process.env.NOBEDFIX });
console.log(`land vertices lowered ${cleared.lowered} (${cleared.fixes} fixes); bed nodes ${bed.posMap.size} (+${bed.extra} extra cells), bed fixes ${bed.fixes}`);
const { pos, x0, z0, W, H, SX, SZ } = F, cw = W / SX, ch = H / SZ, vi = (i, j) => j * (SX + 1) + i;
const landY = (x, z) => {
  const gx = (x - x0) / cw, gz = (z - z0) / ch, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
  if (fx + fz <= 1) { const a = pos.getY(vi(i, j)), b = pos.getY(vi(i, j + 1)), d = pos.getY(vi(i + 1, j)); return a + (d - a) * fx + (b - a) * fz; }
  const b = pos.getY(vi(i, j + 1)), c = pos.getY(vi(i + 1, j + 1)), d = pos.getY(vi(i + 1, j)); return c + (b - c) * (1 - fx) + (d - c) * (1 - fz);
};
const CS = ROAD_BED_CELL, N = (ix, iz) => bed.posMap.get(`${ix},${iz}`);
const bedY = (x, z) => {
  const gx = x / CS, gz = z / CS, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const a = N(ix, iz), b = N(ix + 1, iz), c = N(ix, iz + 1), d = N(ix + 1, iz + 1);
  if (!a || !b || !c || !d) return -Infinity;
  return fx + fz <= 1 ? a.y + (b.y - a.y) * fx + (c.y - a.y) * fz : d.y + (c.y - d.y) * (1 - fx) + (b.y - d.y) * (1 - fz);
};
const STEP = Number(process.env.STEP || 2), probs = [], perch = [];
let n = 0, worstLand = -1e9, worstBed = -1e9;
for (let d = 0; d <= track.length; d += STEP) {
  const s = sampleTrack(track, d), nx = -s.dir.z, nz = s.dir.x, roadY = s.pos.y + ROAD_Y_LIFT;
  for (const off of [-2.3, -1.5, 0, 1.5, 2.3]) {
    const x = s.pos.x + nx * off, z = s.pos.z + nz * off; n++;
    const l = landY(x, z) - roadY, b = bedY(x, z) - roadY;
    worstLand = Math.max(worstLand, l); worstBed = Math.max(worstBed, b);
    const gap = -Math.max(l, b);
    if (Math.abs(off) > 2 && gap > 0.3) perch.push({ km: +(d / 1000).toFixed(3), off, gap: +gap.toFixed(2) });
    if (l > -0.02 || b > -0.02) probs.push({ km: +(d / 1000).toFixed(3), off, land: +l.toFixed(2), bed: +b.toFixed(2) });
  }
}
// walls: any part of the 0.5 m wide box within the asphalt (half-width 2.3 m incl. broken edge)?
const walls = wallPlacements(track, { heightAt: F.heightAt, waterAt: F.waterAt });
const wallHits = [];
for (const w of walls.walls) {
  for (let t = -0.5; t <= 0.5; t += 0.25) for (const sx of [-0.25, 0.25]) {
    const x = w.x + Math.sin(w.rot) * t * w.len + Math.cos(w.rot) * sx, z = w.z + Math.cos(w.rot) * t * w.len - Math.sin(w.rot) * sx;
    const dd = distToRoad(F.roadIndex, x, z, 10);
    if (dd < 2.3) { wallHits.push({ km: +(w.d / 1000).toFixed(3), dist: +dd.toFixed(2) }); t = 9; break; }
  }
}
console.log(`samples ${n}; worst land ${worstLand.toFixed(2)} m, worst bed ${worstBed.toFixed(2)} m relative to the asphalt; walls ${walls.walls.length}, walls on asphalt ${wallHits.length}`);
const spots = []; for (const p of probs) { const last = spots[spots.length - 1]; if (last && p.km - last.km1 < 0.03) { last.km1 = p.km; last.maxLand = Math.max(last.maxLand, p.land); last.maxBed = Math.max(last.maxBed, p.bed); last.n++; } else spots.push({ km0: p.km, km1: p.km, maxLand: p.land, maxBed: p.bed, n: 1 }); }
// retaining walls on perched edges (decor.js buildNaturalRoad)
const surfaceAt = makeSurfaceSampler(F, bed);
const pts = track.pts, np = pts.length;
const normals = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(np - 1, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; return [-tz / L, tx / L]; });
const pe = perchedEdges(pts, normals, surfaceAt);
let walled = 0, wallOnOtherLeg = 0;
const dense = []; for (let d = 0; d <= track.length; d += 1) { const q = sampleTrack(track, d); dense.push({ d, x: q.pos.x, z: q.pos.z }); }
for (const sg of [1, -1]) for (let i = 0; i < np; i++) if (pe.perched[sg][i]) {
  walled++;
  for (const off of [2.05, 2.5]) {
    const x = pts[i].x + normals[i][0] * sg * off, z = pts[i].z + normals[i][1] * sg * off;
    for (const q of dense) if (Math.abs(q.d - track.cum[i]) > 25 && Math.hypot(q.x - x, q.z - z) < 2.35) { wallOnOtherLeg++; break; }
  }
}
const walledKm = []; for (const sg of [1, -1]) for (let i = 0; i < np; i++) if (pe.perched[sg][i]) walledKm.push((track.cum[i] / 1000).toFixed(2));
console.log(`retaining-wall stations ${walled} at km ${[...new Set(walledKm)].sort().join(',')}; wall points over another leg: ${wallOnOtherLeg}`);
// a perched edge sample is acceptable when its station is walled
const isWalled = (km, off) => { const d = km * 1000; let i = 0; while (i < np - 1 && track.cum[i + 1] < d) i++; const sg = off > 0 ? 1 : -1; return pe.perched[sg][i] || pe.perched[sg][Math.min(np - 1, i + 1)]; };
const openPerch = perch.filter((p) => !isWalled(p.km, p.off));
console.log(`perched edge samples not closed by a wall: ${openPerch.length}`, openPerch.map((p) => p.km + '/' + p.off + ':' + p.gap).join(' '));
console.log(`walls dropped because they stood on a paved leg: ${walls.skipped}`);
console.log(`edge samples where the road would look perched (>0.30 m above ground): ${perch.length}`, perch.map((p) => p.km + '/' + p.off + ':' + p.gap).join(' '));
console.log('problem spots (surface >= asphalt-2cm):', spots.length);
for (const s of spots) console.log(`  km ${s.km0.toFixed(3)}–${s.km1.toFixed(3)}  land ${s.maxLand} m  bed ${s.maxBed} m  (${s.n} samples)`);
for (const w of wallHits) console.log(`  wall on asphalt at km ${w.km} (${w.dist} m from axis)`);
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ spots, probs, wallHits, openPerch }, null, 1));
const fails = [];
if (worstLand > -0.02) fails.push(`coarse terrain reaches ${worstLand.toFixed(2)} m relative to the asphalt`);
if (worstBed > 0) fails.push(`corridor bed reaches ${worstBed.toFixed(2)} m relative to the asphalt`);
if (wallHits.length) fails.push(`${wallHits.length} stone walls stand on the asphalt`);
if (wallOnOtherLeg) fails.push(`${wallOnOtherLeg} retaining-wall points over another leg`);
const bigOpen = openPerch.filter((p) => p.gap > 0.5);
if (bigOpen.length) fails.push(`${bigOpen.length} edges float > 0.5 m without a wall`);
if (fails.length) { for (const f of fails) console.error('✗ ' + f); process.exitCode = 1; }
else console.log('✓ the Villard road is never covered by terrain, bed or walls, and no edge floats > 0.5 m');
