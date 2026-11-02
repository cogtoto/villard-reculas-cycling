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
import { buildNormandyTerrain, normandyAtmosphere, addNormandyVegetation, addNormandyCows, addNormandyHouses, NORMANDY_ZONE_COLORS } from './normandy.js';
import { createFTPRampTest, createSweetSpotWorkout, createExplosiveWorkout, getCurrentInterval, detectRampTestFailure, calculateEstimatedFTP, getWorkoutProfile, formatTime } from './workouts.js';
import { startERGMode, stopERGMode, updateTargetPower, adjustTargetPower, isERGActive, initializeERGMode } from './erg-mode.js';

installHeightFog(); // avant toute compilation de shader

// --- Route configuration ---
const ROUTES = {
  villard: {
    name: 'Villard-Reculas (Oisans)',
    description: 'descent + climb',
    gpx: '/villard-reculas.gpx',
    dem: { meta: '/dem-villard.json', bin: '/dem-villard.bin' },
    setupTerrain: (scene, track, dem) => buildAlpineTerrain(scene, track, dem),
    setupAtmosphere: (scene, renderer, sun, sunDir) => alpineAtmosphere(scene, renderer, sun, sunDir),
    setupDecor: (scene, track, terrain) => {
      addClouds(scene, terrain.center, terrain.span * 3, 3200);
      const ch = addChalets(scene, track, terrain);
      console.log('Chalets:', ch.village, 'village ·', ch.hamlets, 'hamlets');
      console.log('Roadside:', addRoadside(scene, track, terrain));
      console.log('Trees:', addForest(scene, track, terrain), 'instances');
    },
    zoneColors: ZONE_COLORS
  },
  normandy: {
    name: 'Normandy countryside – Grand-Camp (Eure)',
    description: '~21 km rolling',
    gpx: '/normandie-grand-camp.gpx',
    dem: { meta: '/dem-normandy.json', bin: '/dem-normandy.bin' },
    setupTerrain: (scene, track, dem) => buildNormandyTerrain(scene, track, dem),
    setupAtmosphere: (scene, renderer, sun, sunDir) => normandyAtmosphere(scene, renderer, sun, sunDir),
    setupDecor: (scene, track, terrain) => {
      const h = addNormandyHouses(scene, track, terrain);
      console.log('Half-timbered houses:', h.village, 'village ·', h.hamlets, 'hamlets');
      console.log('Vegetation:', addNormandyVegetation(scene, track, terrain), 'instances');
      console.log('Cows:', addNormandyCows(scene, track, terrain));
    },
    zoneColors: NORMANDY_ZONE_COLORS
  }
};

const ROUTE_KEY = 'vv.route';
let selectedRoute = localStorage.getItem(ROUTE_KEY) || 'villard';
let selectedMode = 'free'; // 'free', 'ftp-ramp-test', 'sweet-spot', 'explosive-power'
let currentWorkout = null;
let workoutStartTime = 0;
let powerHistory = []; // For FTP test
let cadenceHistory = []; // For FTP test failure detection

