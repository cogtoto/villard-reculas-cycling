// Keep the paved ribbon flush with the ground and clear of grass.
// The road is 4 m wide (half-width 2 m). Terrain in the corridor is
// set to the road height minus a small epsilon, then blended back to
// natural ground over a short shoulder so there is no visible step
// (up or down) and no trench from a deep carve.

export const ROAD_WIDTH = 4;
export const ROAD_HALF_WIDTH = 2;
export const ROAD_Y_LIFT = 0.04;       // a few cm; polygonOffset / renderOrder do the rest
export const ROAD_VERGE_LIFT = 0.02;   // grass edge strips sit almost at road height
export const ROAD_CLEARANCE = 0.05;    // terrain epsilon below GPX height in the flush band
export const ROAD_SHOULDER = 5;        // plus half-width → 7 m flush corridor
export const ROAD_HARD_HALF = ROAD_HALF_WIDTH + ROAD_SHOULDER;
export const ROAD_BLEND = 8;           // smooth blend to natural terrain (4–8 m band)
export const ROAD_BLEND_END = ROAD_HARD_HALF + ROAD_BLEND;
export const ROAD_BANK_WIDTH = ROAD_BLEND_END;
export const ROAD_MAX_PERCH = 0.15;    // shoulder must stay within 15 cm of the ribbon
export const ROAD_SAMPLE_STEP = 4;
export const TERRAIN_CELL_SIZE = 20;   // coarse alpine mesh; a 4 m bed carries the corridor
export const ROAD_BED_CELL = 4;
export const VEG_CLEARANCE = 16;       // trees / props stay off the corridor

