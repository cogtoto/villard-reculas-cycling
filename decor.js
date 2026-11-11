// Décors procéduraux (Three.js pur) : ciel, mer animée, terrain, végétation, route texturée.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { makeGeo } from './geo.js';

// ---------- utilitaires ----------
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; }
let seed = 1;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Index spatial grossier des points du tracé → distance approx. au tracé
function makeTrackIndex(pts, cell = 100) {
  const map = new Map();
  for (const p of pts) {
    const k = `${Math.floor(p.x / cell)},${Math.floor(p.z / cell)}`;
    (map.get(k) || map.set(k, []).get(k)).push(p);
  }
  return (x, z, r = 2) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell); let best = Infinity;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      const l = map.get(`${cx + i},${cz + j}`); if (!l) continue;
      for (const p of l) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) best = d; }
    }
    return Math.sqrt(best); // Infinity si > r*cell
  };
}

// ---------- ciel + lumière ----------
export function setupSky(scene, renderer, sun) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const sky = new Sky(); sky.scale.setScalar(45000);
  const u = sky.material.uniforms;
  u.turbidity.value = 4; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.85;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(200));
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);
  const fogCol = new THREE.Color(0xbfd6e8);
  scene.fog = new THREE.Fog(fogCol, 300, 4500);
  scene.background = fogCol;
  sun.color.set(0xfff1d6); sun.intensity = 2.6;
  return { sky, sunDir };
}

// Nuages : sprites partagés (1 texture, 1 matériau)
export function addClouds(scene, center, span, yBase = 500) {
  const tex = canvasTex(128, (g, s) => {
    for (let i = 0; i < 14; i++) {
      const x = s * (0.25 + rand() * 0.5), y = s * (0.4 + rand() * 0.25), r = s * (0.12 + rand() * 0.15);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
  });
  const mat = new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true });
  const group = new THREE.Group();
  for (let i = 0; i < 45; i++) {
    const s = new THREE.Sprite(mat);
    const w = 600 + rand() * 1400; s.scale.set(w, w * 0.45, 1);
    s.position.set(center.x + (rand() - 0.5) * span * 2.5, yBase + rand() * 500, center.z + (rand() - 0.5) * span * 2.5);
    group.add(s);
  }
  scene.add(group);
  return group;
}

// ---------- terrain + mer ----------
// Champ 2D (≈15 m/px) : classe (terre/mer/marais) + distances à la côte → relief, carte de couleurs, mer.
function distanceTransform(mask, w, h) { // chamfer 3-4, distance (px) au pixel mask=1 le plus proche
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? 0 : INF;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) { v = Math.min(v, d[i - w] + 3); if (x > 0) v = Math.min(v, d[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < h - 1) { v = Math.min(v, d[i + w] + 3); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4); if (x > 0) v = Math.min(v, d[i + w - 1] + 4); }
    d[i] = v;
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}