// --- FTP & zones de puissance Coggan (modifier ici) ---
const FTP_KEY = 'vv.ftp';
let FTP_W = Number(localStorage.getItem(FTP_KEY)) || 160; // saved locally, default 160 W
let rideStarted = false;
{
  const inp = document.getElementById('ftp-input'), intro = document.getElementById('intro');
  inp.value = FTP_W;
  const showMode = () => { 
    document.getElementById('ftp-step').style.display = 'none'; 
    document.getElementById('mode-step').style.display = ''; 
  };
  const showRoute = () => { 
    document.getElementById('mode-step').style.display = 'none'; 
    document.getElementById('route-step').style.display = ''; 
  };
  if (localStorage.getItem(FTP_KEY)) showMode();
  document.getElementById('ftp-ok').onclick = () => {
    const v = Math.round(Number(inp.value));
    if (!(v >= 50 && v <= 600)) { inp.style.outline = '2px solid #e74c3c'; return; }
    FTP_W = v; localStorage.setItem(FTP_KEY, String(v)); document.getElementById('ftp').textContent = v; showMode();
  };
  
  document.getElementById('mode-ok').onclick = () => {
    selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'free';
    showRoute();
  };
  
  // Route selection - restore last choice
  const savedRoute = localStorage.getItem(ROUTE_KEY);
  if (savedRoute) {
    const radio = document.querySelector(`input[name="route"][value="${savedRoute}"]`);
    if (radio) radio.checked = true;
  } else {
    // Default to villard if no saved choice
    const villardRadio = document.querySelector('input[name="route"][value="villard"]');
    if (villardRadio) villardRadio.checked = true;
  }
  
  // Update selectedRoute when user changes selection
  document.querySelectorAll('input[name="route"]').forEach(el => {
    el.addEventListener('change', () => {
      selectedRoute = document.querySelector('input[name="route"]:checked')?.value || 'villard';
    });
  });
  
  document.getElementById('ride-go').onclick = () => {
    selectedRoute = document.querySelector('input[name="route"]:checked')?.value || 'villard';
    selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'free';
    localStorage.setItem(ROUTE_KEY, selectedRoute);
    
    // Initialize workout if needed
    if (selectedMode !== 'free') {
      if (selectedMode === 'ftp-ramp-test') {
        currentWorkout = createFTPRampTest(FTP_W);
      } else if (selectedMode === 'sweet-spot') {
        currentWorkout = createSweetSpotWorkout(FTP_W);
      } else if (selectedMode === 'explosive-power') {
        currentWorkout = createExplosiveWorkout(FTP_W);
      }
      console.log('Workout selected:', currentWorkout.name);
      
      // Show workout HUD, hide normal HUD gear display
      document.getElementById('workout-hud').style.display = 'block';
      document.getElementById('workout-name').textContent = currentWorkout.name;
      if (currentWorkout.isTest) {
        document.getElementById('stop-test-btn').style.display = 'block';
      }
      
      // Hide gear controls during workout (ERG mode)
      document.getElementById('shift-pad').style.display = 'none';
      const gearLine = Array.from(document.getElementById('hud').children).find(el => el.textContent.includes('Virtual gear'));
      if (gearLine) gearLine.style.display = 'none';
    }
    
    intro.remove(); 
    rideStarted = true;
    loadRoute(); // Load the selected route
  };
}
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
// --- Vitesses virtuelles (gros boutons tactiles + / −, ou touches + / −) : décalent la pente envoyée au home trainer ---
const GEARS = 24, GEAR_NEUTRAL = 12, GRADE_PER_GEAR = 0.8; // % de pente ajoutée par vitesse au-dessus du neutre
let gear = GEAR_NEUTRAL;
let routeGrade = 0; // pente GPX courante (mise à jour dans tick)
// Consigne home trainer FTMS = 50 % de la pente GPX + décalage de la vitesse virtuelle (renvoyée à chaque changement)
const TRAINER_GRADE_SCALE = 0.5;
const trainerGrade = () => routeGrade * TRAINER_GRADE_SCALE + (gear - GEAR_NEUTRAL) * GRADE_PER_GEAR;
const pushTrainer = () => { 
  try { 
    if (!isERGActive()) {
      sensors.setSimulation(trainerGrade()); 
    }
  } catch { /* capteurs pas encore initialisés */ } 
};
const shift = (d) => { 
  if (d && typeof S !== 'undefined') S.shifts++; 
  gear = Math.max(1, Math.min(GEARS, gear + d)); 
  const g = document.getElementById('gear'); 
  if (g) g.textContent = gear; 
  const sg = document.getElementById('shift-gear'); 
  if (sg) sg.textContent = gear; 
  if (d) {
    if (isERGActive()) {
      // In ERG mode, +/- adjusts target power by ±5%
      const delta = d * 5; // 5W per gear shift
      adjustTargetPower(delta);
    } else {
      pushTrainer();
    }
  }
};
addEventListener('keydown', (e) => { if (e.key === '+' || e.key === 'ArrowUp' && e.shiftKey) shift(1); if (e.key === '-' || e.key === 'ArrowDown' && e.shiftKey) shift(-1); });
const sensors = createSensors((msg) => {
    state = { ...state, ...msg };
    hud.watts.textContent = Math.round(state.watts);
    { const zn = zoneFor(state.watts || 0), el = document.getElementById('zone');
      el.textContent = zn.z; el.style.background = zn.bg; el.style.color = zn.fg;
      document.getElementById('pctftp').textContent = `(${Math.round(zn.pct)} %)`; }
    hud.cadence.textContent = Math.round(state.cadence);
    hud.source.textContent = state.source || 'ws';
}, { onLog: (m) => console.log('[ble]', m) });
shift(0);
for (const [id, d] of [['shift-up', 1], ['shift-down', -1]]) { // gros boutons tactiles (paysage Android)
  const b = document.getElementById(id);
  if (b) b.addEventListener('pointerdown', (e) => { e.preventDefault(); shift(d); });
}
const bleBtn = document.getElementById('ble-btn');
if (bleBtn) bleBtn.onclick = async () => {
  bleBtn.disabled = true; bleBtn.textContent = 'Connecting…';
  try { 
    const deviceName = await sensors.connectBle();
    bleBtn.textContent = '✓ ' + deviceName;
    
    // Initialize ERG mode if in workout mode
    if (currentWorkout) {
      // Try to init ERG with the connected device
      // Note: sensors.js needs to expose the BLE device/deviceId
      console.log('Workout mode: will start ERG when workout begins');
    }
  }
  catch (e) { console.warn('BLE', e); bleBtn.textContent = 'BLE : ' + (e.message || e).toString().slice(0, 40); bleBtn.disabled = false; }
};

