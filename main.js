import * as THREE from 'three';
import { parseGpx, buildTrack, sampleTrack } from './gpx.js';
import { stepSpeed } from './physics.js';
import { createMinimap } from './minimap.js';
import { setupSky, addClouds, buildRoad } from './decor.js';
import { addChalets } from './chalets.js';
import { createRider } from './rider.js';
import { createSensors } from './sensors.js';
import { addRoadside } from './roadside.js';
import { buildAlpineTerrain, alpineAtmosphere, installHeightFog, addForest, ZONE_COLORS } from './alpine.js';

installHeightFog(); // avant toute compilation de shader

// --- FTP & zones de puissance Coggan (modifier ici) ---
const FTP_W = 160;
const POWER_ZONES = [ // borne haute en %FTP, couleur de fond, couleur du texte
  { z: 'Z1', max: 55, bg: '#9e9e9e', fg: '#111' },      // récupération active
  { z: 'Z2', max: 75, bg: '#2e86de', fg: '#fff' },      // endurance
  { z: 'Z3', max: 90, bg: '#27ae60', fg: '#fff' },      // tempo
  { z: 'Z4', max: 105, bg: '#f1c40f', fg: '#111' },     // seuil
  { z: 'Z5', max: 120, bg: '#e67e22', fg: '#111' },     // VO2max
  { z: 'Z6', max: 150, bg: '#e74c3c', fg: '#fff' },     // anaérobie
  { z: 'Z7', max: Infinity, bg: '#8e44ad', fg: '#fff' }, // neuromusculaire
];
document.getElementById('ftp').textContent = FTP_W;
const zoneFor = (w) => { const pct = (w / FTP_W) * 100; return { pct, ...POWER_ZONES.find((z) => pct < z.max) }; };
const hud = {
  watts: document.getElementById('watts'),
  cadence: document.getElementById('cadence'),
  speed: document.getElementById('speed'),
  grade: document.getElementById('grade'),
  source: document.getElementById('source'),
  dist: document.getElementById('dist'),
  alt: document.getElementById('alt'),
};

// --- Scène ---
const SKY = 0xa8d0f0;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 150, 1800);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 60000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x5a6a3a, 0.9));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 });
scene.add(sun, sun.target);
const { sunDir } = setupSky(scene, renderer, sun);
alpineAtmosphere(scene, renderer, sun, sunDir);
let seaMat = null;
let groundAt = null; // hauteur du terrain (anti-caméra dans la pente)
let updateMinimap = null;

// --- Cycliste : vélo route aéro noir VAN RYSEL + coureur animé (rider.js) ---
const riderModel = createRider();
const rider = riderModel.group;
scene.add(rider);

// --- État ---
let state = { watts: 0, cadence: 0, speedKmh: 0, gradePct: 0, source: 'init' };
let distanceM = 0; // distance locale le long du tracé GPX
let track = null;
const clock = new THREE.Clock();

let physV = 0; // vitesse simulée côté client (m/s)
let lastSent = 0;
// --- Vitesses virtuelles (Zwift Cog + Click/Play, ou touches + / −) : décalent la pente envoyée au home trainer ---
const GEARS = 24, GEAR_NEUTRAL = 12, GRADE_PER_GEAR = 0.8; // % de pente ajoutée par vitesse au-dessus du neutre
let gear = GEAR_NEUTRAL;
const shift = (d) => { gear = Math.max(1, Math.min(GEARS, gear + d)); const g = document.getElementById('gear'); if (g) g.textContent = gear; };
addEventListener('keydown', (e) => { if (e.key === '+' || e.key === 'ArrowUp' && e.shiftKey) shift(1); if (e.key === '-' || e.key === 'ArrowDown' && e.shiftKey) shift(-1); });
const sensors = createSensors((msg) => {
    state = { ...state, ...msg };
    hud.watts.textContent = Math.round(state.watts);
    { const zn = zoneFor(state.watts || 0), el = document.getElementById('zone');
      el.textContent = zn.z; el.style.background = zn.bg; el.style.color = zn.fg;
      document.getElementById('pctftp').textContent = `(${Math.round(zn.pct)} %)`; }
    hud.cadence.textContent = Math.round(state.cadence);
    hud.source.textContent = state.source || 'ws';
}, { onShift: shift, onLog: (m) => console.log('[ble]', m) });
shift(0);
const zwBtn = document.getElementById('zwift-btn');
if (zwBtn) zwBtn.onclick = async () => {
  zwBtn.disabled = true; zwBtn.textContent = 'Connexion…';
  try { zwBtn.textContent = '✓ ' + (await sensors.connectZwift()); }
  catch (e) { console.warn('Zwift', e); zwBtn.textContent = 'Zwift : ' + (e.message || e).toString().slice(0, 40); zwBtn.disabled = false; }
};
const bleBtn = document.getElementById('ble-btn');
if (bleBtn) bleBtn.onclick = async () => {
  bleBtn.disabled = true; bleBtn.textContent = 'Connexion…';
  try { bleBtn.textContent = '✓ ' + (await sensors.connectBle()); }
  catch (e) { console.warn('BLE', e); bleBtn.textContent = 'BLE : ' + (e.message || e).toString().slice(0, 40); bleBtn.disabled = false; }
};

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const camPos = new THREE.Vector3();
const tmp = new THREE.Vector3();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (track) {
    // Physique : P = air + roulement + gravité, sur la pente réelle du GPX (inertie incluse)
    const here = sampleTrack(track, distanceM);
    physV = stepSpeed(physV, state.watts, here.gradePct, dt, here.pos.y);
    hud.speed.textContent = (physV * 3.6).toFixed(1);
    distanceM += physV * dt;
    const now = performance.now();
    if (now - lastSent > 1000) { sensors.sendRoute(here.gradePct, here.pos.y); sensors.setSimulation(here.gradePct * 0.5 + (gear - GEAR_NEUTRAL) * GRADE_PER_GEAR); lastSent = now; }
    if (distanceM >= track.length) distanceM = 0; // boucle : retour au départ (Villard-Reculas)
    const { pos, dir, gradePct } = sampleTrack(track, distanceM);
    rider.position.set(pos.x, pos.y + 0.02, pos.z);
    riderModel.update(dt, state.cadence, physV);
    if (updateMinimap) updateMinimap(pos, dir);
    rider.rotation.y = Math.atan2(dir.x, dir.z); // tangent à la route
    // Pente calculée depuis le GPX (prioritaire sur le mock serveur)
    hud.grade.textContent = gradePct.toFixed(1);
    hud.alt.textContent = Math.round(pos.y); // altitude GPX (lissée) à la position actuelle
    if (hud.dist) hud.dist.textContent = `${(distanceM / 1000).toFixed(2)} / ${(track.length / 1000).toFixed(1)}`;
    // Caméra chase lissée
    const ahead = sampleTrack(track, distanceM + 15).pos;
    tmp.set(pos.x - dir.x * 9, pos.y + 4, pos.z - dir.z * 9);
    camPos.lerp(tmp, 1 - Math.exp(-dt * 4));
    if (groundAt) {
      // caméra jamais dans la pente, et ligne de vue caméra→cycliste dégagée (relief entre les deux)
      let minY = groundAt(camPos.x, camPos.z) + 2.5;
      const ty = pos.y + 1.2;
      for (const t of [0.3, 0.6, 0.85]) {
        const hx = camPos.x + (pos.x - camPos.x) * t, hz = camPos.z + (pos.z - camPos.z) * t;
        minY = Math.max(minY, (groundAt(hx, hz) + 1 - ty * t) / (1 - t));
      }
      camPos.y = Math.max(camPos.y, Math.min(minY, pos.y + 25));
    }
    camera.position.copy(camPos);
    camera.lookAt(ahead.x, ahead.y + 1, ahead.z);
    sun.position.set(pos.x + sunDir.x * 100, pos.y + sunDir.y * 100, pos.z + sunDir.z * 100);
    sun.target.position.set(pos.x, pos.y, pos.z);
  }
  if (seaMat) seaMat.uniforms.uTime.value = clock.elapsedTime;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// --- Téléportation depuis la mini-map : projection sur le segment le plus proche ---
