// Alpine chalets — stone base, wood upper, balcony, overhanging roof, chimney.
// Instanced, merged, low-poly: light enough for an i3-5020U.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VEG_CLEARANCE } from './road-corridor.js';

let seed = 4242;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export const HERO_EXCLUSION_M = 45;
export const VILLAGE_MIN_SEP = 13;
export const HAMLET_MIN_SEP = 18;

// Simple procedural textures
function canvasTex(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.repeat.set(2, 2);
  return t;
}

const woodTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#a87d52';
  g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 18) {
    const shade = 150 + rand() * 50;
    const r = shade * 1.1, gv = shade * 0.88, b = shade * 0.65;
    g.fillStyle = `rgb(${r}, ${gv}, ${b})`;
    g.fillRect(0, y, S, 16);
    for (let x = 0; x < S; x += 8 + rand() * 16) {
      g.fillStyle = `rgba(80, 50, 30, ${0.15 + rand() * 0.1})`;
      g.fillRect(x, y + 2, 2 + rand() * 3, 12);
    }
    g.fillStyle = 'rgba(40, 25, 15, 0.5)';
    g.fillRect(0, y + 16, S, 2);
  }
});

const stoneTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#d8cfc5';
  g.fillRect(0, 0, S, S);
  for (let k = 0; k < 90; k++) {
    const x = rand() * S, y = rand() * S;
    const w = 15 + rand() * 30, h = 10 + rand() * 16;
    const v = 170 + rand() * 50;
    g.fillStyle = `rgb(${v}, ${v * 0.96}, ${v * 0.92})`;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(90, 85, 75, 0.4)';
    g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
  }
});

const roofTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#2f3034';
  g.fillRect(0, 0, S, S);
  const rowH = 14;
  for (let r = 0; r < S / rowH; r++) {
    const offset = (r % 2) * 12;
    for (let x = -offset; x < S; x += 24) {
      const v = 42 + rand() * 28;
      g.fillStyle = `rgb(${v}, ${v}, ${v + 6})`;
      g.fillRect(x + 1, r * rowH, 22, rowH - 1);
      g.fillStyle = 'rgba(0, 0, 0, 0.2)';
      g.fillRect(x, r * rowH + rowH - 1, 24, 1);
    }
  }
});

function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function gableWall(width, height, thick) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, steps: 1 });
}

function windowSet(parts, x, y, z, { w = 0.75, h = 1.05, shutters = true, side = false } = {}) {
  if (side) {
    parts.wood.push(box(0.05, h + 0.14, w + 0.14, x, y, z));
    parts.windows.push(box(0.05, h, w, x + Math.sign(x) * 0.03, y, z));
    if (shutters) {
      parts.wood.push(box(0.07, h, 0.32, x + Math.sign(x) * 0.04, y, z - w / 2 - 0.22));
      parts.wood.push(box(0.07, h, 0.32, x + Math.sign(x) * 0.04, y, z + w / 2 + 0.22));
    }
  } else {
    parts.wood.push(box(w + 0.14, h + 0.14, 0.05, x, y, z));
    parts.windows.push(box(w, h, 0.05, x, y, z + 0.03));
    if (shutters) {
      parts.wood.push(box(0.32, h, 0.07, x - w / 2 - 0.22, y, z + 0.02));
      parts.wood.push(box(0.32, h, 0.07, x + w / 2 + 0.22, y, z + 0.02));
    }
  }
}

