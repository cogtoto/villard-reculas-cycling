// Décor Normandie ULTRA-RÉALISTE — Three.js avec PBR, textures procédurales, atmosphère
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
  meadow: 'rgba(110,165,90,.8)',
  pasture: 'rgba(85,140,75,.8)',
  hedgerow: 'rgba(55,95,50,.85)',
  orchard: 'rgba(130,155,90,.8)',
  colza: 'rgba(220,210,80,.75)',
  village: 'rgba(180,160,120,.85)'
};

// Texture procédurale herbe réaliste avec variations
function createGrassTexture(baseColor, size = 512) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const img = g.createImageData(size, size);
  const D = img.data;
  
  const [br, bg, bb] = baseColor;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const n1 = fbm(i * 0.05, j * 0.05, 4) * 0.6;
      const n2 = fbm(i * 0.2, j * 0.2, 3) * 0.3;
      const n3 = fbm(i * 0.8, j * 0.8, 2) * 0.1;
      const n = n1 + n2 + n3;
      
      // Grass blade variation
      const grassNoise = hash(Math.floor(i / 8), Math.floor(j / 8));
      const brightness = 0.85 + n * 0.25 + grassNoise * 0.15;
      const k = (j * size + i) * 4;
      D[k] = Math.min(255, br * brightness);
      D[k + 1] = Math.min(255, bg * brightness);
      D[k + 2] = Math.min(255, bb * brightness);
      D[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function buildNormandyTerrain(scene, track, dem) {
  const pts = track.pts;
  const box = new THREE.Box3(); pts.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, 0, p.z)));
  const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());

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

  const parcelSize = 180;
  const hedgeAt = (x, z) => {
    const px = ((x % parcelSize) + parcelSize) % parcelSize;
    const pz = ((z % parcelSize) + parcelSize) % parcelSize;
    return (px < 6 || px > parcelSize - 6 || pz < 6 || pz > parcelSize - 6);
  };
  const orchardMask = (x, z) => {
    const cellX = Math.floor(x / parcelSize), cellZ = Math.floor(z / parcelSize);
    return hash(cellX, cellZ) < 0.12;
  };

  const start = pts[0];
  const classify = (x, z) => {
    if (Math.hypot(x - start.x, z - start.z) < 180 + vnoise(x * 0.01, z * 0.01) * 60) return 'village';
    if (distTo(x, z) < 8) return 'roadside';
    if (hedgeAt(x, z) && distTo(x, z) > 12) return 'hedgerow';
    if (orchardMask(x, z)) return 'orchard';
    const pn = hash(Math.floor(x / parcelSize), Math.floor(z / parcelSize));
    if (pn < 0.05) return 'colza';
    if (pn < 0.35) return 'pasture';
    return 'meadow';
  };

  // Carte de couleurs haute qualité avec textures d'herbe
  const FX = 1024, FZ = Math.round((FX * H) / W), PX = W / FX;
  const x0 = c.x - W / 2, z0 = c.z - H / 2;
  const cv = document.createElement('canvas'); cv.width = FX; cv.height = FZ;
  const g2 = cv.getContext('2d'), img = g2.createImageData(FX, FZ), D = img.data;
  
  const C = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const COL = {
    meadow: [30, 185, 25],      // ULTRA saturated green
    pasture: [25, 165, 20],     // ULTRA saturated dark green
    hedgerow: [20, 100, 18],    // Deep green hedge
    orchard: [35, 175, 30],     // ULTRA green orchard
    colza: [220, 210, 80],      // Yellow colza (rare)
    village: [180, 160, 120],   // Beige village
    roadside: [30, 190, 25]     // ULTRA bright green verge
  };
  
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  
  for (let j = 0; j < FZ; j++) {
    for (let i = 0; i < FX; i++) {
      const x = x0 + (i + 0.5) * PX, z = z0 + (j + 0.5) * PX;
      const k = classify(x, z);
      const r = hash(i, j);
      
      // Multi-octave noise for grass texture
      const n1 = fbm(x * 0.002, z * 0.002, 4);
      const n2 = fbm(x * 0.01, z * 0.01, 3);
      const grassDetail = n1 * 0.7 + n2 * 0.3;
      
      let col = COL[k] || COL.meadow;
      
      // Add variation based on zone type
      if (k === 'meadow' || k === 'pasture' || k === 'roadside') {
        const var1 = mix(COL.meadow, COL.pasture, r * 0.3 + grassDetail * 0.2);
        const var2 = [col[0], col[1], col[2]];
        col = mix(var2, var1, grassDetail * 0.4);
      } else if (k === 'hedgerow') {
        col = mix(COL.hedgerow, [75, 115, 70], r * 0.5);
      } else if (k === 'colza') {
        col = mix(COL.colza, [200, 195, 70], r * 0.4 + grassDetail * 0.3);
      } else if (k === 'orchard') {
        col = mix(COL.orchard, COL.meadow, r * 0.3);
      }
      
      // Lighting variation (subtle AO-like effect)
      const v = 0.90 + r * 0.15 + grassDetail * 0.08;
      const o = (j * FX + i) * 4;
      D[o] = Math.min(255, col[0] * v);
      D[o + 1] = Math.min(255, col[1] * v);
      D[o + 2] = Math.min(255, col[2] * v);
      D[o + 3] = 255;
    }
  }
  
  g2.putImageData(img, 0, 0);
  
  // Vivid green for sunny Normandy grass
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x5ec04a, // Bright vivid green
    roughness: 0.9,
    metalness: 0
  }));
  land.position.set(c.x, 0, c.z);
  land.receiveShadow = true;
  scene.add(land);

  const isLand = (x, z) => slopeAt(x, z) < 0.35 && classify(x, z) !== 'hedgerow';
  return { land, isLand, classify, distTo, heightAt, slopeAt, orchardMask, hedgeAt, houses: [], center: c, span: Math.max(size.x, size.z) };
}

