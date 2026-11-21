// Villard road surface: cracked grey asphalt with a broken edge, a
// gravel/dirt shoulder that fades into the meadow, and retaining walls where
// stacked hairpin legs leave an edge in the air. Procedural canvas textures only.
import * as THREE from 'three';

// Periodic value noise (wraps every `py` cells in Y so the texture tiles along the road)
function phash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function pnoise(x, y, py) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
  const a = phash(xi, y0), b = phash(xi + 1, y0), c = phash(xi, y1), d = phash(xi + 1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function pfbm(x, y, py, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * pnoise(x * f, y * f, py * f); n += a; f *= 2; a *= 0.5; } return s / n; }
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function toTex(cv, aniso = 4) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return t;
}

// Asphalt: u spans the paved width + overhang (metres = widthM), v spans lenM metres.
export function makeAsphaltTexture(widthM, lenM, edgeM = 0.32) {
  const W = 512, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), D = img.data;
  const pxM = W / widthM, PY = 24; // noise lattice: 24 cells along the tile
  const ny = (y) => (y / H) * PY;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, um = x / pxM, vm = (y / H) * lenM;
    const macro = pfbm(x / W * 6, ny(y) * 0.5, PY * 0.5, 3);          // big patches
    const mid = pfbm(x / W * 30, ny(y) * 2.5, PY * 2.5, 2);           // blotches
    const grain = Math.random();
    let v = 92 + (macro - 0.5) * 34 + (mid - 0.5) * 14 + (grain - 0.5) * 22;
    if (grain > 0.985) v += 38; else if (grain < 0.02) v -= 26;       // aggregate specks
    // slightly polished wheel tracks
    const wt = Math.min(Math.abs(um / widthM - 0.3), Math.abs(um / widthM - 0.7));
    v += Math.max(0, 1 - wt * 14) * 5;
    // edge: worn, dusty, broken outline
    const de = Math.min(um, widthM - um);                              // metres to outer border
    const side = um < widthM / 2 ? 0 : 1;
    const ragged = edgeM * (0.25 + 0.9 * pfbm(side * 50 + 3, ny(y) * 4, PY * 4, 3)) + (pnoise(side * 90 + 7, ny(y) * 40, PY * 40) - 0.5) * 0.06;
    let a = 255, r = v + 3, gg = v + 2, b = v;
    if (de < ragged) a = 0;
    else if (de < ragged + 0.35) { const k = 1 - (de - ragged) / 0.35; r += 12 * k; gg += 8 * k; b -= 2 * k; } // dust near the crumbly edge
    D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = a;
    void vm;
  }
  g.putImageData(img, 0, 0);
  // cracks: random-walk polylines, some branching, drawn twice (tiling seam)
  const crack = (x, y, ang, len, w, depth) => {
    g.lineWidth = w; g.strokeStyle = `rgba(36,36,38,${0.32 + rnd() * 0.22})`; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < len; i++) {
      ang += (rnd() - 0.5) * 0.9; x += Math.cos(ang) * 6; y += Math.sin(ang) * 6; g.lineTo(x, y);
      if (depth < 2 && rnd() < 0.06) { g.stroke(); crack(x, y, ang + (rnd() < 0.5 ? 1.2 : -1.2), len * 0.4 | 0, w * 0.7, depth + 1); g.lineWidth = w; g.strokeStyle = `rgba(36,36,38,0.4)`; g.beginPath(); g.moveTo(x, y); }
    }
    g.stroke();
  };
  for (const dy of [0, -H, H]) {
    seed = 7;
    g.save(); g.translate(0, dy);
    for (let i = 0; i < 40; i++) crack(rnd() * W, rnd() * H, rnd() * Math.PI * 2, 8 + rnd() * 34, 0.7 + rnd() * 0.5, 0);
    // longitudinal cracks near the edges (typical mountain road)
    for (let i = 0; i < 10; i++) crack(rnd() < 0.5 ? 30 + rnd() * 50 : W - 30 - rnd() * 50, rnd() * H, Math.PI / 2 + (rnd() - 0.5) * 0.3, 30 + rnd() * 40, 0.9, 1);
    // a few darker repair patches
    g.restore();
  }
  // keep edge transparency after drawing cracks: redo alpha from the pixel pass
  const after = g.getImageData(0, 0, W, H);
  for (let i = 3; i < after.data.length; i += 4) after.data[i] = D[i];
  g.putImageData(after, 0, 0);
  return toTex(cv);
}