export function createChaletGeometry(variant) {
  const { W, D, baseH, upperH, roofPitch, chimney = 'right', shutters = true } = variant;
  const parts = { stone: [], wood: [], roof: [], windows: [] };
  const plinth = 0.35;

  // Stone plinth + ground floor + corner quoins
  parts.stone.push(box(W + 0.45, plinth, D + 0.45, 0, plinth / 2, 0));
  parts.stone.push(box(W, baseH, D, 0, plinth + baseH / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.stone.push(box(0.32, baseH, 0.32, sx * (W / 2 - 0.04), plinth + baseH / 2, sz * (D / 2 - 0.04)));
  }

  // Door on the front (+Z)
  parts.wood.push(box(1.05, 2.05, 0.1, 0, plinth + 1.05, D / 2 + 0.04));

  // Wooden upper storey, slightly inset
  parts.wood.push(box(W - 0.15, upperH, D - 0.15, 0, plinth + baseH + upperH / 2, 0));

  const roofH = (D / 2) * Math.tan(roofPitch);
  // Wooden gable ends stay just under the roof underside so they do not poke the ridge
  for (const side of [-1, 1]) {
    const g = gableWall(W - 0.2, Math.max(0.4, roofH - 0.12), 0.14);
    if (side < 0) g.rotateY(Math.PI);
    const z0 = side > 0 ? (D / 2 - 0.14) : -D / 2;
    g.translate(0, plinth + baseH + upperH, z0);
    parts.wood.push(g);
  }

  // Front balcony: deck, posts, rails, a few decorative X panels
  const balD = 1.55;
  const balY = plinth + baseH + 0.08;
  parts.wood.push(box(W - 0.15, 0.14, balD, 0, balY, D / 2 + balD / 2 - 0.04));
  const railZ = D / 2 + balD - 0.12;
  const postH = 1.0;
  const xs = [];
  for (let x = -W / 2 + 0.3; x <= W / 2 - 0.3 + 0.01; x += 0.8) xs.push(x);
  for (const x of xs) {
    parts.wood.push(box(0.08, postH, 0.08, x, balY + 0.07 + postH / 2, railZ));
  }
  parts.wood.push(box(W - 0.45, 0.07, 0.07, 0, balY + postH + 0.04, railZ));
  parts.wood.push(box(W - 0.45, 0.06, 0.06, 0, balY + postH * 0.5, railZ));
  for (let i = 0; i < xs.length - 1; i += 2) {
    const x0 = xs[i], x1 = xs[i + 1];
    const mid = (x0 + x1) / 2, span = x1 - x0;
    const g1 = new THREE.BoxGeometry(span * 1.05, 0.05, 0.05);
    g1.rotateZ(Math.atan2(postH * 0.72, span));
    g1.translate(mid, balY + 0.18 + postH * 0.42, railZ);
    parts.wood.push(g1);
    const g2 = new THREE.BoxGeometry(span * 1.05, 0.05, 0.05);
    g2.rotateZ(-Math.atan2(postH * 0.72, span));
    g2.translate(mid, balY + 0.18 + postH * 0.42, railZ);
    parts.wood.push(g2);
  }
  for (const side of [-1, 1]) {
    parts.wood.push(box(0.07, postH, balD - 0.25, side * (W / 2 - 0.22), balY + 0.07 + postH / 2, D / 2 + balD / 2));
  }

  // Overhanging slate roof
  const overhang = 1.65;
  const roofTop = plinth + baseH + upperH + roofH;
  const roofW = W + overhang * 2;
  const roofL = (D / 2 + overhang) / Math.cos(roofPitch);
  const thick = 0.18;
  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(roofW, thick, roofL);
    g.rotateX(side * roofPitch);
    g.translate(0, roofTop - Math.sin(roofPitch) * roofL / 2, side * Math.cos(roofPitch) * roofL / 2);
    parts.roof.push(g);
  }
  // Ridge cap hides the hairline gap where the two slopes meet
  parts.roof.push(box(roofW + 0.04, 0.14, 0.32, 0, roofTop + 0.02, 0));

  // Stone chimney poking through one slope
  const chSign = chimney === 'left' ? -1 : 1;
  const chX = chSign * (W * 0.28);
  const chZ = D * 0.2;
  const roofYAt = plinth + baseH + upperH + Math.max(0.15, (D / 2 - Math.abs(chZ))) * Math.tan(roofPitch);
  parts.stone.push(box(0.62, 1.85, 0.48, chX, roofYAt + 0.55, chZ));
  parts.stone.push(box(0.82, 0.14, 0.68, chX, roofYAt + 1.52, chZ));

  // Ground-floor windows
  const gY = plinth + baseH * 0.55;
  windowSet(parts, -W * 0.28, gY, D / 2 + 0.05, { w: 0.7, h: 0.95, shutters });
  windowSet(parts, W * 0.28, gY, D / 2 + 0.05, { w: 0.7, h: 0.95, shutters });

  // Upper-floor windows (balcony façade + sides)
  const uY = plinth + baseH + upperH * 0.52;
  const nWin = W >= 10 ? 3 : 2;
  if (nWin === 3) {
    for (const x of [-W * 0.32, 0, W * 0.32]) windowSet(parts, x, uY, D / 2 + 0.05, { shutters });
  } else {
    for (const x of [-W * 0.22, W * 0.22]) windowSet(parts, x, uY, D / 2 + 0.05, { shutters });
  }
  for (const side of [-1, 1]) {
    windowSet(parts, side * (W / 2 + 0.05), uY, 0, { w: 0.7, h: 1.0, shutters, side: true });
  }

  const merged = {};
  for (const key in parts) {
    if (!parts[key].length) continue;
    const prepped = parts[key].map((g) => {
      const n = g.index ? g.toNonIndexed() : g.clone();
      if (!n.getAttribute('normal')) n.computeVertexNormals();
      if (!n.getAttribute('uv')) {
        n.setAttribute('uv', new THREE.Float32BufferAttribute(n.getAttribute('position').count * 2, 2));
      }
      return n;
    });
    merged[key] = mergeGeometries(prepped, false);
  }
  return merged;
}

