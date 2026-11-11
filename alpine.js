// Décor montagne (Oisans / Villard-Reculas) — Three.js pur.
// Relief : interpolation (IDW) de l'altitude GPX + montagnes procédurales qui montent en s'éloignant de la route.
import * as THREE from 'three';
import { makeRoofGeometry } from './decor.js';
import { PALETTE } from './palette.js';

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
function ridged(x, y) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)) ** 2; f *= 2.1; a *= 0.5; } return s; }
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export const SNOW_LINE = 2150; // altitude moyenne de la limite de neige (m)
export const ZONE_COLORS = { meadow: 'rgba(130,165,90,.75)', forest: 'rgba(45,85,50,.8)', rock: 'rgba(140,135,128,.8)', snow: 'rgba(240,244,250,.85)', village: 'rgba(200,170,130,.85)', water: 'rgba(79,123,132,.95)', shore: 'rgba(138,140,136,.9)' };

export function buildAlpineTerrain(scene, track, dem) {
  const pts = track.pts;
  const box = new THREE.Box3(); pts.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, 0, p.z)));
  const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const minY = Math.min(...pts.map((p) => p.y));

  // Index du tracé : point le plus proche (distance + altitude)
  // points densifiés tous les 15 m (les segments RDP peuvent faire >1 km en ligne droite)
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

  // --- MNT réel (public/dem-villard.*, AWS Terrain Tiles z13) → mètres locaux ---
  const o = track.origin, R = 6371000, kLat = Math.cos((o.lat0 * Math.PI) / 180);
  const toLL = (x, z) => [o.lat0 - (z / R) * 180 / Math.PI, o.lon0 + (x / (R * kLat)) * 180 / Math.PI];
  const toXZ = (lat, lon) => [((lon - o.lon0) * Math.PI / 180) * R * kLat, -((lat - o.lat0) * Math.PI / 180) * R];
  const M = dem.meta, HD = dem.data;
  const demAt = (x, z) => {
    const [lat, lon] = toLL(x, z);
    const fx = Math.max(0, Math.min(M.nx - 1.001, (lon - M.lonW) / M.step)), fy = Math.max(0, Math.min(M.ny - 1.001, (M.latN - lat) / M.step));
    const i = Math.floor(fx), j = Math.floor(fy), ax = fx - i, ay = fy - j, g = (u, v) => HD[v * M.nx + u];
    return (g(i, j) * (1 - ax) + g(i + 1, j) * ax) * (1 - ay) + (g(i, j + 1) * (1 - ax) + g(i + 1, j + 1) * ax) * ay;
  };
  const [xa, za] = toXZ(M.latN, M.lonW), [xb, zb] = toXZ(M.latN - (M.ny - 1) * M.step, M.lonW + (M.nx - 1) * M.step);
  const W = xb - xa, H = zb - za, x0 = xa, z0 = za;

  // --- Lac du Verney (retenue d'Allemond, ~765 m) : remplissage depuis le MNT réel, pas de polygone inventé ---
  const WL = 765.5, wMask = new Uint8Array(M.nx * M.ny);
  {
    const cell = (lat, lon) => [Math.round((lon - M.lonW) / M.step), Math.round((M.latN - lat) / M.step)];
    const [i0, j1] = cell(45.126, 6.033), [i1, j0] = cell(45.152, 6.062), [si, sj] = cell(45.135, 6.0475);
    const stack = [[si, sj]];
    while (stack.length) {
      const [i, j] = stack.pop(); if (i < i0 || i > i1 || j < j0 || j > j1) continue;
      const k = j * M.nx + i; if (wMask[k]) continue;
      const e = HD[k]; if (e < 762 || e > 767.5) continue;
      wMask[k] = 1; stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
    }
  }
  const waterAt = (x, z) => {
    const [lat, lon] = toLL(x, z), i = Math.round((lon - M.lonW) / M.step), j = Math.round((M.latN - lat) / M.step);
    return i >= 0 && j >= 0 && i < M.nx && j < M.ny && wMask[j * M.nx + i] === 1;
  };
  const nearWater = (x, z) => waterAt(x + 30, z) || waterAt(x - 30, z) || waterAt(x, z + 30) || waterAt(x, z - 30);
  c.set(x0 + W / 2, 0, z0 + H / 2);
  const CS = 40, SX = Math.round(W / CS), SZ = Math.round(H / CS); // maille ≈ 40 m (MNT ≈ 20–28 m)
  const geo = new THREE.PlaneGeometry(W, H, SX, SZ); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + c.x, z = pos.getZ(i) + c.z;
    let y = demAt(x, z);
    const nr = nearest(x, z, 1);
    if (nr.d < 300) {
      // près de la chaussée : altitude GPX lissée (écart MNT/GPX médian ≈ 6 m), talus déblai/remblai
      const t = THREE.MathUtils.smoothstep(nr.d, 14, 70);
      y = (nr.y - 0.3) * (1 - t) + y * t;
      y = Math.min(y, nr.y - 0.4 + Math.max(0, nr.d - 7) * 0.8);
      y = Math.max(y, nr.y - 0.4 - Math.max(0, nr.d - 7) * 1.0);
    }
    if (nr.d > 25 && waterAt(x, z)) y = Math.min(y, WL - 4); // fond du lac sous la surface
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const heightAt = (x, z) => {
    const gx = ((x - x0) / W) * SX, gz = ((z - z0) / H) * SZ;
    const i = Math.max(0, Math.min(SX - 1, Math.floor(gx))), j = Math.max(0, Math.min(SZ - 1, Math.floor(gz)));
    const fx = gx - i, fz = gz - j, Y = (a, b) => pos.getY(b * (SX + 1) + a);
    return (Y(i, j) * (1 - fx) + Y(i + 1, j) * fx) * (1 - fz) + (Y(i, j + 1) * (1 - fx) + Y(i + 1, j + 1) * fx) * fz;
  };
  const slopeAt = (x, z) => { const e = 20; return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e); };
  const forestMask = (x, z) => fbm(x * 0.0018 + 40, z * 0.0018 - 13, 4);

  // Zones : prairie / forêt / roche / neige (+ village au départ)
  const start = pts[0];
  const classify = (x, z) => {
    if (waterAt(x, z) && distTo(x, z) > 12) return 'water';
    if (nearWater(x, z) && heightAt(x, z) < WL + 3 && distTo(x, z) > 8) return 'shore';
    const y = heightAt(x, z), s = slopeAt(x, z), n = fbm(x * 0.01, z * 0.01, 3);
    // neige : limite ~2050–2400 m irrégulière (bruit), elle tient moins sur les pentes raides (barres rocheuses)
    const snowLine = SNOW_LINE + (n - 0.5) * 350 + Math.max(0, s - 0.55) * 700;
    if (y > snowLine || y > SNOW_LINE + 650) return 'snow';
    if (s > 0.9 || y > 2250 + n * 200) return 'rock';
    if (Math.hypot(x - start.x, z - start.z) < 260 + n * 80) return 'village';
    if (y < 2000 && forestMask(x, z) > 0.47 - (y < 1000 ? 0.05 : 0) && distTo(x, z) > 12) return 'forest';
    return 'meadow';
  };

  // Carte de couleurs (ligne 0 = nord)
  const FX = 768, FZ = Math.round((FX * H) / W), PX = W / FX;
  const cv = document.createElement('canvas'); cv.width = FX; cv.height = FZ;
  const g2 = cv.getContext('2d'), img = g2.createImageData(FX, FZ), D = img.data;
  const C = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const COL = Object.fromEntries(Object.entries(PALETTE.terrain).map(([k, v]) => [k, C(v)])); // palette.js
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (let j = 0; j < FZ; j++) for (let i = 0; i < FX; i++) {
    const x = x0 + (i + 0.5) * PX, z = z0 + (j + 0.5) * PX, k = classify(x, z), r = hash(i, j), n = fbm(x * 0.004, z * 0.004, 3);
    // Micro-detail noise for grass/rock texture (high frequency)
    const microGrass = fbm(x * 0.15, z * 0.15, 2) * 0.15;
    const microRock = fbm(x * 0.08, z * 0.08, 3) * 0.2 + hash(i * 7, j * 11) * 0.1;
    
    let col;
    if (k === 'water') col = mix(COL.water, COL.water2, r * 0.3);
    else if (k === 'shore') col = mix(COL.shore, COL.rock, r * 0.4 + microRock);
    else if (k === 'snow') col = mix(COL.snow, COL.snowShade, r * 0.5 + n * 0.3); // white-blue, slight shadows
    else if (k === 'rock') col = mix(COL.rock, COL.rock2, n * 0.7 + microRock * 0.3);
    else if (k === 'forest') col = mix(COL.forest, COL.forest2, r * 0.6 + microGrass * 0.4);
    else if (k === 'village') col = mix(COL.village, COL.meadow, r * 0.5 + microGrass * 0.3);
    else { 
      // Meadow: blend with altitude and add grass texture detail
      const y = heightAt(x, z); 
      const altBlend = Math.min(1, n * 0.8 + Math.max(0, (y - 1700) / 600));
      col = mix(COL.meadow, COL.meadow2, altBlend + microGrass * 0.3); 
    }
    const v = 0.88 + r * 0.18, o = (j * FX + i) * 4;
    D[o] = Math.min(255, col[0] * v); D[o + 1] = Math.min(255, col[1] * v); D[o + 2] = Math.min(255, col[2] * v); D[o + 3] = 255;
  }
  g2.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 1 }));
  land.position.set(c.x, 0, c.z); land.receiveShadow = true;
  scene.add(land);

  // Surface de l'eau : cellules MNT du lac (dilatées d'1 cellule, les rives cachent les bords)
  {
    const wp = [], wi = [];
    for (let j = 1; j < M.ny - 1; j++) for (let i = 1; i < M.nx - 1; i++) {
      const k = j * M.nx + i;
      if (!(wMask[k] || wMask[k - 1] || wMask[k + 1] || wMask[k - M.nx] || wMask[k + M.nx])) continue;
      const corner = (di, dj) => toXZ(M.latN - (j + dj) * M.step, M.lonW + (i + di) * M.step);
      const b = wp.length / 3;
      for (const [di, dj] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) { const [x, z] = corner(di, dj); wp.push(x, WL, z); }
      wi.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    if (wp.length) {
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setIndex(wi); wg.computeVertexNormals();
      const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: PALETTE.lakeSurface, roughness: 0.18, metalness: 0.2, transparent: true, opacity: 0.94 }));
      water.receiveShadow = true; scene.add(water);
      console.log('Lac du Verney :', wi.length / 6, 'cellules MNT');
      // parapet béton du barrage : rive sud (aval) du plan d'eau
      let jMax = -1; for (let k = 0; k < wMask.length; k++) if (wMask[k]) jMax = Math.max(jMax, (k / M.nx) | 0);
      let iA = Infinity, iB = -1; for (let i = 0; i < M.nx; i++) if (wMask[jMax * M.nx + i] || wMask[(jMax - 1) * M.nx + i]) { iA = Math.min(iA, i); iB = Math.max(iB, i); }
      if (iB >= 0) {
        const [ax, az] = toXZ(M.latN - (jMax + 0.5) * M.step, M.lonW + (iA - 1) * M.step), [bx, bz] = toXZ(M.latN - (jMax + 0.5) * M.step, M.lonW + (iB + 1) * M.step);
        const len = Math.hypot(bx - ax, bz - az), dam = new THREE.Mesh(new THREE.BoxGeometry(len, 6, 4), new THREE.MeshStandardMaterial({ color: PALETTE.road.dam, roughness: 0.9 }));
        dam.position.set((ax + bx) / 2, WL - 1.5, (az + bz) / 2); dam.rotation.y = -Math.atan2(bz - az, bx - ax); dam.castShadow = dam.receiveShadow = true; scene.add(dam);
        const par = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 0.35), dam.material); par.position.set(dam.position.x, WL + 2, dam.position.z + 1.8); par.rotation.y = dam.rotation.y; scene.add(par);
      }
    }
  }

  const isLand = (x, z) => waterAt(x, z) ? false : slopeAt(x, z) < 0.35 && classify(x, z) !== 'rock' && classify(x, z) !== 'snow';
  return { land, isLand, classify, distTo, heightAt, slopeAt, forestMask, waterAt, WL, houses: [], center: c, span: Math.max(size.x, size.z), minY };
}