export function buildTerrain(scene, track) {
  const pts = track.pts;
  const box = new THREE.Box3(); pts.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, 0, p.z)));
  const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const baseY = Math.min(...pts.map((p) => p.y));
  const SEA = baseY - 0.9; // niveau de la mer
  const distTo = makeTrackIndex(pts);
  const geoInfo = makeGeo(track.origin);
  const R = 6371000, kLat = Math.cos((track.origin.lat0 * Math.PI) / 180);
  const toLatLon = (x, z) => [track.origin.lat0 - (z / R) * 180 / Math.PI, track.origin.lon0 + (x / (R * kLat)) * 180 / Math.PI];
  // côte rocheuse : côte sauvage Le Pouliguen → Le Croisic (+ pointe de Penchâteau)
  const rocky = (x, z) => { const [lat, lon] = toLatLon(x, z); return (lon < -2.428 && lat < 47.2965) || (lon < -2.414 && lon > -2.432 && lat < 47.2625); };

  // Index du tracé : point le plus proche (distance + altitude)
  const CELL = 100, idx = new Map();
  for (const p of pts) { const k = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`; (idx.get(k) || idx.set(k, []).get(k)).push(p); }
  const nearest = (x, z) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); let best = Infinity, y = 0;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      const l = idx.get(`${cx + i},${cz + j}`); if (!l) continue;
      for (const p of l) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; y = p.y; } }
    }
    return { d: Math.sqrt(best), y };
  };

  // --- Champ ---
  const W = size.x + 6000, H = size.z + 6000, x0 = c.x - W / 2, z0 = c.z - H / 2;
  const FX = 1536, FZ = Math.round((FX * H) / W), PX = W / FX;
  const cls = new Uint8Array(FX * FZ); // 0 terre, 1 mer, 2 marais
  for (let j = 0; j < FZ; j++) for (let i = 0; i < FX; i++) {
    const k = geoInfo.classify(x0 + (i + 0.5) * PX, z0 + (j + 0.5) * PX);
    cls[j * FX + i] = k === 'sea' ? 1 : k === 'marsh' ? 2 : 0;
  }
  const dSea = distanceTransform(cls.map((v) => (v === 1 ? 1 : 0)), FX, FZ);  // px, pour terre/marais
  const dLand = distanceTransform(cls.map((v) => (v === 1 ? 0 : 1)), FX, FZ); // px, pour mer
  const cellOf = (x, z) => {
    const i = Math.floor((x - x0) / PX), j = Math.floor((z - z0) / PX);
    return i < 0 || j < 0 || i >= FX || j >= FZ ? -1 : j * FX + i;
  };
  const classAt = (x, z) => { const k = cellOf(x, z); return k < 0 ? 1 : cls[k]; };
  const seaDistAt = (x, z) => { const k = cellOf(x, z); return k < 0 ? 0 : dSea[k] * PX; };

  // --- Relief ---
  const naturalY = (x, z) => {
    const k = classAt(x, z), n = fbm(x * 0.002, z * 0.002);
    if (k === 1) { const dl = dLand[cellOf(x, z)] * PX || 0; return SEA - 0.4 - Math.min(9, dl * 0.035); }
    if (k === 2) return SEA + 0.12;
    const ds = seaDistAt(x, z);
    if (rocky(x, z)) return SEA + Math.min(1, ds / 10) * 3.5 + n * 2 + (ds < 60 ? 0 : Math.min(1, (ds - 60) / 300) * n * 6);
    if (ds < 35) return SEA + 0.15 + ds * 0.045;                     // plage en pente douce
    if (ds < 160) return SEA + 1.7 + fbm(x * 0.02, z * 0.02) * 3;      // dunes
    return SEA + 1.5 + n * 10 * Math.min(1, (ds - 160) / 400);
  };
  const SX = 480, SZ = Math.round((480 * H) / W);
  const geo = new THREE.PlaneGeometry(W, H, SX, SZ); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + c.x, z = pos.getZ(i) + c.z;
    let y = naturalY(x, z);
    const nr = nearest(x, z);
    if (nr.d < 300 && classAt(x, z) !== 1) {
      // terrain qui suit l'altitude de la route, et ne la recouvre jamais (pente max 3 % depuis la chaussée)
      const t = Math.max(0, Math.min(1, (nr.d - 25) / 65));
      y = (nr.y - 0.3) * (1 - t) + y * t;
      y = Math.min(y, nr.y - 0.5 + Math.max(0, nr.d - 15) * 0.03);
    }
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const heightAt = (x, z) => { // bilinéaire sur la grille
    const gx = ((x - x0) / W) * SX, gz = ((z - z0) / H) * SZ;
    const i = Math.max(0, Math.min(SX - 1, Math.floor(gx))), j = Math.max(0, Math.min(SZ - 1, Math.floor(gz)));
    const fx = gx - i, fz = gz - j, Y = (a, b) => pos.getY(b * (SX + 1) + a);
    return (Y(i, j) * (1 - fx) + Y(i + 1, j) * fx) * (1 - fz) + (Y(i, j + 1) * (1 - fx) + Y(i + 1, j + 1) * fx) * fz;
  };

  // --- Carte de couleurs (canvas FX×FZ, ligne 0 = nord) ---
  const cv = document.createElement('canvas'); cv.width = FX; cv.height = FZ;
  const g2 = cv.getContext('2d'), img = g2.createImageData(FX, FZ), D = img.data;
  const C = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const SAND = C(0xe8dbb4), WET = C(0xbfae86), DUNE = C(0xd8cfa0), GRASS = C(0x6f9a4b), GRASS2 = C(0x91ab5c), DARK = C(0x4d7639);
  const ROCK = C(0x7d776e), ROCK2 = C(0x9a948a), FIELD = C(0xb3a764), MW = C(0x7aa39b), MW2 = C(0x9bb9b0), MB = C(0x8d8f62), BOTTOM = C(0xcdbf94);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (let j = 0; j < FZ; j++) for (let i = 0; i < FX; i++) {
    const k = j * FX + i, x = x0 + (i + 0.5) * PX, z = z0 + (j + 0.5) * PX, n = fbm(x * 0.003, z * 0.003), r = hash(i, j);
    let col;
    if (cls[k] === 1) col = mix(BOTTOM, C(0x6f7f6a), Math.min(1, dLand[k] * PX / 250));
    else if (cls[k] === 2) { const h = hash(Math.floor(x / 35), Math.floor(z / 25)); col = h < 0.6 ? MW : h < 0.85 ? MW2 : MB; }
    else {
      const ds = dSea[k] * PX;
      if (rocky(x, z) && ds < 45) col = mix(ROCK, ROCK2, r);
      else if (rocky(x, z) && ds < 90) col = mix(mix(ROCK2, GRASS2, (ds - 45) / 45), DUNE, 0.2);
      else if (ds < 8) col = WET;
      else if (ds < 35) col = mix(SAND, WET, r * 0.15);
      else if (ds < 160) col = mix(DUNE, GRASS2, Math.max(0, (ds - 60) / 100) + n * 0.3 - 0.15);
      else {
        const f = hash(Math.floor(x / 220), Math.floor(z / 160)); // parcelles
        col = f < 0.15 ? FIELD : mix(GRASS, n > 0.5 ? DARK : GRASS2, Math.abs(n - 0.5) * 2);
      }
    }
    const v = 0.9 + r * 0.14;
    D[k * 4] = Math.min(255, col[0] * v); D[k * 4 + 1] = Math.min(255, col[1] * v); D[k * 4 + 2] = Math.min(255, col[2] * v); D[k * 4 + 3] = 255;
  }
  g2.putImageData(img, 0, 0);
  const colorMap = new THREE.CanvasTexture(cv); colorMap.colorSpace = THREE.SRGBColorSpace; colorMap.anisotropy = 8;
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: colorMap, roughness: 1 }));
  land.position.set(c.x, 0, c.z); land.receiveShadow = true;
  scene.add(land);

  // --- Texture distance-côte pour la mer (R = distance à la terre /3 m) ---
  const fd = new Uint8Array(FX * FZ);
  for (let k = 0; k < FX * FZ; k++) fd[k] = Math.min(255, (dLand[k] * PX) / 3);
  const fieldTex = new THREE.DataTexture(fd, FX, FZ, THREE.RedFormat, THREE.UnsignedByteType);
  fieldTex.magFilter = fieldTex.minFilter = THREE.LinearFilter; fieldTex.needsUpdate = true; // ligne 0 = z0 (nord)

  // --- Mer : houle, transparence côtière, écume ---
  const seaGeo = new THREE.PlaneGeometry(60000, 60000, 200, 200); seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.ShaderMaterial({
    fog: true, transparent: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0.3, 0.6, 0.7) },
      uDeep: { value: new THREE.Color(0x0b3d57) }, uMid: { value: new THREE.Color(0x1f6f85) }, uShallow: { value: new THREE.Color(0x4fc1b5) },
      uSky: { value: new THREE.Color(0xc4dcee) }, uField: { value: null }, uRect: { value: new THREE.Vector4(x0, z0, W, H) },
    }]),
    vertexShader: `
      uniform float uTime; uniform sampler2D uField; uniform vec4 uRect;
      varying vec3 vW; varying float vAmp;
      #include <fog_pars_vertex>
      float fieldD(vec2 p){ vec2 uv = (p - uRect.xy) / uRect.zw; if(any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 765.0; return texture2D(uField, uv).r * 765.0; }
      void main(){
        vec4 wp0 = modelMatrix * vec4(position, 1.0);
        float d = fieldD(wp0.xz);
        vAmp = smoothstep(0.0, 300.0, d);
        vec3 p = position;
        p.y += (sin(wp0.x*0.004 + uTime*0.6)*0.5 + sin(wp0.z*0.006 - uTime*0.8)*0.35) * (0.15 + 0.85*vAmp);
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uSun, uDeep, uMid, uShallow, uSky; uniform float uTime; uniform sampler2D uField; uniform vec4 uRect;
      varying vec3 vW; varying float vAmp;
      #include <fog_pars_fragment>
      float fieldD(vec2 p){ vec2 uv = (p - uRect.xy) / uRect.zw; if(any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 765.0; return texture2D(uField, uv).r * 765.0; }
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float d = fieldD(vW.xz);
        // normale : houle + clapot (dérivées analytiques simples)
        vec2 q = vW.xz;
        vec3 n = normalize(vec3(
          -0.002*cos(q.x*0.004+uTime*0.6) - 0.05*cos(q.x*0.21+q.y*0.13+uTime*2.1) - 0.03*cos(q.x*0.53-uTime*2.9),
          1.0,
          -0.0021*cos(q.y*0.006-uTime*0.8) - 0.05*cos(q.y*0.17-q.x*0.09-uTime*1.7) - 0.03*cos(q.y*0.47+uTime*2.5)));
        vec3 v = normalize(cameraPosition - vW);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        float shallow = 1.0 - smoothstep(0.0, 120.0, d);
        float mid = 1.0 - smoothstep(60.0, 600.0, d);
        vec3 water = mix(uDeep, uMid, mid);
        water = mix(water, uShallow, shallow);
        vec3 col = mix(water, uSky, fres * 0.85);
        float spec = pow(max(dot(reflect(-normalize(uSun), n), v), 0.0), 220.0);
        col += vec3(1.0, 0.96, 0.88) * spec * 2.0;
        // écume : liseré sur le rivage + rouleaux qui avancent vers la côte
        float nz = vn(q * 0.08 + uTime * 0.15) * 0.6 + vn(q * 0.3 - uTime * 0.3) * 0.4;
        float edge = 1.0 - smoothstep(0.0, 6.0 + nz * 6.0, d);
        float rolls = smoothstep(0.75, 0.95, sin(d * 0.22 + uTime * 1.6 + nz * 3.0)) * (1.0 - smoothstep(5.0, 70.0, d));
        float foam = clamp(edge + rolls * (0.4 + 0.6 * nz), 0.0, 1.0) * smoothstep(0.25, 0.6, nz + edge);
        col = mix(col, vec3(0.96, 0.98, 1.0), foam * 0.9);
        float alpha = mix(0.98, 0.38, shallow * shallow);
        alpha = max(alpha, foam);
        alpha = mix(alpha, 1.0, smoothstep(0.0, 1.0, fres) * 0.5);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  seaMat.uniforms.uField.value = fieldTex;
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(c.x, SEA, c.z);
  sea.renderOrder = 1;
  scene.add(sea);

  // terre "constructible" : hors mer/marais et à >35 m du rivage
  const isLand = (x, z) => classAt(x, z) === 0 && seaDistAt(x, z) > 35;
  return {
    land, sea, seaMat, isLand, classify: geoInfo.classify, distTo, heightAt, rocky, SEA,
    field: { cls, dSea, dLand, FX, FZ, PX, x0, z0 }, houses: [], center: c, span: Math.max(size.x, size.z),
  };
}

// ---------- rochers (côte sauvage) ----------
export function addRocks(scene, terrain, max = 900) {
  const { cls, dSea, dLand, FX, FZ, PX, x0, z0 } = terrain.field;
  const list = [];
  for (let tries = 0; tries < 400000 && list.length < max; tries++) {
    const i = Math.floor(rand() * FX), j = Math.floor(rand() * FZ), k = j * FX + i;
    const x = x0 + (i + rand()) * PX, z = z0 + (j + rand()) * PX;
    const shoreSea = cls[k] === 1 && dLand[k] * PX < 35, shoreLand = cls[k] === 0 && dSea[k] * PX < 25;
    if (!(shoreSea || shoreLand) || !terrain.rocky(x, z)) continue;
    if (terrain.distTo(x, z) < 8) continue;
    const big = rand() < 0.15, s = big ? 3 + rand() * 4 : 0.8 + rand() * 2.2;
    const y = Math.max(terrain.heightAt(x, z), terrain.SEA - 1.5) - s * 0.25;
    list.push({ x, y, z, s, sy: 0.5 + rand() * 0.5, r: rand() * 6.28, t: rand() });
  }
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position; // déformation déterministe → bloc de granit
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const f = 0.75 + vnoise(v.x * 2.1 + 5, v.y * 2.3 + v.z * 1.7) * 0.5;
    p.setXYZ(i, v.x * f * 1.2, v.y * f, v.z * f);
  }
  geo.computeVertexNormals();
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  list.forEach((r, i) => {
    q.setFromEuler(e.set(rand() * 0.4, r.r, rand() * 0.4));
    im.setMatrixAt(i, m.compose(new THREE.Vector3(r.x, r.y, r.z), q, new THREE.Vector3(r.s, r.s * r.sy, r.s)));
    im.setColorAt(i, col.setHex(0x8a847a).lerp(new THREE.Color(0x5e5a54), r.t).offsetHSL(0, 0, (rand() - 0.5) * 0.06));
  });
  im.receiveShadow = true; im.castShadow = false;
  scene.add(im);
  return list.length;
}

// ---------- végétation instanciée ----------
export function addVegetation(scene, track, terrain) {
  const { pts, cum, length } = track;
  const along = (d) => { // position + normale à distance d
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], s = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / s;
    return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t, nx: -(B.z - A.z) / s, nz: (B.x - A.x) / s };
  };
  const pines = [], leafy = [], bushes = [];
  for (let d = 0; d < length; d += 14) {
    for (const side of [-1, 1]) {
      if (rand() < 0.35) continue;
      const p = along(d + rand() * 10), off = side * (7 + rand() * 45);
      const x = p.x + p.nx * off, z = p.z + p.nz * off;
      if (!terrain.isLand(x, z)) continue; // pas mer/marais/plage
      if (terrain.houses.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 110)) continue; // pas dans une maison
      if (terrain.distTo(x, z) < 6) continue;   // pas sur la route (virages)
      const item = { x, y: terrain.heightAt(x, z) - 0.3, z, s: 0.7 + rand() * 0.7, r: rand() * Math.PI * 2 };
      const k = rand(); (k < 0.4 ? pines : k < 0.7 ? leafy : bushes).push(item);
    }
  }
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x2f5a32, roughness: 0.9, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f7f3a, roughness: 0.9, flatShading: true });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x5d7f3e, roughness: 1, flatShading: true });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const inst = (geo, mat, list, yOff, shadow) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, it.r); sc.setScalar(it.s); ps.set(it.x, it.y + yOff * it.s, it.z);
      im.setMatrixAt(i, m.compose(ps, q, sc));
    });
    im.castShadow = shadow; scene.add(im);
  };
  // Pins maritimes : tronc + houppier aplati
  inst(new THREE.CylinderGeometry(0.25, 0.35, 7, 5), trunkMat, pines, 3.5, true);
  const crown = new THREE.IcosahedronGeometry(3, 0); crown.scale(1.3, 0.6, 1.3);
  inst(crown, pineMat, pines, 7.5, true);
  // Feuillus : tronc + boule
  inst(new THREE.CylinderGeometry(0.2, 0.3, 3, 5), trunkMat, leafy, 1.5, true);
  inst(new THREE.IcosahedronGeometry(2.2, 0), leafMat, leafy, 4.2, true);
  // Buissons
  const bush = new THREE.IcosahedronGeometry(1, 0); bush.scale(1.4, 0.8, 1.2);
  inst(bush, bushMat, bushes, 0.5, false);
  return pines.length + leafy.length + bushes.length;
}