export const VARIANTS = [
  { W: 7, D: 6, baseH: 2.3, upperH: 2.3, roofPitch: Math.PI / 7, chimney: 'left', shutters: true },
  { W: 8.4, D: 7, baseH: 2.5, upperH: 2.7, roofPitch: Math.PI / 8, chimney: 'right', shutters: true },
  { W: 9.6, D: 7.6, baseH: 2.6, upperH: 2.9, roofPitch: Math.PI / 8, chimney: 'left', shutters: true },
  { W: 11, D: 8.4, baseH: 2.9, upperH: 3.1, roofPitch: Math.PI / 9, chimney: 'right', shutters: true },
  { W: 9, D: 8.8, baseH: 2.4, upperH: 2.2, roofPitch: Math.PI / 7, chimney: 'left', shutters: true }
];

export function footprintHalf(W, D) {
  return { hw: W / 2 + 1.7, hd: D / 2 + 1.8 }; // roof overhang + balcony
}

// Same XZ transform as mesh rotation.y: local (lx, lz) → world
export function footprintWorld(x, z, rot, lx, lz) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}

export function footprintMinDist(x, z, rot, W, D, distFn) {
  const { hw, hd } = footprintHalf(W, D);
  let min = distFn(x, z);
  const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [0, hd], [0, -hd], [hw, 0], [-hw, 0]];
  for (const [a, b] of pts) {
    const p = footprintWorld(x, z, rot, a, b);
    const d = distFn(p.x, p.z);
    if (d < min) min = d;
  }
  return min;
}

export function footprintsOverlap(ax, az, aRot, aW, aD, bx, bz, bRot, bW, bD, pad = 1.0) {
  const aH = footprintHalf(aW, aD);
  const bH = footprintHalf(bW, bD);
  const corners = (x, z, rot, hw, hd) => {
    const out = [];
    for (const [lx, lz] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) {
      const p = footprintWorld(x, z, rot, lx, lz);
      out.push([p.x, p.z]);
    }
    return out;
  };
  const A = corners(ax, az, aRot, aH.hw + pad / 2, aH.hd + pad / 2);
  const B = corners(bx, bz, bRot, bH.hw + pad / 2, bH.hd + pad / 2);
  const axes = [
    [Math.cos(aRot), -Math.sin(aRot)],
    [Math.sin(aRot), Math.cos(aRot)],
    [Math.cos(bRot), -Math.sin(bRot)],
    [Math.sin(bRot), Math.cos(bRot)]
  ];
  for (const [ux, uz] of axes) {
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const [px, pz] of A) {
      const pr = px * ux + pz * uz;
      if (pr < minA) minA = pr;
      if (pr > maxA) maxA = pr;
    }
    for (const [px, pz] of B) {
      const pr = px * ux + pz * uz;
      if (pr < minB) minB = pr;
      if (pr > maxB) maxB = pr;
    }
    if (maxA < minB || maxB < minA) return false;
  }
  return true;
}

function pickVariant() {
  const r = rand();
  if (r < 0.22) return 0;
  if (r < 0.45) return 1;
  if (r < 0.7) return 2;
  if (r < 0.88) return 3;
  return 4;
}