// Shoulder: u=0 sits under the asphalt edge, u=1 is the outer fade into the meadow.
export function makeShoulderTexture(widthM, lenM, underM, uphill = false) {
  const W = 256, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), D = img.data, PY = 24;
  const meadow = [127, 184, 86], meadowDark = [96, 150, 62], gravel = [124, 117, 104], dirt = [116, 104, 82];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, m = (x / W) * widthM - underM; // metres from paved edge
    const nyv = (y / H) * PY;
    const n1 = pfbm(x / W * 5 + (uphill ? 40 : 0), nyv * 3, PY * 3, 3);
    const n2 = pfbm(x / W * 22, nyv * 9, PY * 9, 2);
    const n3 = pnoise(x / W * 60, nyv * 30, PY * 30);
    const gravelEnd = (uphill ? 0.6 : 0.35) + (n1 - 0.5) * 0.6 + (n3 - 0.5) * 0.25; // gravel band ~0.1–0.8 m
    const grassFull = gravelEnd + 0.35 + n2 * 0.3;
    const sp = Math.random();
    let c;
    if (m < gravelEnd && !(n2 > 0.68 && m > 0.1)) {
      const t = Math.max(0, m / Math.max(0.05, gravelEnd));
      c = gravel.map((v, k) => v * (1 - t * 0.4) + dirt[k] * t * 0.4 + (sp - 0.5) * 34 + (sp > 0.95 ? 30 : 0));
    } else {
      const t = Math.min(1, (m - gravelEnd) / Math.max(0.05, grassFull - gravelEnd));
      const blade = (Math.random() - 0.5) * 30 + (n2 - 0.5) * 30;
      const grass = meadowDark.map((v, k) => v * (1 - t) + meadow[k] * t + blade);
      const tuftMix = Math.max(0, Math.min(1, t * 1.8 + (n3 - 0.5) * 1.4 + (n2 - 0.5)));    // grass tufts bite into the dirt
      c = dirt.map((v, k) => v * (1 - tuftMix) + grass[k] * tuftMix + (sp - 0.5) * 16);
    }
    // uphill: shallow darker gutter just after the gravel
    if (uphill && m > gravelEnd - 0.1 && m < gravelEnd + 0.3) c = c.map((v) => v * 0.82);
    // fade to the terrain over the outer metre, ragged
    const fadeStart = Math.min(widthM - underM - 0.8, grassFull + 0.05 + (n3 - 0.5) * 0.3);
    let a = 1;
    if (m > fadeStart) a = Math.max(0, 1 - (m - fadeStart) / 0.7 - (n3 - 0.5) * 0.5);
    D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = Math.max(0, Math.min(255, a * 255));
  }
  g.putImageData(img, 0, 0);
  return toTex(cv, 2);
}

// Where the ground beside a paved edge drops away by more than `minGap`
// (stacked hairpin legs, the inside of tight switchbacks), the road would
// look like a floating sheet. Mark those stations so a stone retaining wall
// with a low parapet can close the step.
export const WALL_INNER = 2.05, WALL_OUTER = 2.5, WALL_PARAPET = 0.32;
export function perchedEdges(pts, normals, surfaceAt, { lift = 0.04, minGap = 0.35 } = {}) {
  const n = pts.length, out = { 1: new Uint8Array(n), [-1]: new Uint8Array(n) }, ground = { 1: new Float32Array(n), [-1]: new Float32Array(n) };
  for (const s of [1, -1]) {
    const raw = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const [nx, nz] = normals[i], p = pts[i];
      let g = Infinity;
      for (const off of [2.4, 2.9, 3.4]) g = Math.min(g, surfaceAt(p.x + nx * s * off, p.z + nz * s * off));
      ground[s][i] = g;
      raw[i] = p.y + lift - g > minGap ? 1 : 0;
    }
    for (let i = 0; i < n; i++) out[s][i] = raw[i] || (i > 0 && raw[i - 1]) || (i < n - 1 && raw[i + 1]) ? 1 : 0;
  }
  return { perched: out, ground };
}

export function buildRetainingWallGeometry(pts, cum, normals, perch, lift = 0.04) {
  const P = [], U = [], I = [];
  const quad = (a, b, c, d, ua, ub, va, vb) => {
    const k = P.length / 3; P.push(...a, ...b, ...c, ...d); U.push(ua, va, ub, va, ub, vb, ua, vb); I.push(k, k + 1, k + 2, k, k + 2, k + 3);
  };
  let segs = 0;
  for (const s of [1, -1]) {
    const on = perch.perched[s], gr = perch.ground[s];
    for (let i = 0; i < pts.length - 1; i++) {
      if (!on[i] || !on[i + 1]) continue;
      segs++;
      const pt = (k, off, y) => [pts[k].x + normals[k][0] * s * off, y, pts[k].z + normals[k][1] * s * off];
      const top = (k) => pts[k].y + lift + WALL_PARAPET, road = (k) => pts[k].y - 0.03;
      const foot = (k) => Math.min(isFinite(gr[k]) ? gr[k] : pts[k].y - 3, pts[k].y) - 0.4;
      const u0 = cum[i] / 2, u1 = cum[i + 1] / 2;
      quad(pt(i, WALL_INNER, road(i)), pt(i + 1, WALL_INNER, road(i + 1)), pt(i + 1, WALL_INNER, top(i + 1)), pt(i, WALL_INNER, top(i)), u0, u1, 0, 0.16);
      quad(pt(i, WALL_INNER, top(i)), pt(i + 1, WALL_INNER, top(i + 1)), pt(i + 1, WALL_OUTER, top(i + 1)), pt(i, WALL_OUTER, top(i)), u0, u1, 0, 0.2);
      quad(pt(i, WALL_OUTER, top(i)), pt(i + 1, WALL_OUTER, top(i + 1)), pt(i + 1, WALL_OUTER, foot(i + 1)), pt(i, WALL_OUTER, foot(i)), u0, u1, 0, (top(i) - foot(i)) / 2);
    }
  }
  if (!I.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I); g.computeVertexNormals();
  g.userData.segments = segs;
  return g;
}

export function makeStoneTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#5d5953'; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 90; k++) { const v = 110 + Math.random() * 70; g.fillStyle = `rgb(${v | 0},${v * 0.97 | 0},${v * 0.9 | 0})`; g.beginPath(); g.roundRect(Math.random() * 128, Math.random() * 128, 12 + Math.random() * 18, 8 + Math.random() * 10, 3); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