// ---------- route ----------
export function buildRoad(scene, track, width = 4, terrain = null, useRealTerrain = false) {
  const { pts, cum } = track, n = pts.length;
  
  // If using real terrain, smooth DEM elevations for road
  let roadElevations = pts.map(p => p.y);
  if (useRealTerrain && terrain && terrain.heightAt) {
    console.log('Using DEM elevations for road (smoothed)');
    // Sample DEM under each GPX point
    const demElevations = pts.map(p => terrain.heightAt(p.x, p.z));
    // Smooth with moving average (~50m window)
    const windowSize = Math.max(5, Math.floor(50 / (cum[1] - cum[0] || 10)));
    roadElevations = demElevations.map((_, i) => {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(demElevations.length, i + windowSize + 1);
      const sum = demElevations.slice(start, end).reduce((a, b) => a + b, 0);
      return sum / (end - start);
    });
  }
  
  const asphalt = canvasTex(512, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) {
      const x = i % s, y = (i / s) | 0;
      const v = 52 + fbm(x * 0.05, y * 0.05) * 16 + Math.random() * 12 + (Math.random() < 0.01 ? 30 : 0);
      img.data.set([v, v + 2, v + 6, 255], i * 4);
    }
    g.putImageData(img, 0, 0);
  });
  const ribbon = (offA, offB, yLift, vScale) => {
    const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const nx = -tz, nz = tx, p = pts[i];
      const ax = p.x + nx * offA, az = p.z + nz * offA, bx = p.x + nx * offB, bz = p.z + nz * offB;
      // Use smoothed DEM elevation if available
      const gy = roadElevations[i];
      pos.set([ax, gy + yLift, az, bx, gy + yLift, bz], i * 6);
      uv.set([0, cum[i] / vScale, 1, cum[i] / vScale], i * 4);
      if (i < n - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  const h = width / 2, side = THREE.DoubleSide;
  const road = new THREE.Mesh(ribbon(h, -h, 0.2, 6), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92, metalness: 0, side, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  road.receiveShadow = true; road.frustumCulled = false; scene.add(road);
  
  // Skip grey shoulders (skirts) when using real terrain
  if (!useRealTerrain) {
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x8a8f7a, roughness: 1, side, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    scene.add(new THREE.Mesh(ribbon(h + 0.8, h, 0.3, 6), shoulderMat), new THREE.Mesh(ribbon(-h, -h - 0.8, 0.3, 6), shoulderMat));
  }
  
  // White road markings
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x555555, roughness: 0.6, side, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  scene.add(new THREE.Mesh(ribbon(h - 0.15, h - 0.3, 0.23, 6), lineMat), new THREE.Mesh(ribbon(-h + 0.3, -h + 0.15, 0.23, 6), lineMat));
  const dash = canvasTex(64, (g, s) => { g.clearRect(0, 0, s, s); g.fillStyle = '#f0f0e8'; g.fillRect(0, 0, s, s * 0.4); });
  dash.colorSpace = THREE.SRGBColorSpace;
  // (pas d'axe central pointillé : route de montagne étroite, comme sur place)
}


// Toit à deux pans : prisme (base 1×1 en XZ, faîtage selon X, hauteur 1)
export function makeRoofGeometry() {
  const v = [-.5,0,-.5, .5,0,-.5, .5,0,.5, -.5,0,.5, -.5,1,0, .5,1,0];
  const tri = [0,4,5, 0,5,1, 3,2,5, 3,5,4, 0,3,4, 1,5,2, 0,1,2, 0,2,3];
  const pos = []; for (const i of tri) pos.push(v[i*3], v[i*3+1], v[i*3+2]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

// ---------- maisons (hameaux le long du tracé, côté intérieur) ----------
export function addHouses(scene, track, terrain, max = 140) {
  const { pts, cum, length } = track;
  const along = (d) => {
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], s = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / s;
    return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t, tx: (B.x - A.x) / s, tz: (B.z - A.z) / s };
  };
  const list = [];
  for (let d = 400; d < length - 200 && list.length < max; d += 1200 + rand() * 1800) {
    const n = 4 + Math.floor(rand() * 8); // maisons par hameau
    for (let i = 0; i < n && list.length < max; i++) {
      const p = along(d + i * (18 + rand() * 12));
      let nx = -p.tz, nz = p.tx;
      if (nz > 0) { nx = -nx; nz = -nz; } // côté nord (Z négatif = nord), loin de la plage
      const off = 14 + rand() * 22, x = p.x + nx * off, z = p.z + nz * off;
      if (!terrain.isLand(x, z) || terrain.distTo(x, z) < 11) continue;
      if (list.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 144)) continue;
      list.push({ x, y: terrain.heightAt(x, z) - 0.3, z, rot: Math.atan2(nx, nz), w: 7 + rand() * 4, dpt: 6 + rand() * 3, h: 3 + rand() * 2.5, v: Math.floor(rand() * 3) });
    }
  }
  // Variantes : enduit blanc / crème / ocre ; toits ardoise / tuile / ardoise claire
  const walls = [0xf2efe6, 0xeadcc0, 0xd9b98a].map((c) => new THREE.Color(c));
  const roofs = [0x3d4450, 0xa4523a, 0x5a6270].map((c) => new THREE.Color(c));
  const body = new THREE.BoxGeometry(1, 1, 1); body.translate(0, 0.5, 0);
  const roof = makeRoofGeometry();
  const bodyIM = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.9 }), list.length);
  const roofIM = new THREE.InstancedMesh(roof, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true, side: THREE.DoubleSide }), list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((h, i) => {
    q.setFromAxisAngle(up, h.rot);
    bodyIM.setMatrixAt(i, m.compose(new THREE.Vector3(h.x, h.y, h.z), q, new THREE.Vector3(h.w, h.h, h.dpt)));
    roofIM.setMatrixAt(i, m.compose(new THREE.Vector3(h.x, h.y + h.h, h.z), q, new THREE.Vector3(h.w * 1.08, h.dpt * 0.5, h.dpt * 1.1)));
    bodyIM.setColorAt(i, walls[h.v]); roofIM.setColorAt(i, roofs[(h.v + i) % 3]);
  });
  terrain.houses = list;
  for (const im of [bodyIM, roofIM]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
  return list.length;
}
