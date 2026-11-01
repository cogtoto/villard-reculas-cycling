// Parsing GPX + conversion en coordonnées locales (mètres) — utilisable navigateur et Node.
const R = 6371000;

export function parseGpx(text) {
  const pts = [];
  const re = /<trkpt\s+([^>]*)>([\s\S]*?)<\/trkpt>/g;
  let m;
  while ((m = re.exec(text))) {
    const lat = parseFloat(/lat="([^"]+)"/.exec(m[1])?.[1]);
    const lon = parseFloat(/lon="([^"]+)"/.exec(m[1])?.[1]);
    const e = /<ele>([^<]+)<\/ele>/.exec(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push({ lat, lon, ele: e ? parseFloat(e[1]) : 0 });
  }
  return pts;
}

// Équirectangulaire autour du centroïde : X = Est, Z = -Nord (Three.js : -Z = "devant"), Y = altitude.
export function toLocal(pts) {
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lon0 = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const out = pts.map((p) => ({
    x: ((p.lon - lon0) * Math.PI / 180) * R * k,
    y: p.ele,
    z: -((p.lat - lat0) * Math.PI / 180) * R,
  }));
  out.origin = { lat0, lon0 };
  return out;
}

// Ramer–Douglas–Peucker 2D (XZ) itératif, tolérance ajustée pour viser maxPts.
function rdp(pts, eps) {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const A = pts[a], B = pts[b];
    const dx = B.x - A.x, dz = B.z - A.z, L2 = dx * dx + dz * dz || 1e-9;
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) {
      const P = pts[i];
      const t = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.z - A.z) * dz) / L2));
      const d = Math.hypot(P.x - (A.x + t * dx), P.z - (A.z + t * dz));
      if (d > best) { best = d; bi = i; }
    }
    if (best > eps) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function simplify(pts, maxPts = 1200) {
  // dédoublonnage des points quasi identiques
  const clean = [pts[0]];
  for (const p of pts) { const q = clean[clean.length - 1]; if (Math.hypot(p.x - q.x, p.z - q.z) > 0.5) clean.push(p); }
  let lo = 0.1, hi = 50, out = clean;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2, r = rdp(clean, mid);
    if (r.length > maxPts) lo = mid; else { hi = mid; out = r; }
  }
  return out;
}

// Fusion des passages superposés (aller-retour) : densifie puis colle chaque point
// proche (< snapDist) d'un segment parcouru plus tôt sur ce segment → une seule route.
// Les points collés reçoivent dup=true (buildRoad ne redessine pas ces tronçons).
export function mergeOverlaps(pts, snapDist = 9, step = 8, minGap = 150) {
  const dense = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const A = pts[i - 1], B = pts[i], L = Math.hypot(B.x - A.x, B.z - A.z), k = Math.max(1, Math.ceil(L / step));
    for (let j = 1; j <= k; j++) { const t = j / k; dense.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t }); }
  }
  const cell = 40, grid = new Map(), key = (cx, cz) => cx + ',' + cz;
  const segs = []; // segments de référence (non dupliqués) : {A,B,c}
  const addSeg = (A, B, c) => {
    const id = segs.push({ A, B, c }) - 1;
    const x0 = Math.floor(Math.min(A.x, B.x) / cell), x1 = Math.floor(Math.max(A.x, B.x) / cell);
    const z0 = Math.floor(Math.min(A.z, B.z) / cell), z1 = Math.floor(Math.max(A.z, B.z) / cell);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const kk = key(x, z); (grid.get(kk) || grid.set(kk, []).get(kk)).push(id); }
  };
  const out = [{ ...dense[0] }];
  let c = 0;
  for (let i = 1; i < dense.length; i++) {
    const P = dense[i];
    c += Math.hypot(P.x - dense[i - 1].x, P.z - dense[i - 1].z);
    let best = snapDist, bp = null;
    const cx = Math.floor(P.x / cell), cz = Math.floor(P.z / cell);
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) for (const id of grid.get(key(x, z)) || []) {
      const { A, B, c: sc } = segs[id];
      if (c - sc < minGap) continue; // tronçon immédiatement précédent : pas un chevauchement
      const dx = B.x - A.x, dz = B.z - A.z, L2 = dx * dx + dz * dz || 1e-9;
      // même axe de route uniquement (aller ou retour) : évite de coller deux lacets voisins
      const pv = dense[i - 1], mx = P.x - pv.x, mz = P.z - pv.z, ml = Math.hypot(mx, mz) || 1;
      if (Math.abs((mx * dx + mz * dz) / (ml * Math.sqrt(L2))) < 0.8) continue;
      const t = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.z - A.z) * dz) / L2));
      const qx = A.x + dx * t, qz = A.z + dz * t, d = Math.hypot(P.x - qx, P.z - qz);
      if (d < best) { best = d; bp = { x: qx, y: A.y + (B.y - A.y) * t, z: qz, dup: true }; }
    }
    const Q = bp || { x: P.x, y: P.y, z: P.z };
    const prev = out[out.length - 1];
    if (!Q.dup && !prev.dup) addSeg(prev, Q, c);
    if (Math.hypot(Q.x - prev.x, Q.z - prev.z) > 0.3) out.push(Q); else if (Q.dup) prev.dup = prev.dup || false;
  }
  return out;
}

// Altitude lissée (moyenne glissante) puis distances cumulées.
export function buildTrack(raw, maxPts = 1200) {
  const local = toLocal(raw);
  const w = 15;
  const sm = local.map((p, i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(local.length - 1, i + w); j++) { s += local[j].y; n++; }
    return { ...p, y: s / n };
  });
  const pts = mergeOverlaps(simplify(sm, maxPts));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return { pts, cum, length: cum[cum.length - 1], rawCount: raw.length, origin: local.origin };
}

// Position, tangente et pente (%) à une distance donnée (pente sur fenêtre ±40 m).
export function sampleTrack(track, d) {
  const { pts, cum, length } = track;
  d = Math.max(0, Math.min(length, d));
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const A = pts[lo], B = pts[hi], seg = cum[hi] - cum[lo] || 1e-6, t = (d - cum[lo]) / seg;
  const pos = { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t };
  const dir = { x: (B.x - A.x) / seg, z: (B.z - A.z) / seg };
  const eleAt = (dd) => {
    dd = Math.max(0, Math.min(length, dd));
    let l = 0, h = cum.length - 1;
    while (h - l > 1) { const m = (l + h) >> 1; if (cum[m] <= dd) l = m; else h = m; }
    const s = cum[h] - cum[l] || 1e-6;
    return pts[l].y + (pts[h].y - pts[l].y) * ((dd - cum[l]) / s);
  };
  const d0 = Math.max(0, d - 40), d1 = Math.min(length, d + 40);
  const gradePct = d1 > d0 ? ((eleAt(d1) - eleAt(d0)) / (d1 - d0)) * 100 : 0;
  return { pos, dir, gradePct };
}