// Zwift-style Normandy: beautiful deep blue sky, very sunny with shadows
export function normandyAtmosphere(scene, renderer, sun, sunDir) {
  // Deep blue sky with light horizon (Zwift reference)
  const horizonBlue = new THREE.Color(0xc0ddf5);
  const deepBlue = new THREE.Color(0x1a66cc);
  
  scene.background = null; // Let sky dome show (not solid color)
  scene.fog = new THREE.Fog(horizonBlue, 1200, 2800); // Light fog matched to sky
  scene.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.sunPosition) o.visible = false; });
  
  // Warm low sun creating beautiful shadows (Zwift-style)
  sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 30), THREE.MathUtils.degToRad(145));
  sun.color.set(0xfff6e8); // Warm sunny light
  sun.intensity = 2.4; // Bright with strong shadows
  renderer.toneMappingExposure = 1.1; // Vivid colors
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  
  // Add visible sun sphere
  const sunSphereGeo = new THREE.SphereGeometry(90, 32, 32);
  const sunSphereMat = new THREE.MeshBasicMaterial({
    color: 0xfffef0,
    fog: false
  });
  const sunSphere = new THREE.Mesh(sunSphereGeo, sunSphereMat);
  const sunDist = 3000;
  sunSphere.position.set(
    sunDir.x * sunDist,
    sunDir.y * sunDist,
    sunDir.z * sunDist
  );
  scene.add(sunSphere);
  
  // Deep blue sky dome (Zwift-style) - render first, no depth test
  const dome = new THREE.Mesh(new THREE.SphereGeometry(450000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false, // Always render behind everything
    uniforms: {
      uHorizon: { value: horizonBlue },
      uMid: { value: new THREE.Color(0x5599dd) },
      uTop: { value: deepBlue },
      uSun: { value: sunDir }
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uHorizon, uMid, uTop, uSun;
      varying vec3 vDir;
      
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        
        // Deep blue gradient (Zwift-style)
        vec3 c;
        if (h < 0.25) {
          c = mix(uHorizon, uMid, h / 0.25);
        } else {
          c = mix(uMid, uTop, (h - 0.25) / 0.75);
        }
        
        // Halo solaire
        float sunDot = max(dot(normalize(vDir), normalize(uSun)), 0.0);
        float sunGlow = pow(sunDot, 16.0) * 0.25 + pow(sunDot, 4.0) * 0.12;
        c += vec3(1.0, 0.98, 0.9) * sunGlow;
        
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  }));
  dome.frustumCulled = false;
  dome.renderOrder = -999; // Render first (before terrain)
  scene.add(dome);
  
  // Balanced ambient light for good visibility
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  
  return { dome, fog: scene.fog };
}