// Parcours aller-retour : parmi les projections quasi aussi proches (±25 m), on garde la plus proche de la distance actuelle.
function teleportTo(wx, wz) {
  if (!track) return;
  const { pts, cum } = track;
  const cands = [];
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], dx = B.x - A.x, dz = B.z - A.z, L2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((wx - A.x) * dx + (wz - A.z) * dz) / L2));
    const d = Math.hypot(wx - (A.x + t * dx), wz - (A.z + t * dz));
    cands.push([d, cum[i] + t * (cum[i + 1] - cum[i])]);
    if (d < best) best = d;
  }
  let target = 0, gap = Infinity;
  for (const [d, dist] of cands) if (d <= best + 25 && Math.abs(dist - distanceM) < gap) { gap = Math.abs(dist - distanceM); target = dist; }
  distanceM = target;
  const sm = sampleTrack(track, distanceM); // caméra replacée immédiatement (pas de long travelling)
  camPos.set(sm.pos.x - sm.dir.x * 9, sm.pos.y + 4, sm.pos.z - sm.dir.z * 9);
  console.log(`Téléportation : ${(distanceM / 1000).toFixed(2)} km (à ${best.toFixed(0)} m du clic)`);
}

// Debug console : veloTeleportKm(12.5)
window.veloTeleportKm = (km) => { if (!track) return; const sm = sampleTrack(track, km * 1000); teleportTo(sm.pos.x, sm.pos.z); };

// --- Chargement GPX ---
Promise.all([
  fetch('/villard-reculas.gpx').then((r) => { if (!r.ok) throw new Error(`GPX HTTP ${r.status}`); return r.text(); }),
  fetch('/dem-villard.json').then((r) => r.json()),
  fetch('/dem-villard.bin').then((r) => r.arrayBuffer()),
])
  .then(([txt, demMeta, demBuf]) => {
    const dem = { meta: demMeta, data: new Int16Array(demBuf) };
    track = buildTrack(parseGpx(txt), 1200);
    console.log(`GPX : ${track.rawCount} pts bruts → ${track.pts.length} pts, ${(track.length / 1000).toFixed(2)} km`);
    buildRoad(scene, track);
    const terrain = buildAlpineTerrain(scene, track, dem);
    groundAt = terrain.heightAt;
    updateMinimap = createMinimap(track, 200, terrain.classify, teleportTo, ZONE_COLORS);
    addClouds(scene, terrain.center, terrain.span * 3, 3200);
    { const ch = addChalets(scene, track, terrain); console.log('Chalets bois — village :', ch.village, '· hameaux :', ch.hamlets); }
    console.log('Bords de route :', addRoadside(scene, track, terrain));
    console.log('Arbres :', addForest(scene, track, terrain), 'instances');
    const s = sampleTrack(track, 0);
    camPos.set(s.pos.x - s.dir.x * 9, s.pos.y + 4, s.pos.z - s.dir.z * 9);
  })
  .catch((e) => { console.error('GPX', e); hud.source.textContent = 'GPX introuvable'; });

tick();
