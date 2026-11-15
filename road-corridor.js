// Keep the paved ribbon clear of terrain and vegetation.
// The road is 4 m wide (half-width 2 m). Terrain vertices that can
// influence a point on the tarmac must sit strictly below the road.

export const ROAD_WIDTH = 4;
export const ROAD_HALF_WIDTH = 2;
export const ROAD_Y_LIFT = 0.35;       // road mesh above GPX height
export const ROAD_CLEARANCE = 0.75;    // terrain below GPX height in the hard corridor
export const ROAD_SHOULDER = 16;       // plus half-width → 18 m hard corridor (covers a 20 m cell plus margin)
export const ROAD_HARD_HALF = ROAD_HALF_WIDTH + ROAD_SHOULDER;
export const ROAD_BANK_WIDTH = 28;
export const ROAD_BANK_SLOPE = 0.4;
export const ROAD_SAMPLE_STEP = 8;
export const TERRAIN_CELL_SIZE = 20;   // alpine mesh (was 40 m — interpolation poked through)
export const VEG_CLEARANCE = 16;       // trees / props stay off the corridor

export function roadEnvelopeY(roadY, dist, {
  hardHalf = ROAD_HARD_HALF,
  clearance = ROAD_CLEARANCE,
  bankWidth = ROAD_BANK_WIDTH,
  bankSlope = ROAD_BANK_SLOPE
} = {}) {
  if (dist <= hardHalf) return roadY - clearance;
  if (dist >= bankWidth) return Infinity;
  return roadY - clearance + (dist - hardHalf) * bankSlope;
}

export function buildRoadIndex(pts, step = ROAD_SAMPLE_STEP) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1];
    const L = Math.hypot(B.x - A.x, B.z - A.z);
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      dense.push({
        x: A.x + (B.x - A.x) * t,
        y: A.y + (B.y - A.y) * t,
        z: A.z + (B.z - A.z) * t
      });
    }
  }
  dense.push(pts[pts.length - 1]);
  const CELL = 150, map = new Map();
  for (const p of dense) {
    const k = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`;
    (map.get(k) || map.set(k, []).get(k)).push(p);
  }
  return { dense, map, cell: CELL };
}

export function nearbyRoadSamples(index, x, z, radius = ROAD_BANK_WIDTH) {
  const { cell, map } = index;
  const r = Math.ceil(radius / cell);
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  const out = [];
  const r2 = radius * radius;
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      const list = map.get(`${cx + i},${cz + j}`);
      if (!list) continue;
      for (const p of list) {
        const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d2 <= r2) out.push({ d: Math.sqrt(d2), y: p.y, x: p.x, z: p.z });
      }
    }
  }
  return out;
}

export function distToRoad(index, x, z, radius = ROAD_BANK_WIDTH * 2) {
  const near = nearbyRoadSamples(index, x, z, radius);
  let best = Infinity;
  for (const p of near) if (p.d < best) best = p.d;
  return best;
}

// Clamp a terrain vertex so it stays under every nearby road sample
// (needed in hairpins, where the closest XZ point may be the wrong altitude).
export function clampHeightToRoadCorridor(y, x, z, index, opts = {}) {
  const radius = opts.bankWidth || ROAD_BANK_WIDTH;
  const nearby = nearbyRoadSamples(index, x, z, radius);
  if (!nearby.length) return y;
  let out = y;
  for (const p of nearby) {
    const cap = roadEnvelopeY(p.y, p.d, opts);
    if (cap < out) out = cap;
  }
  return out;
}

export function sampleTrackXZ(track, distanceM) {
  const { pts, cum } = track;
  const d = Math.max(0, Math.min(distanceM, cum[cum.length - 1]));
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= d) lo = m; else hi = m;
  }
  const A = pts[lo], B = pts[hi], span = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / span;
  const x = A.x + (B.x - A.x) * t;
  const y = A.y + (B.y - A.y) * t;
  const z = A.z + (B.z - A.z) * t;
  let tx = B.x - A.x, tz = B.z - A.z;
  const L = Math.hypot(tx, tz) || 1;
  tx /= L; tz /= L;
  return { x, y, z, tx, tz, nx: -tz, nz: tx };
}

// Sample terrain under the road + shoulders. Each sample records how far
// the terrain sits below the paved surface (GPX + ROAD_Y_LIFT).
export function sampleRoadCorridor(track, heightAt, {
  stepM = 5,
  offsets = null,
  lift = ROAD_Y_LIFT,
  shoulder = ROAD_SHOULDER
} = {}) {
  const offs = offsets || (() => {
    const o = [0];
    const max = ROAD_HALF_WIDTH + shoulder;
    for (let d = 0.5; d <= max + 0.01; d += 0.5) o.push(d, -d);
    return o;
  })();
  const length = track.length || track.cum[track.cum.length - 1];
  const samples = [];
  for (let s = 0; s <= length; s += stepM) {
    const p = sampleTrackXZ(track, s);
    for (const off of offs) {
      const x = p.x + p.nx * off, z = p.z + p.nz * off;
      const terrainY = heightAt(x, z);
      const roadY = p.y + lift;
      samples.push({
        s, off, x, z,
        terrainY, roadY, gpxY: p.y,
        clearance: roadY - terrainY
      });
    }
  }
  return samples;
}

export function corridorViolations(samples, minClearance = 0.2) {
  return samples.filter((s) => s.clearance < minClearance);
}