// Arbres réalistes avec plusieurs sphères pour forme naturelle
function createRealisticOak() {
  const trunk = new THREE.CylinderGeometry(0.22, 0.32, 4.8, 8);
  trunk.translate(0, 2.4, 0);
  
  // Crown: 5 overlapping spheres for very natural oak shape
  const spheres = [
    { r: 2.6, x: 0, y: 5.8, z: 0 },
    { r: 2.0, x: -0.9, y: 5.2, z: 0.7 },
    { r: 1.8, x: 0.8, y: 5.4, z: -0.6 },
    { r: 1.6, x: -0.4, y: 6.2, z: -0.5 },
    { r: 1.5, x: 0.6, y: 5.0, z: 0.8 }
  ];
  
  const geos = [trunk];
  spheres.forEach(s => {
    const sphere = new THREE.IcosahedronGeometry(s.r, 2);
    sphere.translate(s.x, s.y, s.z);
    geos.push(sphere);
  });
  
  const positions = geos.map(g => g.attributes.position.array);
  const totalLength = positions.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  positions.forEach(arr => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(merged, 3));
  geo.computeVertexNormals();
  return geo;
}

function createRealisticBeech() {
  const trunk = new THREE.CylinderGeometry(0.20, 0.28, 5.2, 8);
  trunk.translate(0, 2.6, 0);
  
  // Beech: more upright, slightly elongated crown
  const spheres = [
    { r: 2.4, x: 0, y: 6.0, z: 0 },
    { r: 1.9, x: -0.7, y: 5.5, z: 0.5 },
    { r: 1.7, x: 0.6, y: 5.8, z: -0.4 },
    { r: 1.5, x: 0, y: 6.6, z: 0 }
  ];
  
  const geos = [trunk];
  spheres.forEach(s => {
    const sphere = new THREE.IcosahedronGeometry(s.r, 2);
    sphere.translate(s.x, s.y, s.z);
    geos.push(sphere);
  });
  
  const positions = geos.map(g => g.attributes.position.array);
  const totalLength = positions.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  positions.forEach(arr => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(merged, 3));
  geo.computeVertexNormals();
  return geo;
}

function createAppleTree() {
  const trunk = new THREE.CylinderGeometry(0.18, 0.26, 3.2, 6);
  trunk.translate(0, 1.6, 0);
  
  // Apple tree: lower, rounder crown
  const spheres = [
    { r: 2.3, x: 0, y: 3.9, z: 0 },
    { r: 1.7, x: -0.7, y: 3.5, z: 0.6 },
    { r: 1.5, x: 0.6, y: 3.6, z: -0.5 }
  ];
  
  const geos = [trunk];
  spheres.forEach(s => {
    const sphere = new THREE.IcosahedronGeometry(s.r, 2);
    sphere.translate(s.x, s.y, s.z);
    geos.push(sphere);
  });
  
  const positions = geos.map(g => g.attributes.position.array);
  const totalLength = positions.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  positions.forEach(arr => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(merged, 3));
  geo.computeVertexNormals();
  return geo;
}

// Haie bocagère dense et réaliste
function createHedge() {
  // Multiple small spheres clustered for dense hedge appearance
  const spheres = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.IcosahedronGeometry(0.8 + rand() * 0.4, 1);
    s.translate((rand() - 0.5) * 0.6, 0.8 + rand() * 0.5, (rand() - 0.5) * 0.6);
    spheres.push(s);
  }
  
  const positions = spheres.map(g => g.attributes.position.array);
  const totalLength = positions.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  positions.forEach(arr => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(merged, 3));
  geo.computeVertexNormals();
  return geo;
}