export function planChaletPlacements(track, terrain, {
  village = 42,
  hamlets = 36,
  rng = rand
} = {}) {
  seed = 4242;
  const { pts, cum, length } = track;
  const list = [];
  const finish = pts[pts.length - 1];

  const nearestRoad = (x, z) => {
    let best = pts[0], bestDist = Infinity;
    // subsample for speed; densify near the end
    const step = Math.max(1, Math.floor(pts.length / 400));
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i];
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestDist) { bestDist = d; best = p; }
    }
    // also always consider the finish
    const df = (finish.x - x) ** 2 + (finish.z - z) ** 2;
    if (df < bestDist) best = finish;
    return best;
  };

  const facingRoad = (x, z) => {
    const road = nearestRoad(x, z);
    return Math.atan2(road.x - x, road.z - z);
  };

  const okAt = (x, z, rot, variant, minSep, { hero = true } = {}) => {
    if (hero && (x - finish.x) ** 2 + (z - finish.z) ** 2 < HERO_EXCLUSION_M * HERO_EXCLUSION_M) return false;
    if (footprintMinDist(x, z, rot, variant.W, variant.D, terrain.distTo) < VEG_CLEARANCE) return false;
    if (terrain.slopeAt(x, z) > 0.52) return false;
    if (terrain.waterAt && terrain.waterAt(x, z)) return false;
    const zone = terrain.classify ? terrain.classify(x, z) : '';
    if (zone === 'rock' || zone === 'snow') return false;
    const sep2 = minSep * minSep;
    for (const other of list) {
      if ((other.x - x) ** 2 + (other.z - z) ** 2 < sep2) return false;
      if (footprintsOverlap(x, z, rot, variant.W, variant.D, other.x, other.z, other.rot, other.W, other.D)) return false;
    }
    return true;
  };

  const add = (x, z, rot, variantIdx) => {
    const variant = VARIANTS[variantIdx];
    let y = Infinity;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = footprintWorld(x, z, rot, a * variant.W / 2, b * variant.D / 2);
      y = Math.min(y, terrain.heightAt(p.x, p.z));
    }
    list.push({
      x, z, y: y - 0.1, rot,
      variant: variantIdx,
      W: variant.W, D: variant.D,
      woodShade: rng(),
      roofShade: rng()
    });
    return true;
  };

  const tryPlace = (x, z, minSep, rotJitter = 0.25) => {
    const variantIdx = pickVariant();
    const rot = facingRoad(x, z) + (rng() - 0.5) * rotJitter;
    if (!okAt(x, z, rot, VARIANTS[variantIdx], minSep)) return false;
    return add(x, z, rot, variantIdx);
  };

  // --- Village: a few tight clusters around the finish (Villard-Reculas) ---
  const clusterSpecs = [
    { r: 70, spread: 28, n: 7, ang: 0.4 },
    { r: 95, spread: 32, n: 8, ang: 1.6 },
    { r: 115, spread: 30, n: 7, ang: 2.6 },
    { r: 145, spread: 36, n: 8, ang: 3.7 },
    { r: 175, spread: 40, n: 6, ang: 5.0 },
    { r: 80, spread: 24, n: 6, ang: 5.6 }
  ];
  for (const spec of clusterSpecs) {
    if (list.length >= village) break;
    // Nudge the cluster off the road: try a few angles around the hint
    let cx, cz, found = false;
    for (let k = 0; k < 14 && !found; k++) {
      const ang = spec.ang + (k * 0.37) + (rng() - 0.5) * 0.2;
      cx = finish.x + Math.cos(ang) * spec.r;
      cz = finish.z + Math.sin(ang) * spec.r;
      if (terrain.distTo(cx, cz) >= VEG_CLEARANCE + 8) found = true;
    }
    if (!found) continue;
    let placed = 0;
    for (let attempts = 0; attempts < 80 && placed < spec.n && list.length < village; attempts++) {
      const a = rng() * Math.PI * 2;
      const rad = 4 + rng() * spec.spread;
      if (tryPlace(cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, VILLAGE_MIN_SEP, 0.18)) placed++;
    }
  }

  // Fill remaining village slots with a slightly looser ring
  for (let attempts = 0; attempts < 2500 && list.length < village; attempts++) {
    const angle = rng() * Math.PI * 2;
    const r = 50 + rng() * 200;
    tryPlace(finish.x + Math.cos(angle) * r, finish.z + Math.sin(angle) * r, VILLAGE_MIN_SEP, 0.3);
  }

  const villageCount = list.length;

  // Hamlets along the climb, well before the finish
  for (let dist = 800; dist < length - 500 && list.length - villageCount < hamlets; dist += 900 + rng() * 1100) {
    let idx = 0;
    for (let j = 0; j < cum.length; j++) {
      if (cum[j] >= dist) { idx = j; break; }
    }
    const pt = pts[idx];
    const nextPt = pts[Math.min(idx + 5, pts.length - 1)];
    const tx = nextPt.x - pt.x, tz = nextPt.z - pt.z;
    const tlen = Math.hypot(tx, tz) || 1;
    const hamletSize = 2 + Math.floor(rng() * 4);
    let placed = 0;
    for (let i = 0; i < hamletSize * 5 && placed < hamletSize && list.length - villageCount < hamlets; i++) {
      const side = rng() < 0.5 ? 1 : -1;
      const offset = 22 + rng() * 36;
      const along = (rng() - 0.5) * 18;
      const x = pt.x - (tz / tlen) * side * offset + (tx / tlen) * along;
      const z = pt.z + (tx / tlen) * side * offset + (tz / tlen) * along;
      if (tryPlace(x, z, HAMLET_MIN_SEP, 0.25)) placed++;
    }
  }

  return { list, village: villageCount, hamlets: list.length - villageCount };
}