// --- Statistiques de sortie + bouton Stop ---
const S = { elapsed: 0, moving: 0, dist: 0, maxV: 0, gain: 0, loss: 0, lastY: null, wSum: 0, wMax: 0, w30: [], np4: 0, npN: 0, npAcc: 0, npT: 0,
  cadSum: 0, cadT: 0, zones: new Array(7).fill(0), gearSum: 0, gearMin: Infinity, gearMax: -Infinity, shifts: 0 };
function recordStats(dt, here) {
  S.elapsed += dt;
  const v = physV, w = state.watts || 0;
  if (v > 0.5) S.moving += dt;
  S.dist += v * dt; S.maxV = Math.max(S.maxV, v);
  if (S.lastY != null) { const dy = here.pos.y - S.lastY; if (dy > 0) S.gain += dy; else S.loss -= dy; }
  S.lastY = here.pos.y;
  S.wSum += w * dt; S.wMax = Math.max(S.wMax, w);
  S.npAcc += w * dt; S.npT += dt; // moyenne glissante 30 s par tranches d'1 s
  if (S.npT >= 1) { S.w30.push(S.npAcc / S.npT); S.npAcc = 0; S.npT = 0; if (S.w30.length > 30) S.w30.shift();
    if (S.w30.length === 30) { const a = S.w30.reduce((s, x) => s + x, 0) / 30; S.np4 += a ** 4; S.npN++; } }
  if (state.cadence > 0) { S.cadSum += state.cadence * dt; S.cadT += dt; }
  S.zones[POWER_ZONES.indexOf(POWER_ZONES.find((z) => (w / FTP_W) * 100 < z.max))] += dt;
  S.gearSum += gear * dt; S.gearMin = Math.min(S.gearMin, gear); S.gearMax = Math.max(S.gearMax, gear);
}
const fmtT = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + 'h ' : '') + String(m).padStart(h ? 2 : 1, '0') + 'm ' + String(x).padStart(2, '0') + 's'; };
const ZONE_NAMES = ['Easy recovery', 'Endurance', 'Tempo', 'Threshold', 'VO2 max', 'Anaerobic', 'Sprint'];
function showStats() {
  document.getElementById('stats-route').textContent = ROUTES[selectedRoute].name + ' · ride paused';
  const kmh = (ms) => (ms * 3.6).toFixed(1);
  const avgV = S.moving ? S.dist / S.moving : 0, avgW = S.elapsed ? S.wSum / S.elapsed : 0;
  const np = S.npN ? Math.pow(S.np4 / S.npN, 0.25) : null;
  const card = (label, value, sub = '') => `<div class="st-card"><div class="st-l">${label}</div><div class="st-v">${value}</div>${sub ? `<div class="st-s">${sub}</div>` : ''}</div>`;
  const tot = S.zones.reduce((a, b) => a + b, 0) || 1;
  const zones = POWER_ZONES.map((z, i) => { const p = (S.zones[i] / tot) * 100;
    return `<div class="st-z"><span class="st-zt" style="background:${z.bg};color:${z.fg}">${z.z}</span><span class="st-zn">${ZONE_NAMES[i]}</span><span class="st-zb"><i style="width:${p.toFixed(1)}%;background:${z.bg}"></i></span><span class="st-zp">${fmtT(S.zones[i])}</span></div>`; }).join('');
  document.getElementById('stats-body').innerHTML = `
    <div class="st-sec">Time &amp; distance</div><div class="st-grid">
      ${card('Riding time', fmtT(S.moving), 'Total: ' + fmtT(S.elapsed))}
      ${card('Distance', (S.dist / 1000).toFixed(2) + ' km')}
      ${card('Average speed', kmh(avgV) + ' km/h')}
      ${card('Top speed', kmh(S.maxV) + ' km/h')}</div>
    <div class="st-sec">Climbing</div><div class="st-grid">
      ${card('Climbed', Math.round(S.gain) + ' m')}
      ${card('Descended', Math.round(S.loss) + ' m')}
      ${card('Average slope', S.dist > 50 ? (((S.gain - S.loss) / S.dist) * 100).toFixed(1) + ' %' : '—', 'uphill minus downhill')}</div>
    <div class="st-sec">Effort</div><div class="st-grid">
      ${card('Average power', Math.round(avgW) + ' W', Math.round((avgW / FTP_W) * 100) + ' % of your FTP')}
      ${card('Max power', Math.round(S.wMax) + ' W')}
      ${card('Normalized power', np ? Math.round(np) + ' W' : '—', 'how hard it really felt')}
      ${card('Average cadence', S.cadT ? Math.round(S.cadSum / S.cadT) + ' rpm' : '—', 'pedal turns per minute')}
      ${card('Virtual gear', S.elapsed ? (S.gearSum / S.elapsed).toFixed(1) : '—', S.elapsed ? `avg · range ${S.gearMin}–${S.gearMax} · ${S.shifts} shifts` : '')}</div>
    <div class="st-sec">Time in each power zone <span style="opacity:.6;font-weight:400">(your FTP: ${FTP_W} W)</span></div>${zones}`;
  document.getElementById('stats').style.display = 'flex';
}
{
  const $ = (id) => document.getElementById(id), confirmBox = $('stop-confirm');
  let wasRiding = false;
  $('stop-btn').onclick = () => { if (!rideStarted) return; wasRiding = true; rideStarted = false; confirmBox.style.display = 'flex'; };
  $('stop-no').onclick = () => { confirmBox.style.display = 'none'; rideStarted = wasRiding; };
  $('stop-yes').onclick = () => { confirmBox.style.display = 'none'; showStats(); };
  $('stats-resume').onclick = () => { $('stats').style.display = 'none'; rideStarted = true; };
  $('stats-end').onclick = () => location.reload(); // retour à l'écran d'accueil, nouvelle sortie
}

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
    // Workout logic
    if (currentWorkout && workoutStartTime > 0) {
      const elapsed = (performance.now() - workoutStartTime) / 1000;
      const current = getCurrentInterval(currentWorkout, elapsed);
      
      if (!current) {
        // Workout complete!
        console.log('Workout complete!');
        stopERGMode();
        currentWorkout = null;
        document.getElementById('workout-hud').style.display = 'none';
        // TODO: Show summary with FTP estimate if test
      } else {
        // Update workout HUD
        document.getElementById('interval-name').textContent = current.interval.name;
        document.getElementById('target-watts').textContent = current.currentTarget;
        document.getElementById('actual-watts').textContent = Math.round(state.watts);
        document.getElementById('interval-time').textContent = formatTime(current.intervalRemaining);
        document.getElementById('total-time').textContent = formatTime(current.totalRemaining);
        document.getElementById('next-interval').textContent = current.nextInterval ? current.nextInterval.name : 'Finish';
        
        // Update target power in ERG mode
        if (isERGActive()) {
          updateTargetPower(current.currentTarget);
        }
        
        // Record power/cadence history for FTP test
        powerHistory.push(state.watts || 0);
        cadenceHistory.push(state.cadence || 0);
        
        // Keep only last 60 samples (for failure detection)
        if (powerHistory.length > 60) powerHistory.shift();
        if (cadenceHistory.length > 60) cadenceHistory.shift();
        
        // Check for FTP test failure
        if (currentWorkout.isTest) {
          const failure = detectRampTestFailure(currentWorkout, powerHistory, cadenceHistory, elapsed);
          if (failure.failed) {
            console.log('FTP test failed:', failure.reason);
            const estimatedFTP = calculateEstimatedFTP(powerHistory);
            alert(`Test stopped: ${failure.reason}\n\nEstimated FTP: ${estimatedFTP}W\n\nSave this as your new FTP?`);
            // TODO: Offer to save FTP
            stopERGMode();
            currentWorkout = null;
            document.getElementById('workout-hud').style.display = 'none';
          }
        }
        
        // Draw workout profile
        drawWorkoutProfile(elapsed);
      }
    }
    
    // Physique : P = air + roulement + gravité, sur la pente réelle du GPX (inertie incluse)
    const here = sampleTrack(track, distanceM);
    physV = stepSpeed(physV, state.watts, here.gradePct, dt, here.pos.y);
    hud.speed.textContent = (physV * 3.6).toFixed(1);
    if (rideStarted) { distanceM += physV * dt; recordStats(dt, here); }
    const now = performance.now();
    if (now - lastSent > 1000) { sensors.sendRoute(here.gradePct, here.pos.y); routeGrade = here.gradePct; pushTrainer(); lastSent = now; }
    if (distanceM >= track.length) distanceM = 0; // boucle : retour au départ (Villard-Reculas)
    const { pos, dir, gradePct } = sampleTrack(track, distanceM);
    // même hauteur que la chaussée (buildRoad : max tracé / sol sous l'axe et les bords + 0,40 m)
    let roadY = pos.y;
    if (groundAt) { const nx = -dir.z * 2, nz = dir.x * 2;
      roadY = Math.max(pos.y, groundAt(pos.x, pos.z), groundAt(pos.x + nx, pos.z + nz), groundAt(pos.x - nx, pos.z - nz)); }
    rider.position.set(pos.x, roadY + 0.42, pos.z);
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