export function addNormandyVegetation(scene, track, terrain, max = 9000) {
  const oaks = [], beeches = [], apples = [], roadHedges = [], fieldHedges = [];
  const { pts, cum, length } = track;
  
  const along = (d) => {
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], s = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / s;
    return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t, tx: (B.x - A.x) / s, tz: (B.z - A.z) / s };
  };
  
  // ROADSIDE HEDGES - très visibles
  for (let d = 0; d < length; d += 4 + rand() * 3) {
    const p = along(d);
    for (const side of [-1, 1]) {
      const off = side * (5.5 + rand() * 1.5);
      const x = p.x - p.tz * off, z = p.z + p.tx * off;
      if (terrain.distTo(x, z) < 3) continue;
      if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 60)) continue;
      const y = terrain.heightAt(x, z);
      roadHedges.push({ x, y: y - 0.15, z, s: 0.7 + rand() * 0.3, r: rand() * 6.28 });
    }
  }
  
  // FIELD TREES and HEDGEROWS
  for (let tries = 0; tries < 130000 && oaks.length + beeches.length + apples.length + fieldHedges.length < max - roadHedges.length; tries++) {
    const p = pts[Math.floor(rand() * pts.length)];
    const a = rand() * Math.PI * 2, r = 9 + Math.pow(rand(), 1.6) * 1000;
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    const zc = terrain.classify(x, z);
    
    if (zc === 'hedgerow') {
      if (terrain.distTo(x, z) < 8) continue;
      if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 65)) continue;
      const y = terrain.heightAt(x, z);
      const item = { x, y: y - 0.18, z, s: 0.7 + rand() * 0.4, r: rand() * 6.28 };
      const treeChance = rand();
      if (treeChance < 0.15) oaks.push(item);
      else if (treeChance < 0.25) beeches.push(item);
      else fieldHedges.push(item);
    } else if (zc === 'orchard') {
      if (terrain.distTo(x, z) < 8) continue;
      if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 65)) continue;
      const y = terrain.heightAt(x, z);
      apples.push({ x, y: y - 0.18, z, s: 0.75 + rand() * 0.4, r: rand() * 6.28 });
    } else if ((zc === 'meadow' || zc === 'pasture') && rand() < 0.055) {
      if (terrain.distTo(x, z) < 8) continue;
      if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 75)) continue;
      const y = terrain.heightAt(x, z);
      const item = { x, y: y - 0.18, z, s: 0.85 + rand() * 0.6, r: rand() * 6.28 };
      if (rand() < 0.6) oaks.push(item);
      else beeches.push(item);
    }
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const instCol = (geo, mat, list) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const col = new THREE.Color();
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, it.r);
      sc.setScalar(it.s);
      v.set(it.x, it.y, it.z);
      im.setMatrixAt(i, m.compose(v, q, sc));
      
      // Vivid green variation (Zwift-style)
      const hue = 0.28 + (rand() - 0.5) * 0.05;
      const sat = 0.45 + rand() * 0.15;
      const light = 0.38 + rand() * 0.12;
      col.setHSL(hue, sat, light);
      im.setColorAt(i, col);
    });
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  };

  const inst = (geo, mat, list) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, it.r);
      sc.setScalar(it.s);
      v.set(it.x, it.y, it.z);
      im.setMatrixAt(i, m.compose(v, q, sc));
    });
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  };

  // Materials PBR
  const oakMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, envMapIntensity: 0.3 });
  const beechMat = new THREE.MeshStandardMaterial({ roughness: 0.80, metalness: 0, envMapIntensity: 0.3 });
  const appleMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, envMapIntensity: 0.25 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x5a8048, roughness: 0.90, metalness: 0 });
  
  instCol(createRealisticOak(), oakMat, oaks);
  instCol(createRealisticBeech(), beechMat, beeches);
  instCol(createAppleTree(), appleMat, apples);
  inst(createHedge(), hedgeMat, fieldHedges);
  inst(createHedge(), hedgeMat, roadHedges);

  return oaks.length + beeches.length + apples.length + fieldHedges.length + roadHedges.length;
}

// Cows moved to normandy-cows.js for better organization
export { addNormandyCows } from './normandy-cows.js';

