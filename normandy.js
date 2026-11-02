// Décor Normandie (bocage, maisons à colombages) — Three.js pur.
// Relief : interpolation du DEM réel AWS Terrarium z13 autour du tracé GPX.
import * as THREE from 'three';
import { makeRoofGeometry } from './decor.js';

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
let seed = 42;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export const NORMANDY_ZONE_COLORS = {
  field: 'rgba(179,167,100,.75)',
  meadow: 'rgba(145,171,92,.75)',
  hedgerow: 'rgba(65,95,60,.85)',
  orchard: 'rgba(130,150,85,.8)',
  village: 'rgba(200,170,130,.85)'
};

export function buildNormandyTerrain(scene, track, dem) {
  const pts = track.pts;
  const box = new THREE.Box3(); pts.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, 0, p.z)));
  const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());

  // Index du tracé : point le plus proche (distance + altitude)
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], L = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(1, Math.ceil(L / 15));
    for (let k = 0; k < n; k++) { const t = k / n; dense.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t }); }
  }
  dense.push(pts[pts.length - 1]);
  const CELL = 150, idx = new Map();
  for (const p of dense) { const k = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`; (idx.get(k) || idx.set(k, []).get(k)).push(p); }
  const nearest = (x, z, r = 2) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); let best = Infinity, y = 0;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      const l = idx.get(`${cx + i},${cz + j}`); if (!l) continue;
      for (const p of l) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; y = p.y; } }
    }
    return { d: Math.sqrt(best), y };
  };
  const distTo = (x, z) => nearest(x, z, 1).d;

  // --- MNT réel (public/dem-normandy.*, AWS Terrain Tiles z13) → mètres locaux ---
  const o = track.origin, R = 6371000, kLat = Math.cos((o.lat0 * Math.PI) / 180);
  const toLL = (x, z) => [o.lat0 - (z / R) * 180 / Math.PI, o.lon0 + (x / (R * kLat)) * 180 / Math.PI];
  const M = dem.meta, HD = dem.data;
  const demAt = (x, z) => {
    const [lat, lon] = toLL(x, z);
    const fx = Math.max(0, Math.min(M.nx - 1.001, (lon - M.lonW) / M.step)), fy = Math.max(0, Math.min(M.ny - 1.001, (M.latN - lat) / M.step));
    const i = Math.floor(fx), j = Math.floor(fy), ax = fx - i, ay = fy - j, g = (u, v) => HD[v * M.nx + u];
    return (g(i, j) * (1 - ax) + g(i + 1, j) * ax) * (1 - ay) + (g(i, j + 1) * (1 - ax) + g(i + 1, j + 1) * ax) * ay;
  };

  const W = size.x + 4000, H = size.z + 4000;
  c.set(c.x, 0, c.z);
  const CS = 30, SX = Math.round(W / CS), SZ = Math.round(H / CS);
  const geo = new THREE.PlaneGeometry(W, H, SX, SZ); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + c.x, z = pos.getZ(i) + c.z;
    let y = demAt(x, z);
    const nr = nearest(x, z, 1);
    if (nr.d < 300) {
      const t = THREE.MathUtils.smoothstep(nr.d, 14, 70);
      y = (nr.y - 0.3) * (1 - t) + y * t;
      y = Math.min(y, nr.y - 0.4 + Math.max(0, nr.d - 7) * 0.03);
    }
    pos.setY(i, y);
  }
  geo.computeVertexNormals();

  const heightAt = (x, z) => {
    const x0 = c.x - W / 2, z0 = c.z - H / 2;
    const gx = ((x - x0) / W) * SX, gz = ((z - z0) / H) * SZ;
    const i = Math.max(0, Math.min(SX - 1, Math.floor(gx))), j = Math.max(0, Math.min(SZ - 1, Math.floor(gz)));
    const fx = gx - i, fz = gz - j, Y = (a, b) => pos.getY(b * (SX + 1) + a);
    return (Y(i, j) * (1 - fx) + Y(i + 1, j) * fx) * (1 - fz) + (Y(i, j + 1) * (1 - fx) + Y(i + 1, j + 1) * fx) * fz;
  };
  const slopeAt = (x, z) => { const e = 20; return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e); };

  // Parcelles bocagères (haies sur les limites)
  const parcelSize = 180;
  const hedgeAt = (x, z) => {
    const px = Math.abs((x % parcelSize) - parcelSize / 2), pz = Math.abs((z % parcelSize) - parcelSize / 2);
    return Math.max(px, pz) > parcelSize / 2 - 6;
  };
  const orchardMask = (x, z) => {
    const cellX = Math.floor(x / parcelSize), cellZ = Math.floor(z / parcelSize);
    return hash(cellX, cellZ) < 0.15;
  };

  const start = pts[0];
  const classify = (x, z) => {
    if (Math.hypot(x - start.x, z - start.z) < 180 + vnoise(x * 0.01, z * 0.01) * 60) return 'village';
    if (distTo(x, z) < 8) return 'meadow';
    if (hedgeAt(x, z) && distTo(x, z) > 12) return 'hedgerow';
    if (orchardMask(x, z)) return 'orchard';
    const pn = hash(Math.floor(x / parcelSize), Math.floor(z / parcelSize));
    return pn < 0.4 ? 'field' : 'meadow';
  };

  // Carte de couleurs
  const FX = 768, FZ = Math.round((FX * H) / W), PX = W / FX;
  const x0 = c.x - W / 2, z0 = c.z - H / 2;
  const cv = document.createElement('canvas'); cv.width = FX; cv.height = FZ;
  const g2 = cv.getContext('2d'), img = g2.createImageData(FX, FZ), D = img.data;
  const C = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const COL = {
    field: C(0xc8b870), // champs de blé/colza
    field2: C(0xb8a65a),
    meadow: C(0x7ba555), // prairies vertes
    meadow2: C(0x8fb862),
    hedgerow: C(0x3d5a38), // haies et arbres
    hedgerow2: C(0x4a6842),
    orchard: C(0x86965a), // vergers pommiers
    village: C(0xc4b892) // zone habitée
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (let j = 0; j < FZ; j++) for (let i = 0; i < FX; i++) {
    const x = x0 + (i + 0.5) * PX, z = z0 + (j + 0.5) * PX, k = classify(x, z), r = hash(i, j), n = fbm(x * 0.004, z * 0.004, 3);
    let col;
    if (k === 'hedgerow') col = mix(COL.hedgerow, COL.hedgerow2, r * 0.6);
    else if (k === 'orchard') col = mix(COL.orchard, COL.meadow, r * 0.4);
    else if (k === 'field') col = mix(COL.field, COL.field2, r * 0.5 + n * 0.3);
    else if (k === 'village') col = mix(COL.village, COL.meadow, r * 0.5);
    else col = mix(COL.meadow, COL.meadow2, r * 0.6 + n * 0.2);
    const v = 0.9 + r * 0.14, o = (j * FX + i) * 4;
    D[o] = Math.min(255, col[0] * v); D[o + 1] = Math.min(255, col[1] * v); D[o + 2] = Math.min(255, col[2] * v); D[o + 3] = 255;
  }
  g2.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 1 }));
  land.position.set(c.x, 0, c.z); land.receiveShadow = true;
  scene.add(land);

  const isLand = (x, z) => slopeAt(x, z) < 0.35 && classify(x, z) !== 'hedgerow';
  return { land, isLand, classify, distTo, heightAt, slopeAt, orchardMask, hedgeAt, houses: [], center: c, span: Math.max(size.x, size.z) };
}

// Ciel normand d'été avec légère brume
export function normandyAtmosphere(scene, renderer, sun, sunDir) {
  const fogCol = new THREE.Color(0xe0e8ed), skyTop = new THREE.Color(0xc8d8e8);
  scene.fog = new THREE.Fog(fogCol, 400, 2500);
  scene.background = fogCol;
  scene.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.sunPosition) o.visible = false; });
  
  // Soleil d'été plus haut (élévation 45°, azimut 180° sud)
  sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 45), THREE.MathUtils.degToRad(180));
  sun.color.set(0xfff8e8); sun.intensity = 2.8;
  renderer.toneMappingExposure = 0.75;
  
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uHor: { value: fogCol }, uTop: { value: skyTop }, uSun: { value: sunDir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uHor, uTop, uSun; varying vec3 vD;
      void main(){ float h = max(vD.y, 0.0); vec3 c = mix(uHor, uTop, pow(h, 0.65));
        float g = pow(max(dot(normalize(vD), normalize(uSun)), 0.0), 18.0); c += vec3(1.0, 0.95, 0.8) * g * 0.25;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  dome.frustumCulled = false; dome.renderOrder = -1;
  scene.add(dome);
  return { dome, fog: scene.fog };
}

// Arbres bocagers : chênes, hêtres, peupliers
function deciduousTree() {
  const trunk = new THREE.CylinderGeometry(0.3, 0.4, 5, 6);
  trunk.translate(0, 2.5, 0);
  const crown = new THREE.IcosahedronGeometry(3.5, 1);
  crown.translate(0, 5.5, 0);
  const geo = new THREE.BufferGeometry();
  const p1 = trunk.attributes.position.array, p2 = crown.attributes.position.array;
  const pos = new Float32Array(p1.length + p2.length);
  pos.set(p1, 0); pos.set(p2, p1.length);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

// Haies bocagères et arbres le long des parcelles
export function addNormandyVegetation(scene, track, terrain, max = 8000) {
  const trees = [], hedges = [];
  const { pts } = track;
  
  for (let tries = 0; tries < 150000 && trees.length + hedges.length < max; tries++) {
    const p = pts[Math.floor(rand() * pts.length)];
    const a = rand() * Math.PI * 2, r = 9 + Math.pow(rand(), 1.6) * 1200;
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    const zc = terrain.classify(x, z);
    
    if (zc === 'hedgerow') {
      if (terrain.distTo(x, z) < 8) continue;
      if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 90)) continue;
      const y = terrain.heightAt(x, z);
      const item = { x, y: y - 0.3, z, s: 0.5 + rand() * 0.4, r: rand() * 6.28 };
      if (rand() < 0.3) trees.push(item); else hedges.push(item);
    } else if ((zc === 'village' || zc === 'meadow' || zc === 'orchard') && rand() < 0.08) {
      if (terrain.distTo(x, z) < 8) continue;
      if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 90)) continue;
      const y = terrain.heightAt(x, z);
      trees.push({ x, y: y - 0.3, z, s: 0.7 + rand() * 0.6, r: rand() * 6.28 });
    }
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const inst = (geo, mat, list) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { q.setFromAxisAngle(up, it.r); sc.setScalar(it.s); v.set(it.x, it.y, it.z); im.setMatrixAt(i, m.compose(v, q, sc)); });
    im.castShadow = true; scene.add(im);
  };

  const treeMat = new THREE.MeshStandardMaterial({ color: 0x5a7a3e, roughness: 0.9 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x4a6842, roughness: 1, flatShading: true });
  
  inst(deciduousTree(), treeMat, trees);
  const bushGeo = new THREE.IcosahedronGeometry(1.2, 0); bushGeo.scale(1.5, 1.8, 1.2);
  inst(bushGeo, hedgeMat, hedges);

  return trees.length + hedges.length;
}

// Vaches normandes dans les prairies
export function addNormandyCows(scene, track, terrain, max = 120) {
  const cows = [];
  const { pts } = track;
  
  for (let tries = 0; tries < 10000 && cows.length < max; tries++) {
    const p = pts[Math.floor(rand() * pts.length)];
    const a = rand() * Math.PI * 2, r = 15 + rand() * 600;
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    const zc = terrain.classify(x, z);
    
    if (zc !== 'meadow' || terrain.distTo(x, z) < 12) continue;
    if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 80)) continue;
    if (cows.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < 25)) continue;
    
    const y = terrain.heightAt(x, z);
    cows.push({ x, y: y - 0.3, z, r: rand() * 6.28, v: rand() });
  }

  // Géométrie simplifiée de vache
  const body = new THREE.BoxGeometry(2, 1.4, 1); body.translate(0, 1, 0);
  const head = new THREE.BoxGeometry(0.8, 0.7, 0.7); head.translate(1.2, 1.2, 0);
  const geo = new THREE.BufferGeometry();
  const p1 = body.attributes.position.array, p2 = head.attributes.position.array;
  const pos = new Float32Array(p1.length + p2.length);
  pos.set(p1, 0); pos.set(p2, p1.length);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const im = new THREE.InstancedMesh(geo, mat, cows.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  
  cows.forEach((c, i) => {
    q.setFromAxisAngle(up, c.r);
    im.setMatrixAt(i, m.compose(new THREE.Vector3(c.x, c.y, c.z), q, new THREE.Vector3(0.4, 0.4, 0.4)));
    // Vaches normandes : blanc avec taches brunes/noires
    const base = c.v < 0.4 ? 0xf2efe6 : c.v < 0.7 ? 0x6b4a3a : 0x2a2420;
    im.setColorAt(i, col.setHex(base));
  });
  im.castShadow = true; im.receiveShadow = true;
  scene.add(im);

  return cows.length;
}

// Maisons à colombages normandes
function canvasTex(size, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function addNormandyHouses(scene, track, terrain, { village = 25, hamlets = 45 } = {}) {
  const { pts, cum, length } = track, list = [];
  const along = (d) => {
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], s = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / s;
    return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t, tx: (B.x - A.x) / s, tz: (B.z - A.z) / s };
  };

  const ok = (x, z) => terrain.distTo(x, z) > 10 && terrain.slopeAt(x, z) < 0.4 && terrain.classify(x, z) !== 'hedgerow'
    && !list.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 200);

  const push = (x, z) => {
    let y = terrain.heightAt(x, z);
    const w = 7 + rand() * 4, d = 6 + rand() * 3, h = 3.5 + rand() * 1.5;
    list.push({ x, z, y: y - 0.15, rot: rand() * 6.28, w, d, h, v: rand() });
  };

  // Village de départ
  const s0 = pts[0];
  for (let t = 0; t < 2000 && list.length < village; t++) {
    const a = rand() * 6.28, r = 18 + rand() * 200;
    const x = s0.x + Math.cos(a) * r, z = s0.z + Math.sin(a) * r;
    if (ok(x, z)) push(x, z);
  }

  // Hameaux le long de la route
  const nv = list.length;
  for (let d = 800; d < length - 400 && list.length - nv < hamlets; d += 1200 + rand() * 1800) {
    const n = 2 + Math.floor(rand() * 5);
    for (let i = 0; i < n * 3 && list.length - nv < hamlets; i++) {
      const p = along(d + rand() * 140), side = rand() < 0.5 ? 1 : -1, off = 14 + rand() * 35;
      const x = p.x - p.tz * side * off, z = p.z + p.tx * side * off;
      if (ok(x, z)) push(x, z);
    }
  }

  // Murs à colombages (texture procédurale)
  const timberTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, s, s); // crépi blanc cassé
    g.strokeStyle = '#3a2818'; g.lineWidth = 8;
    // Poteaux verticaux
    for (let x = 0; x < s; x += s / 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke(); }
    // Croix de Saint-André
    g.beginPath(); g.moveTo(s * 0.2, 0); g.lineTo(s * 0.4, s); g.stroke();
    g.beginPath(); g.moveTo(s * 0.4, 0); g.lineTo(s * 0.2, s); g.stroke();
    g.beginPath(); g.moveTo(s * 0.6, 0); g.lineTo(s * 0.8, s); g.stroke();
    g.beginPath(); g.moveTo(s * 0.8, 0); g.lineTo(s * 0.6, s); g.stroke();
    // Traverses horizontales
    for (let y = s / 3; y < s; y += s / 3) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
    }
  });

  const roofTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#3a3840'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 12) {
      for (let x = (y % 24 === 0 ? 0 : -10); x < s; x += 20) {
        const v = 40 + rand() * 30;
        g.fillStyle = `rgb(${v},${v},${v + 5})`;
        g.fillRect(x, y, 18, 10);
      }
    }
  });

  const body = new THREE.BoxGeometry(1, 1, 1); body.translate(0, 0.5, 0);
  const roof = makeRoofGeometry();
  
  const wallMat = new THREE.MeshStandardMaterial({ map: timberTex, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.9 });
  
  const bodyIM = new THREE.InstancedMesh(body, wallMat, list.length);
  const roofIM = new THREE.InstancedMesh(roof, roofMat, list.length);
  
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((h, i) => {
    q.setFromAxisAngle(up, h.rot);
    bodyIM.setMatrixAt(i, m.compose(new THREE.Vector3(h.x, h.y, h.z), q, new THREE.Vector3(h.w, h.h, h.d)));
    roofIM.setMatrixAt(i, m.compose(new THREE.Vector3(h.x, h.y + h.h, h.z), q, new THREE.Vector3(h.w * 1.12, h.d * 0.55, h.d * 1.15)));
  });

  for (const im of [bodyIM, roofIM]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
  terrain.houses = list;
  return { village: nv, hamlets: list.length - nv };
}