// --- Chargement GPX (appelé après sélection de route) ---
function loadRoute() {
  const route = ROUTES[selectedRoute];
  Promise.all([
    fetch(route.gpx).then((r) => { if (!r.ok) throw new Error(`GPX HTTP ${r.status}`); return r.text(); }),
    fetch(route.dem.meta).then((r) => r.json()),
    fetch(route.dem.bin).then((r) => r.arrayBuffer()),
  ])
    .then(([txt, demMeta, demBuf]) => {
      const dem = { meta: demMeta, data: new Int16Array(demBuf) };
      track = buildTrack(parseGpx(txt), 1200);
      console.log(`GPX ${selectedRoute}: ${track.rawCount} raw pts → ${track.pts.length} pts, ${(track.length / 1000).toFixed(2)} km`);
      const terrain = route.setupTerrain(scene, track, dem);
      buildRoad(scene, track, 4, terrain);
      groundAt = terrain.heightAt;
      route.setupAtmosphere(scene, renderer, sun, sunDir);
      updateMinimap = createMinimap(track, 200, terrain.classify, teleportTo, route.zoneColors);
      route.setupDecor(scene, track, terrain);
      const s = sampleTrack(track, 0);
      camPos.set(s.pos.x - s.dir.x * 9, s.pos.y + 4, s.pos.z - s.dir.z * 9);
      
      // Start workout if selected
      if (currentWorkout) {
        console.log('Starting workout:', currentWorkout.name);
        workoutStartTime = performance.now();
        startERGMode().then(success => {
          if (success) {
            console.log('ERG mode activated');
          } else {
            console.warn('ERG mode failed to start');
          }
        });
        drawWorkoutProfileStatic();
      }
    })
    .catch((e) => { console.error('GPX', e); hud.source.textContent = 'GPX not found'; });
}