export function addChalets(scene, track, terrain, opts = {}) {
  seed = 4242;
  const { list, village, hamlets } = planChaletPlacements(track, terrain, opts);

  console.log(`Placed ${village} chalets in the finish village`);
  console.log(`Placed ${hamlets} chalets in hamlets, total: ${list.length}`);

  const materials = {
    stone: new THREE.MeshStandardMaterial({
      map: stoneTex(),
      roughness: 0.9,
      color: 0xf5f0e8
    }),
    wood: new THREE.MeshStandardMaterial({
      map: woodTex(),
      roughness: 0.85
    }),
    roof: new THREE.MeshStandardMaterial({
      map: roofTex(),
      roughness: 0.95,
      color: 0x2a2a2c
    }),
    windows: new THREE.MeshStandardMaterial({
      color: 0x1a2530,
      roughness: 0.3,
      metalness: 0.1
    })
  };

  const woodTints = [
    new THREE.Color(0xd4a76a),
    new THREE.Color(0xb8956a),
    new THREE.Color(0x9d7a4a),
    new THREE.Color(0x8a6a3a)
  ];
  const roofTints = [
    new THREE.Color(0x3a3a3c),
    new THREE.Color(0x2a2a2c),
    new THREE.Color(0x1a1a1c)
  ];

  const variantGeometries = VARIANTS.map((v) => createChaletGeometry(v));
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);

  for (let vi = 0; vi < VARIANTS.length; vi++) {
    const instances = list.filter((c) => c.variant === vi);
    if (!instances.length) continue;
    const geoms = variantGeometries[vi];
    for (const partName in geoms) {
      if (!geoms[partName]) continue;
      const mesh = new THREE.InstancedMesh(geoms[partName], materials[partName], instances.length);
      instances.forEach((chalet, i) => {
        quat.setFromAxisAngle(up, chalet.rot);
        pos.set(chalet.x, chalet.y, chalet.z);
        matrix.compose(pos, quat, scale);
        mesh.setMatrixAt(i, matrix);
        if (partName === 'wood') {
          mesh.setColorAt(i, woodTints[Math.floor(chalet.woodShade * woodTints.length)]);
        } else if (partName === 'roof') {
          mesh.setColorAt(i, roofTints[Math.floor(chalet.roofShade * roofTints.length)]);
        }
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      scene.add(mesh);
    }
  }

  if (terrain.houses) terrain.houses.push(...list);
  if (typeof window !== 'undefined') window._villageChalets = list;
  return { village, hamlets, list };
}