// Maisons à colombages ULTRA-DÉTAILLÉES
function canvasTex(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function addNormandyHouses(scene, track, terrain, { village = 20, hamlets = 35 } = {}) {
  const { pts, cum, length } = track, list = [];
  const along = (d) => {
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], s = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / s;
    return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t, tx: (B.x - A.x) / s, tz: (B.z - A.z) / s };
  };

  const ok = (x, z) => terrain.distTo(x, z) > 10 && terrain.slopeAt(x, z) < 0.4 && terrain.classify(x, z) !== 'hedgerow'
    && !list.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 160);

  const push = (x, z) => {
    let y = terrain.heightAt(x, z);
    const w = 7.5 + rand() * 2.5;
    const d = 5 + rand() * 1.3;
    const h = 3.3 + rand() * 0.7;
    list.push({ x, z, y: y - 0.15, rot: rand() * 6.28, w, d, h, v: Math.floor(rand() * 2) });
  };

  const s0 = pts[0];
  for (let t = 0; t < 1500 && list.length < village; t++) {
    const a = rand() * 6.28, r = 18 + rand() * 170;
    const x = s0.x + Math.cos(a) * r, z = s0.z + Math.sin(a) * r;
    if (ok(x, z)) push(x, z);
  }

  const nv = list.length;
  for (let d = 800; d < length - 400 && list.length - nv < hamlets; d += 1500 + rand() * 2200) {
    const n = 2 + Math.floor(rand() * 4);
    for (let i = 0; i < n * 3 && list.length - nv < hamlets; i++) {
      const p = along(d + rand() * 150), side = rand() < 0.5 ? 1 : -1, off = 14 + rand() * 32;
      const x = p.x - p.tz * side * off, z = p.z + p.tx * side * off;
      if (ok(x, z)) push(x, z);
    }
  }

  // Texture colombage haute définition avec fenêtres et portes
  const timberTex = canvasTex(512, (g, s) => {
    g.fillStyle = '#faf7f0';
    g.fillRect(0, 0, s, s);
    
    // Timber framing
    g.strokeStyle = '#3a2515';
    g.lineWidth = 11;
    g.lineCap = 'round';
    
    for (let x = 0; x < s; x += s / 5) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, s);
      g.stroke();
    }
    
    g.beginPath();
    g.moveTo(s * 0.2, 0);
    g.lineTo(s * 0.4, s * 0.5);
    g.lineTo(s * 0.2, s);
    g.stroke();
    g.beginPath();
    g.moveTo(s * 0.4, 0);
    g.lineTo(s * 0.2, s * 0.5);
    g.lineTo(s * 0.4, s);
    g.stroke();
    g.beginPath();
    g.moveTo(s * 0.6, 0);
    g.lineTo(s * 0.8, s * 0.5);
    g.lineTo(s * 0.6, s);
    g.stroke();
    g.beginPath();
    g.moveTo(s * 0.8, 0);
    g.lineTo(s * 0.6, s * 0.5);
    g.lineTo(s * 0.8, s);
    g.stroke();
    
    for (let y = s / 3; y < s; y += s / 3) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.stroke();
    }
    
    // Fenêtres
    g.fillStyle = '#2a3844';
    g.strokeStyle = '#4a3828';
    g.lineWidth = 4;
    const windows = [
      [s * 0.12, s * 0.35, s * 0.15, s * 0.22],
      [s * 0.45, s * 0.35, s * 0.15, s * 0.22],
      [s * 0.73, s * 0.35, s * 0.15, s * 0.22]
    ];
    windows.forEach(([x, y, w, h]) => {
      g.fillRect(x, y, w, h);
      g.strokeRect(x, y, w, h);
      g.beginPath();
      g.moveTo(x + w / 2, y);
      g.lineTo(x + w / 2, y + h);
      g.moveTo(x, y + h / 2);
      g.lineTo(x + w, y + h / 2);
      g.stroke();
    });
    
    // Porte
    g.fillStyle = '#4a3020';
    g.fillRect(s * 0.42, s * 0.68, s * 0.16, s * 0.28);
    g.strokeStyle = '#3a2515';
    g.lineWidth = 3;
    g.strokeRect(s * 0.42, s * 0.68, s * 0.16, s * 0.28);
  });

  const roofTex = canvasTex(512, (g, s) => {
    g.fillStyle = '#35353d';
    g.fillRect(0, 0, s, s);
    const rh = 16;
    for (let r = 0; r < s / rh; r++) {
      for (let x = -((r % 2) * 10); x < s; x += 22) {
        const v = 42 + rand() * 38;
        g.fillStyle = `rgb(${v},${v},${v + 6})`;
        g.fillRect(x + 1, r * rh, 20, rh - 2);
        g.fillStyle = `rgba(0,0,0,0.25)`;
        g.fillRect(x + 1, r * rh + rh - 4, 20, 3);
      }
    }
  });

  const body = new THREE.BoxGeometry(1, 1, 1);
  body.translate(0, 0.5, 0);
  const roof = makeRoofGeometry();
  
  const wallMat = new THREE.MeshStandardMaterial({
    map: timberTex,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.2
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.15
  });
  
  const bodyIM = new THREE.InstancedMesh(body, wallMat, list.length);
  const roofIM = new THREE.InstancedMesh(roof, roofMat, list.length);
  
  const mx = new THREE.Matrix4(), quat = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((h, i) => {
    quat.setFromAxisAngle(up, h.rot);
    bodyIM.setMatrixAt(i, mx.compose(new THREE.Vector3(h.x, h.y, h.z), quat, new THREE.Vector3(h.w, h.h, h.d)));
    // Roof overhang + steep pitch
    roofIM.setMatrixAt(i, mx.compose(new THREE.Vector3(h.x, h.y + h.h + 0.05, h.z), quat, new THREE.Vector3(h.w * 1.15, h.d * 0.64, h.d * 1.22)));
  });

  for (const im of [bodyIM, roofIM]) {
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  }
  
  terrain.houses = list;
  return { village: nv, hamlets: list.length - nv };
}