export function smoothstep(a, b, x) {
  if (b <= a) return x >= b ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function roadWeight(dist, flushHalf = ROAD_HARD_HALF, blend = ROAD_BLEND) {
  if (dist <= flushHalf) return 1;
  if (dist >= flushHalf + blend) return 0;
  return 1 - smoothstep(flushHalf, flushHalf + blend, dist);
}

// Height the terrain should take next to a single road sample.
// Pass naturalY to blend back to the DEM over the shoulder; without it
// the flush band is returned and the blend is released to +Infinity.
export function roadEnvelopeY(roadY, dist, {
  hardHalf = ROAD_HARD_HALF,
  clearance = ROAD_CLEARANCE,
  blend = ROAD_BLEND,
  naturalY = Infinity
} = {}) {
  const w = roadWeight(dist, hardHalf, blend);
  if (w <= 0) return naturalY;
  return w * (roadY - clearance) + (1 - w) * (naturalY === Infinity ? roadY - clearance : naturalY);
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
        i: dense.length,
        x: A.x + (B.x - A.x) * t,
        y: A.y + (B.y - A.y) * t,
        z: A.z + (B.z - A.z) * t
      });
    }
  }
  dense.push({ i: dense.length, ...pts[pts.length - 1] });
  const CELL = 150, map = new Map();
  for (const p of dense) {
    const k = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`;
    (map.get(k) || map.set(k, []).get(k)).push(p);
  }
  return { dense, map, cell: CELL };
}

export function nearbyRoadSamples(index, x, z, radius = ROAD_BLEND_END) {
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
        if (d2 <= r2) out.push({ d: Math.sqrt(d2), y: p.y, x: p.x, z: p.z, i: p.i });
      }
    }
  }
  return out;
}

export function distToRoad(index, x, z, radius = ROAD_BLEND_END * 2) {
  const near = nearbyRoadSamples(index, x, z, radius);
  let best = Infinity;
  for (const p of near) if (p.d < best) best = p.d;
  return best;
}

// Projections onto nearby polyline segments, with interpolated height.
export function nearbyRoadSegments(index, x, z, radius = ROAD_BLEND_END) {
  const nearby = nearbyRoadSamples(index, x, z, radius);
  if (!nearby.length) return [];
  const dense = index.dense;
  const seen = new Set();
  const segs = [];
  for (const p of nearby) {
    const i0 = p.i;
    if (i0 == null) continue;
    for (const s of [i0 - 1, i0]) {
      if (s < 0 || s >= dense.length - 1 || seen.has(s)) continue;
      seen.add(s);
      const A = dense[s], B = dense[s + 1];
      const vx = B.x - A.x, vz = B.z - A.z;
      const L2 = vx * vx + vz * vz || 1;
      const tRaw = ((x - A.x) * vx + (z - A.z) * vz) / L2;
      const t = Math.max(0, Math.min(1, tRaw));
      const px = A.x + vx * t, pz = A.z + vz * t;
      segs.push({
        d: Math.hypot(x - px, z - pz),
        y: A.y + (B.y - A.y) * t,
        x: px, z: pz, t, tRaw, s
      });
    }
  }
  return segs;
}

// Closest point on the densified polyline, with interpolated height.
export function closestRoadPoint(index, x, z, radius = ROAD_BLEND_END) {
  const segs = nearbyRoadSegments(index, x, z, radius);
  if (!segs.length) {
    const nearby = nearbyRoadSamples(index, x, z, radius);
    if (!nearby.length) return null;
    let p = nearby[0];
    for (const q of nearby) if (q.d < p.d) p = q;
    return { d: p.d, y: p.y, x: p.x, z: p.z };
  }
  let best = segs[0];
  for (const s of segs) if (s.d < best.d) best = s;
  return best;
}

// Fit a terrain vertex to the corridor: raise or lower it so the road
// sits flush, blending to natural ground over the shoulder. In hairpins,
// nearby legs are weight-averaged so the upper road is not carved down
// to the lower one. A hard cap still keeps flush-band vertices below
// every paved surface they could bury.
export function fitHeightToRoadCorridor(y, x, z, index, opts = {}) {
  const flushHalf = opts.hardHalf || opts.flushHalf || ROAD_HARD_HALF;
  const blend = opts.blend ?? ROAD_BLEND;
  const clearance = opts.clearance ?? ROAD_CLEARANCE;
  const radius = flushHalf + blend;
  const segs = nearbyRoadSegments(index, x, z, radius);
  if (!segs.length) return y;
  let closest = segs[0];
  for (const s of segs) if (s.d < closest.d) closest = s;
  const w = roadWeight(closest.d, flushHalf, blend);
  let out = w * (closest.y - clearance) + (1 - w) * y;
  // Never rise above a ribbon that actually covers this XZ (tight inside
  // of a bend). Do not cap against segments further down the same climb.
  // Only segments the point actually sits beside (t in range), so a
  // downhill vertex a few metres along the same climb cannot pull us down.
  const cover = ROAD_HALF_WIDTH + 0.6;
  for (const s of segs) {
    if (s.tRaw >= -0.02 && s.tRaw <= 1.02 && s.d <= cover) {
      out = Math.min(out, s.y - clearance);
    }
  }
  return out;
}

// Back-compat alias used by the height-field builder.
export function clampHeightToRoadCorridor(y, x, z, index, opts = {}) {
  return fitHeightToRoadCorridor(y, x, z, index, opts);
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
  shoulder = ROAD_SHOULDER,
  roadIndex = null
} = {}) {
  const offs = offsets || (() => {
    const o = [0];
    const max = ROAD_HALF_WIDTH + shoulder;
    for (let d = 0.5; d <= max + 0.01; d += 0.5) o.push(d, -d);
    return o;
  })();
  const index = roadIndex || (track.pts ? buildRoadIndex(track.pts) : null);
  const length = track.length || track.cum[track.cum.length - 1];
  const samples = [];
  for (let s = 0; s <= length; s += stepM) {
    const p = sampleTrackXZ(track, s);
    for (const off of offs) {
      const x = p.x + p.nx * off, z = p.z + p.nz * off;
      const terrainY = heightAt(x, z);
      const closest = index ? closestRoadPoint(index, x, z) : null;
      const gpxY = closest ? closest.y : p.y;
      const roadY = gpxY + lift;
      samples.push({
        s, off, x, z,
        terrainY, roadY, gpxY, stationY: p.y,
        clearance: roadY - terrainY
      });
    }
  }
  return samples;
}

export function corridorViolations(samples, minClearance = 0.2) {
  return samples.filter((s) => s.clearance < minClearance);
}

export function perchViolations(samples, maxClearance = ROAD_MAX_PERCH) {
  return samples.filter((s) => s.clearance > maxClearance);
}