// Draw workout profile bar chart (static background)
function drawWorkoutProfileStatic() {
  if (!currentWorkout) return;
  
  const canvas = document.getElementById('workout-profile');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const profile = getWorkoutProfile(currentWorkout, FTP_W);
  
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  
  const totalDuration = currentWorkout.totalDuration;
  let x = 0;
  
  profile.forEach(interval => {
    const w = (interval.duration / totalDuration) * width;
    ctx.fillStyle = interval.color;
    ctx.fillRect(x, 0, w, height);
    x += w;
  });
}

// Draw progress marker on workout profile
function drawWorkoutProfile(elapsed) {
  if (!currentWorkout) return;
  
  const canvas = document.getElementById('workout-profile');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Redraw static profile
  drawWorkoutProfileStatic();
  
  // Draw progress line
  const progress = elapsed / currentWorkout.totalDuration;
  const x = progress * width;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
}

// Stop test button handler
const stopTestBtn = document.getElementById('stop-test-btn');
if (stopTestBtn) {
  stopTestBtn.onclick = () => {
    if (currentWorkout && currentWorkout.isTest) {
      const estimatedFTP = calculateEstimatedFTP(powerHistory);
      const save = confirm(`Stopping test early.\n\nEstimated FTP: ${estimatedFTP}W\n\nSave this as your new FTP?`);
      if (save && estimatedFTP) {
        FTP_W = estimatedFTP;
        localStorage.setItem(FTP_KEY, String(FTP_W));
        document.getElementById('ftp').textContent = FTP_W;
        alert(`FTP saved: ${FTP_W}W`);
      }
      stopERGMode();
      currentWorkout = null;
      document.getElementById('workout-hud').style.display = 'none';
    }
  };
}

tick();