// ---------- Brume de vallée (inspirée de three.js webgpu_custom_fog, portée en WebGL) ----------
// Bande de brume à altitude fixe (dense sous fogNear, dissipée à fogFar, bord supérieur bruité)
// + voile de distance exponentiel² : les sommets lointains se fondent dans le même gris-bleu.
export function installHeightFog() {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = `#ifdef USE_FOG
  varying float vFogDepth; varying vec3 vFogWorld;
#endif`;
  C.fog_vertex = `#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  #ifdef USE_INSTANCING
    vFogWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
  #else
    vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  #endif
#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear; uniform float fogFar;
  #endif
  float hfN(vec3 p) { return sin(p.x * 1.7 + sin(p.z * 1.3)) * 0.5 + sin(p.z * 2.3 + p.x * 0.7 + sin(p.x * 0.9)) * 0.5; }
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float fd = length(vFogWorld - cameraPosition);
    float fn = hfN(vFogWorld * 0.0016) * 0.6 + hfN(vFogWorld * 0.0043) * 0.3;
    float ftop = fogFar + fn * 110.0;
    float band = clamp((ftop - vFogWorld.y) / max(ftop - fogNear, 1.0), 0.0, 1.0) * 0.97;
    band *= smoothstep(80.0, 1600.0, fd);               // le cycliste reste net même dans la brume
    float haze = 1.0 - exp(- pow(0.000105 * fd, 2.0));
    float fogFactor = 1.0 - (1.0 - band) * (1.0 - haze);
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;
}

// Ciel : dégradé comme l'exemple (couleur de brume à l'horizon → ciel clair) + halo du soleil
export function alpineAtmosphere(scene, renderer, sun, sunDir, opts = {}) {
  const fogCol = new THREE.Color(0xd0dee7), skyTop = new THREE.Color(0xbcd4ea);
  const base = opts.fogBase ?? 640, top = opts.fogTop ?? 1080;
  scene.fog = new THREE.Fog(fogCol, base, top); // near/far = altitudes basse/haute de la bande de brume
  scene.background = fogCol;
  scene.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.sunPosition) o.visible = false; }); // masque le Sky physique
  // soleil bas et chaud (élévation 18°, azimut 150°)
  sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 18), THREE.MathUtils.degToRad(150));
  sun.color.set(0xffd9b0); sun.intensity = 3.2;
  renderer.toneMappingExposure = 0.62;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uHor: { value: fogCol }, uTop: { value: skyTop }, uSun: { value: sunDir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uHor, uTop, uSun; varying vec3 vD;
      void main(){ float h = max(vD.y, 0.0); vec3 c = mix(uHor, uTop, pow(h, 0.55));
        float g = pow(max(dot(normalize(vD), normalize(uSun)), 0.0), 24.0); c += vec3(1.0, 0.85, 0.65) * g * 0.35;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  dome.frustumCulled = false; dome.renderOrder = -1;
  scene.add(dome);
  return { dome, fog: scene.fog };
}

// Realistic multi-tier spruce tree (alpine conifer with distinct branch tiers)
function conifer() {
  const positions = [], indices = [], colors = [];
  const deep = new THREE.Color(0x1f3820), mid = new THREE.Color(0x2f4f2c), bright = new THREE.Color(0x4a6838);
  
  // Trunk (dark brown cylinder)
  const trunkH = 1.2, trunkR = 0.12;
  const trunkSegs = 6;
  for (let i = 0; i <= trunkSegs; i++) {
    const angle = (i / trunkSegs) * Math.PI * 2;
    const x = Math.cos(angle) * trunkR, z = Math.sin(angle) * trunkR;
    positions.push(x, 0, z, x, trunkH, z);
    const trunkCol = new THREE.Color(0x3a2818);
    colors.push(trunkCol.r, trunkCol.g, trunkCol.b, trunkCol.r * 0.7, trunkCol.g * 0.7, trunkCol.b * 0.7);
    if (i < trunkSegs) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }
  
  // Needle tiers (6 tiers, decreasing size toward top)
  const tiers = 6;
  let baseIdx = positions.length / 3;
  for (let tier = 0; tier < tiers; tier++) {
    const tierY = 0.8 + tier * 1.4;
    const tierR = (2.2 - tier * 0.32) * (0.9 + Math.random() * 0.2);
    const tierH = 0.9 - tier * 0.05;
    const segs = 8;
    const tipIdx = baseIdx;
    const col = new THREE.Color().copy(deep).lerp(mid, tier / tiers).lerp(bright, 0.3 + tier * 0.1);
    positions.push(0, tierY + tierH, 0);
    colors.push(col.r * 1.2, col.g * 1.2, col.b * 1.2);
    baseIdx++;
    for (let i = 0; i <= segs; i++) {
      const angle = (i / segs) * Math.PI * 2;
      const x = Math.cos(angle) * tierR, z = Math.sin(angle) * tierR;
      positions.push(x, tierY, z);
      const baseCol = new THREE.Color().copy(col).multiplyScalar(0.7 + Math.random() * 0.3);
      colors.push(baseCol.r, baseCol.g, baseCol.b);
      if (i < segs) {
        indices.push(tipIdx, baseIdx + i, baseIdx + i + 1);
      }
    }
    baseIdx += segs + 1;
  }
  
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// Forêts : sapins (cônes) + feuillus en bas, instanciés, dans un couloir de 1,5 km autour du tracé
export function addForest(scene, track, terrain, max = 14000) {
  const firs = [], leafy = [];
  const { pts } = track;
  for (let tries = 0; tries < 200000 && firs.length + leafy.length < max; tries++) {
    const p = pts[Math.floor(rand() * pts.length)];
    const a = rand() * Math.PI * 2, r = 9 + Math.pow(rand(), 1.6) * 1500;
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    const zc = terrain.classify(x, z);
    if (zc !== 'forest' && !(zc === 'village' && rand() < 0.04)) continue; // + sapins isolés au village
    if (terrain.distTo(x, z) < 9) continue;
    if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 120)) continue;
    const y = terrain.heightAt(x, z);
    const item = { x, y: y - 0.3, z, s: 0.7 + rand() * rand() * 1.1, r: rand() * 6.28 };
    (y < 1400 && rand() < 0.45 ? leafy : firs).push(item); // forêt mixte (feuillus + sapins)
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const inst = (geo, mat, list, yOff, shadow) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { q.setFromAxisAngle(up, it.r); sc.setScalar(it.s); v.set(it.x, it.y + yOff * it.s, it.z); im.setMatrixAt(i, m.compose(v, q, sc)); });
    im.castShadow = shadow; scene.add(im);
  };
  const trunk = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 });
  const firMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  // sapins : un seul InstancedMesh (+ couleur par instance, échelle variée façon exemple)
  const fim = new THREE.InstancedMesh(conifer(), firMat, firs.length), cc = new THREE.Color();
  firs.forEach((it, i) => {
    q.setFromAxisAngle(up, it.r); const k = it.s; sc.set(k * (0.85 + rand() * 0.3), k * (0.8 + rand() * 0.5), k * (0.85 + rand() * 0.3));
    v.set(it.x, it.y - 0.5, it.z); fim.setMatrixAt(i, m.compose(v, q, sc));
    fim.setColorAt(i, cc.setHSL(0.27 + rand() * 0.05, 0.25 + rand() * 0.2, 0.75 + rand() * 0.35));
  });
  scene.add(fim);
  inst(new THREE.CylinderGeometry(0.2, 0.3, 3, 5), trunk, leafy, 1.5, false);
  inst(new THREE.IcosahedronGeometry(2.4, 0), leafMat, leafy, 4.3, false);
  { const lim = scene.children[scene.children.length - 1], lc = new THREE.Color(); // feuillus (couleurs palette.js)
    leafy.forEach((_, i) => lim.setColorAt(i, lc.setHex(PALETTE.leafy[Math.floor(rand() * PALETTE.leafy.length)]))); if (lim.instanceColor) lim.instanceColor.needsUpdate = true; }
  return firs.length + leafy.length;
}

// Village de départ (Villard-Reculas) : petit groupe de chalets en plus des hameaux le long de la route
export function addVillage(scene, track, terrain, n = 35) {
  const s = track.pts[0], list = [];
  for (let t = 0; t < 2000 && list.length < n; t++) {
    const a = rand() * 6.28, r = 20 + rand() * 230, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (terrain.distTo(x, z) < 10 || terrain.slopeAt(x, z) > 0.5) continue;
    if (list.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 220) || terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 220)) continue;
    list.push({ x, z, y: terrain.heightAt(x, z) - 0.6, rot: rand() * 6.28, w: 8 + rand() * 5, d: 7 + rand() * 4, h: 4 + rand() * 3, v: rand() });
  }
  const body = new THREE.BoxGeometry(1, 1, 1); body.translate(0, 0.5, 0);
  const roof = makeRoofGeometry();
  const bIM = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.9 }), list.length);
  const rIM = new THREE.InstancedMesh(roof, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true, side: THREE.DoubleSide }), list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  list.forEach((h, i) => {
    q.setFromAxisAngle(up, h.rot);
    bIM.setMatrixAt(i, m.compose(new THREE.Vector3(h.x, h.y, h.z), q, new THREE.Vector3(h.w, h.h, h.d)));
    rIM.setMatrixAt(i, m.compose(new THREE.Vector3(h.x, h.y + h.h, h.z), q, new THREE.Vector3(h.w * 1.15, h.d * 0.45, h.d * 1.2)));
    bIM.setColorAt(i, col.setHex(h.v < 0.5 ? 0xe9e1d0 : h.v < 0.8 ? 0x9a6b44 : 0xcfc3a8)); // crépi / bois / pierre
    rIM.setColorAt(i, col.setHex(h.v < 0.6 ? 0x4a4f57 : 0x6b4a36));
  });
  for (const im of [bIM, rIM]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
  terrain.houses.push(...list);
  return list.length;
}
