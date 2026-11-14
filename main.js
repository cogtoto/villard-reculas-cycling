import * as THREE from 'three';
import { parseGpx, buildTrack, sampleTrack } from './gpx.js';
import { stepSpeed } from './physics.js';

// Expose THREE for debug tools
window.THREE = THREE;
import { createMinimap } from './minimap.js';
import { setupSky, addClouds, buildRoad } from './decor.js';
import { addChalets } from './chalets.js';
import { createRider } from './rider.js';
import { createSensors } from './sensors.js';
import { addRoadside } from './roadside.js';
import { buildAlpineTerrain, alpineAtmosphere, installHeightFog, addForest, ZONE_COLORS } from './alpine.js';
import { buildNormandyTerrain, normandyAtmosphere, addNormandyVegetation, addNormandyCows, addNormandyHouses, NORMANDY_ZONE_COLORS } from './normandy.js';
import { addNormandyChurches } from './normandy-churches.js';
import { createFTPRampTest, createSweetSpotWorkout, createExplosiveWorkout, createVariedThresholdWorkout, getCurrentInterval, detectRampTestFailure, calculateEstimatedFTP, getWorkoutProfile, formatTime } from './workouts.js';
import { buildTcx, saveFile, toLatLon } from './export.js';
import { startERGMode, stopERGMode, updateTargetPower, adjustTargetPower, isERGActive, initializeERGMode } from './erg-mode.js';
import { getCoachingMessage, getRampTestMessage, shouldShowMessage, resetCoachingTimer } from './coaching.js';
import { placeVillageSigns, checkSignProximity, resetSignAnnouncements } from './village-signs.js';
import { graphicsSettings, fpsCounter } from './graphics-settings.js';
import { setupLighting } from './sky-system.js';
import { RealTerrainSystem } from './real-terrain.js';

installHeightFog(); // avant toute compilation de shader

// --- Route configuration ---
const ROUTES = {
  villard: {
    name: 'Villard-Reculas (Oisans)',
    description: 'descent + climb',
    gpx: '/villard-reculas.gpx',
    dem: { meta: '/dem-villard.json', bin: '/dem-villard.bin' },
    // realTerrain disabled - using v0.5.11 procedural relief (correct proportions)
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
      console.log('Churches:', addNormandyChurches(scene, track, terrain));
      // Cows disabled (v0.5.7 rendering issue)
      // console.log('Cows:', addNormandyCows(scene, track, terrain));
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
let ftpTestConfirmShown = false; // Prevent multiple prompts
let ftpTestRecoveryTarget = 0; // Store ERG target when showing prompt

// --- FTP & zones de puissance Coggan (modifier ici) ---
const FTP_KEY = 'vv.ftp';
let FTP_W = Number(localStorage.getItem(FTP_KEY)) || 160; // saved locally, default 160 W
let rideStarted = false;
let rideStartTime = 0; // Wall clock time when ride actually started
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
  
  // Graphics quality selector - set to current quality
  const qualitySelect = document.getElementById('graphics-quality');
  qualitySelect.value = graphicsSettings.quality;
  qualitySelect.onchange = () => {
    graphicsSettings.setQuality(qualitySelect.value);
  };
  
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
      } else if (selectedMode === 'varied-threshold') {
        currentWorkout = createVariedThresholdWorkout(FTP_W);
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
    rideStartTime = 0; // Will be set when scene is ready and first frame with track renders
    S.t0 = Date.now(); // Start timestamp for TCX export
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
  hrBpm: document.getElementById('hr-bpm'),
  hrField: document.getElementById('hr-field'),
  speed: document.getElementById('speed'),
  grade: document.getElementById('grade'),
  source: document.getElementById('source'),
  dist: document.getElementById('dist'),
  alt: document.getElementById('alt'),
  rideTime: document.getElementById('ride-time'),
};

function formatRideTime(seconds) {
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- Scène ---
const SKY = 0xa8d0f0;
const scene = new THREE.Scene();

// Placeholder fog and background (will be updated per route)
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 150, 1800);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 8000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Apply graphics settings to renderer
graphicsSettings.applyToRenderer(renderer);

// Lighting will be set up per-route after quality/route selection
let sun = null, sunDirection = null;
let seaMat = null;
let groundAt = null; // hauteur du terrain (anti-caméra dans la pente)
let updateMinimap = null;
let minimapCanvas = null; // Reference to minimap canvas for show/hide
let villageSigns = []; // Village/hamlet road signs

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
addEventListener('keydown', (e) => { 
  if (e.key === '+' || e.key === 'ArrowUp' && e.shiftKey) shift(1); 
  if (e.key === '-' || e.key === 'ArrowDown' && e.shiftKey) shift(-1); 
  // F key toggles FPS counter
  if (e.key === 'f' || e.key === 'F') {
    if (fpsCounter.element) {
      fpsCounter.hide();
    } else {
      fpsCounter.show();
    }
  }
});
// HR management: show field when HR data present, hide after 30s of no data
let lastHrUpdate = 0;
let hrHideTimer = null;

const sensors = createSensors((msg) => {
    state = { ...state, ...msg };
    hud.watts.textContent = Math.round(state.watts);
    { const zn = zoneFor(state.watts || 0), el = document.getElementById('zone');
      el.textContent = zn.z; el.style.background = zn.bg; el.style.color = zn.fg;
      document.getElementById('pctftp').textContent = `(${Math.round(zn.pct)} %)`; }
    hud.cadence.textContent = Math.round(state.cadence);
    hud.source.textContent = state.source || 'ws';
    
    // Handle HR display
    if (msg.hr !== undefined && msg.hr !== null && Number(msg.hr) > 0) {
      lastHrUpdate = Date.now();
      hud.hrBpm.textContent = Math.round(msg.hr);
      hud.hrField.style.display = '';
      if (hrHideTimer) clearTimeout(hrHideTimer);
    }
}, { 
    onLog: (m) => console.log('[ble]', m),
    onShift: (delta) => shift(delta) // Companion app gear shift relay
});
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
  cadSum: 0, cadT: 0, t0: 0, nextSample: 0, samples: [], zones: new Array(7).fill(0), gearSum: 0, gearMin: Infinity, gearMax: -Infinity, shifts: 0 };
function recordStats(dt, here) {
  S.elapsed += dt;
  const v = physV, w = state.watts || 0;
  // Sample 1 Hz for TCX export
  if (S.elapsed >= S.nextSample) {
    S.nextSample = Math.ceil(S.elapsed) + 1;
    const [lat, lon] = toLatLon(track.origin, here.pos.x, here.pos.z);
    S.samples.push({ t: S.t0 + S.elapsed * 1000, lat, lon, alt: here.pos.y, dist: S.dist, w, cad: state.cadence || 0, v });
  }
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
      ${card('Average cadence', S.cadT ? Math.round(S.cadSum / S.cadT) + ' rpm' : '—', 'pedal turns per minute')}</div>
    <div class="st-sec">Time in each power zone <span style="opacity:.6;font-weight:400">(your FTP: ${FTP_W} W)</span></div>${zones}`;
  document.getElementById('stats').style.display = 'flex';
}
{
  const $ = (id) => document.getElementById(id), confirmBox = $('stop-confirm');
  let wasRiding = false;
  let pauseTime = 0;
  let pausedElapsed = 0;
  $('stop-btn').onclick = () => {
    if (!rideStarted) return;
    wasRiding = true;
    rideStarted = false;
    pauseTime = performance.now();
    pausedElapsed = (pauseTime - rideStartTime) / 1000;
    confirmBox.style.display = 'flex';
  };
  $('stop-no').onclick = () => {
    confirmBox.style.display = 'none';
    rideStarted = wasRiding;
    if (rideStarted) {
      // Adjust start time to account for pause duration
      rideStartTime = performance.now() - (pausedElapsed * 1000);
    }
  };
  $('stop-yes').onclick = () => {
    confirmBox.style.display = 'none';
    showStats();
  };
  $('stats-resume').onclick = () => {
    $('stats').style.display = 'none';
    rideStarted = true;
    // Adjust start time to account for pause duration
    rideStartTime = performance.now() - (pausedElapsed * 1000);
  };
  $('stats-end').onclick = () => location.reload(); // retour à l'écran d'accueil, nouvelle sortie
  $('stats-garmin').onclick = async () => {
    const btn = $('stats-garmin'), msg = $('stats-garmin-msg');
    if (S.samples.length < 2) { msg.textContent = 'Ride a little longer first — not enough data yet.'; return; }
    btn.disabled = true; btn.textContent = 'Exporting…';
    const routeName = ROUTES[selectedRoute].name;
    const name = routeName.replace(/[^a-z0-9]+/gi, '_') + '_' + new Date(S.t0).toISOString().slice(0, 10) + '.tcx';
    try {
      // Get current version from package.json or default
      const appVersion = '0.5.13';
      const how = await saveFile(name, buildTcx(S.samples, { name: routeName, version: appVersion }));
      if (how.startsWith('Saved to')) {
        msg.textContent = `✓ ${how} — also shared`;
      } else {
        msg.textContent = how === 'shared' ? '✓ Shared to Garmin Connect / Drive / Email' : '✓ Downloaded — import into Garmin Connect';
      }
      btn.textContent = '✓ Exported'; btn.disabled = false;
    } catch (e) {
      msg.textContent = 'Export failed: ' + e.message;
      btn.textContent = '⬇ Download for Garmin'; btn.disabled = false;
    }
  };
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
        // Also send via sensors (for companion or direct BLE)
        sensors.setTargetPower(current.currentTarget);
        
        // Record power/cadence history for FTP test
        powerHistory.push(state.watts || 0);
        cadenceHistory.push(state.cadence || 0);
        
        // Keep only last 60 samples (for failure detection)
        if (powerHistory.length > 60) powerHistory.shift();
        if (cadenceHistory.length > 60) cadenceHistory.shift();
        
        // Coaching messages
        const elapsedInInterval = current.interval.duration - current.intervalRemaining;
        const nextIntervalIn = current.intervalRemaining; // Time until next interval
        const timing = shouldShowMessage(performance.now(), current.index, nextIntervalIn);
        
        if (timing.show) {
          let message = null;
          
          // Priority 1: Countdown messages (before sprints)
          if (timing.reason === 'countdown') {
            const messages = getCoachingMessage(currentWorkout, current, state.watts, elapsedInInterval, nextIntervalIn);
            message = messages.countdown;
          }
          // Priority 2: Interval start messages
          else if (timing.reason === 'intervalStart') {
            const messages = getCoachingMessage(currentWorkout, current, state.watts, elapsedInInterval, nextIntervalIn);
            message = messages.intervalStart;
          }
          // Priority 3: Regular coaching (performance, motivation, technique)
          else if (timing.reason === 'regular') {
            const messages = getCoachingMessage(currentWorkout, current, state.watts, elapsedInInterval, nextIntervalIn);
            
            // For ramp test, use special messages
            if (currentWorkout.isTest && current.interval.type === 'ramp') {
              message = getRampTestMessage(elapsed, powerHistory);
            } else {
              // Rotate through different message types
              const types = ['performance', 'motivation', 'technique'];
              const random = Math.random();
              if (random < 0.5 && messages.performance) {
                message = messages.performance;
              } else if (random < 0.8 && messages.motivation) {
                message = messages.motivation;
              } else if (messages.technique) {
                message = messages.technique;
              }
            }
          }
          
          if (message && !timing.noTimerUpdate) {
            showCoachingMessage(message);
          } else if (message && timing.noTimerUpdate) {
            // Countdown messages - show but don't reset timer
            showCoachingMessage(message, true);
          }
        }
        
        // Check for FTP test low power (show confirmation, don't auto-stop)
        if (currentWorkout.isTest && !ftpTestConfirmShown) {
          const failure = detectRampTestFailure(currentWorkout, powerHistory, cadenceHistory, elapsed);
          if (failure.shouldPrompt) {
            console.log('FTP test low power detected:', failure.reason);
            ftpTestConfirmShown = true;
            ftpTestRecoveryTarget = current.currentTarget;
            // Drop ERG target to easy level while prompting
            sensors.setTargetPower(60);
            showFTPTestConfirm();
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
    if (rideStarted) {
      // Initialize ride start time on first frame after scene loads
      if (rideStartTime === 0) {
        rideStartTime = performance.now();
      }
      distanceM += physV * dt;
      recordStats(dt, here);
    }
    // Update timer display using wall clock time for accuracy
    if (rideStartTime > 0) {
      const elapsedWallClock = (performance.now() - rideStartTime) / 1000;
      hud.rideTime.textContent = formatRideTime(elapsedWallClock);
    } else {
      hud.rideTime.textContent = '00:00';
    }
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
    
    // Check for village signs
    if (villageSigns.length > 0) {
      const signCheck = checkSignProximity(pos, villageSigns, distanceM);
      if (signCheck.shouldShow) {
        showCoachingMessage(signCheck.message, false);
      }
    }
    
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
    if (sun && sunDirection) {
      sun.position.set(pos.x + sunDirection.x * 100, pos.y + sunDirection.y * 100, pos.z + sunDirection.z * 100);
      sun.target.position.set(pos.x, pos.y, pos.z);
    }
  }
  
  // Update sky dome and clouds to follow camera
  if (window._skyDome) {
    window._skyDome.position.copy(camera.position);
  }
  if (window._skyClouds) {
    for (const cloud of window._skyClouds) {
      if (cloud.userData.offset) {
        cloud.position.set(
          camera.position.x + cloud.userData.offset.x,
          camera.position.y + cloud.userData.offset.y,
          camera.position.z + cloud.userData.offset.z
        );
      }
    }
  }
  
  if (seaMat) seaMat.uniforms.uTime.value = clock.elapsedTime;
  
  // Check HR staleness: show "--" after 5s, hide after 30s
  if (lastHrUpdate > 0) {
    const hrAge = Date.now() - lastHrUpdate;
    if (hrAge > 5000 && hud.hrBpm.textContent !== '--') {
      hud.hrBpm.textContent = '--';
      if (!hrHideTimer) {
        hrHideTimer = setTimeout(() => {
          hud.hrField.style.display = 'none';
          hrHideTimer = null;
          lastHrUpdate = 0;
        }, 30000);
      }
    }
  }
  
  renderer.render(scene, camera);
  
  // Update FPS counter if visible
  fpsCounter.update();
  
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
      
      // Setup lighting based on quality and route type
      const preset = graphicsSettings.getPreset();
      const lighting = setupLighting(scene, renderer, preset.skyType, selectedRoute);
      sun = lighting.sun;
      sunDirection = lighting.sunDirection;
      
      // CRITICAL: Call route-specific atmosphere setup FIRST (sky dome, clouds, fog)
      // This must run before any other fog setup so the route's blue fog isn't overwritten
      if (route.setupAtmosphere) {
        route.setupAtmosphere(scene, renderer, sun, sunDirection);
      }
      
      // Update camera far plane
      camera.far = graphicsSettings.getCameraFar();
      camera.updateProjectionMatrix();
      
      // Use procedural terrain (v0.5.11 style - correct relief proportions)
      const terrain = route.setupTerrain(scene, track, dem);
      
      buildRoad(scene, track, 4, terrain, false);
      groundAt = terrain.heightAt;
      
      // Create minimap (works with real or procedural terrain)
      const classifyFn = terrain.classify || (() => 'flat');
      updateMinimap = createMinimap(track, 200, classifyFn, teleportTo, route.zoneColors);
      minimapCanvas = updateMinimap.canvas; // Store reference for show/hide
      
      // Hide minimap in workout modes (to avoid overlap with power indicators)
      if (selectedMode !== 'free') {
        minimapCanvas.style.display = 'none';
        console.log('Minimap hidden: workout mode active');
      }
      
      // Only add procedural decor if NOT using real terrain
      if (!route.realTerrain) {
        route.setupDecor(scene, track, terrain);
      } else {
        console.log('Skipping procedural decor (real terrain active)');
        // Skip trees/chalets/roadside on real terrain (ortho shows forests already)
      }
      
      // Load and place village signs
      const villageFile = selectedRoute === 'normandy' ? '/normandy-villages.json' : '/villard-villages.json';
      console.log(`Loading village data from: ${villageFile}`);
      fetch(villageFile)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(villagesData => {
          console.log(`Village data loaded: ${villagesData.length} entries`);
          villageSigns = placeVillageSigns(scene, track, villagesData, terrain.heightAt);
          console.log(`Placed ${villageSigns.length} village signs`);
          resetSignAnnouncements(villageSigns);
        })
        .catch(err => console.error('Village signs not loaded:', err));
      
      const s = sampleTrack(track, 0);
      camPos.set(s.pos.x - s.dir.x * 9, s.pos.y + 4, s.pos.z - s.dir.z * 9);
      
      // Start workout if selected
      if (currentWorkout) {
        console.log('Starting workout:', currentWorkout.name);
        workoutStartTime = performance.now();
        resetCoachingTimer(); // Initialize coaching message timing
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
  
  // Build compact legend showing each segment's power target
  const legendDiv = document.getElementById('workout-legend');
  if (legendDiv) {
    const items = [];
    const seen = new Map(); // Track type+target combinations to avoid duplicates
    let rampSummaryAdded = false;
    
    // Collect all ramp stages first if this is a ramp test
    const rampIntervals = currentWorkout.intervals.filter(i => i.type === 'ramp');
    
    // Show each distinct interval type with its target
    currentWorkout.intervals.forEach((interval, idx) => {
      const prof = profile[idx];
      if (!prof) return;
      
      let label, key;
      
      if (interval.targetStart !== undefined && interval.targetEnd !== undefined) {
        // Progressive (warmup/cooldown)
        const startPct = Math.round((interval.targetStart / FTP_W) * 100);
        const endPct = Math.round((interval.targetEnd / FTP_W) * 100);
        label = `${startPct}–${endPct}% (${Math.round(interval.targetStart)}–${Math.round(interval.targetEnd)}W)`;
        key = `${interval.type}-${interval.targetStart}-${interval.targetEnd}`;
      } else if (interval.target !== undefined) {
        // Fixed target
        const pct = Math.round((interval.target / FTP_W) * 100);
        const watts = Math.round(interval.target);
        label = `${pct}% (${watts}W)`;
        key = `${interval.type}-${interval.target}`;
      } else {
        return;
      }
      
      // For ramp stages, show compact summary once instead of listing all
      if (interval.type === 'ramp') {
        if (!rampSummaryAdded && rampIntervals.length > 0) {
          const firstRamp = rampIntervals[0];
          const lastRamp = rampIntervals[rampIntervals.length - 1];
          const firstPct = Math.round((firstRamp.target / FTP_W) * 100);
          const lastPct = Math.round((lastRamp.target / FTP_W) * 100);
          const summary = `<span style="display:inline-block;margin:2px 0"><span style="display:inline-block;width:8px;height:8px;background:${prof.color};border-radius:1px;margin-right:3px;vertical-align:middle"></span><span style="font-weight:600">Ramp:</span> ${firstPct}%→${lastPct}% (${Math.round(firstRamp.target)}W→${Math.round(lastRamp.target)}W, +20W/min)</span>`;
          items.push(summary);
          rampSummaryAdded = true;
        }
        return; // Skip individual ramp stages
      }
      
      // Skip if we've already shown this type+target combination
      if (seen.has(key)) return;
      seen.set(key, true);
      
      const type = interval.type === 'warmup' ? 'Warm' : 
                   interval.type === 'cooldown' ? 'Cool' :
                   interval.type === 'recovery' ? 'Rec' :
                   interval.type === 'work' ? 'Work' : interval.type;
      
      items.push(`<span style="display:inline-block;margin:2px 0"><span style="display:inline-block;width:8px;height:8px;background:${prof.color};border-radius:1px;margin-right:3px;vertical-align:middle"></span><span style="font-weight:600">${type}:</span> ${label}</span>`);
    });
    
    legendDiv.innerHTML = items.join(' · ');
  }
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

// Show coaching message with auto-fade
let coachingTimeout = null;
function showCoachingMessage(message, isCountdown = false) {
  const banner = document.getElementById('coaching-message');
  if (!banner) return;
  
  // Clear any existing timeout
  if (coachingTimeout) {
    clearTimeout(coachingTimeout);
    coachingTimeout = null;
  }
  
  // Remove fade classes
  banner.classList.remove('fade-out', 'fade-in');
  
  // Set message and show
  banner.textContent = message;
  banner.style.visibility = 'visible';
  banner.style.opacity = '1';
  
  // Trigger fade-in animation
  setTimeout(() => {
    banner.classList.add('fade-in');
  }, 10);
  
  // Auto-fade after delay (shorter for countdown messages)
  const duration = isCountdown ? 2000 : 4000;
  coachingTimeout = setTimeout(() => {
    banner.classList.remove('fade-in');
    banner.classList.add('fade-out');
    setTimeout(() => {
      banner.style.visibility = 'hidden';
      banner.style.opacity = '0';
      banner.classList.remove('fade-out');
    }, 500); // Match animation duration
  }, duration);
}

// Show FTP test confirmation dialog
function showFTPTestConfirm() {
  document.getElementById('ftp-test-confirm-modal').style.display = 'flex';
}

// Hide FTP test confirmation dialog
function hideFTPTestConfirm() {
  document.getElementById('ftp-test-confirm-modal').style.display = 'none';
}

// Show FTP test results screen
function showFTPResults(estimatedFTP, peak1MinPower, reason = 'Test complete') {
  const oldFTP = FTP_W;
  const diff = estimatedFTP - oldFTP;
  const diffSign = diff > 0 ? '+' : '';
  
  // Update modal values
  document.getElementById('ftp-new-value').textContent = `${estimatedFTP}W`;
  document.getElementById('ftp-old-value').textContent = `${oldFTP}W`;
  document.getElementById('ftp-diff-value').textContent = `${diffSign}${diff}W`;
  document.getElementById('ftp-diff-value').style.color = diff > 0 ? '#27ae60' : diff < 0 ? '#e74c3c' : '#95a5a6';
  document.getElementById('ftp-peak-value').textContent = `${peak1MinPower}W`;
  
  // Show coaching message
  let message = `Test complete! Estimated FTP: ${estimatedFTP}W`;
  if (diff > 0) {
    message = `🎉 Great job! New FTP: ${estimatedFTP}W (+${diff}W improvement!)`;
  } else if (diff < 0) {
    message = `FTP estimated at ${estimatedFTP}W (${diff}W from previous)`;
  }
  showCoachingMessage(message, false);
  
  // Show modal
  document.getElementById('ftp-results-modal').style.display = 'flex';
  
  // Stop ERG and hide workout HUD
  stopERGMode();
  document.getElementById('workout-hud').style.display = 'none';
}

// FTP Test Confirmation dialog button handlers
const ftpTestEndBtn = document.getElementById('ftp-test-end-btn');
const ftpTestContinueBtn = document.getElementById('ftp-test-continue-btn');

if (ftpTestEndBtn) {
  ftpTestEndBtn.onclick = () => {
    hideFTPTestConfirm();
    // End the test and calculate FTP
    const estimatedFTP = calculateEstimatedFTP(powerHistory);
    const peak1MinPower = Math.round(Math.max(...powerHistory.slice(-60)));
    showFTPResults(estimatedFTP, peak1MinPower, 'Test ended by user');
  };
}

if (ftpTestContinueBtn) {
  ftpTestContinueBtn.onclick = () => {
    hideFTPTestConfirm();
    // Re-arm the prompt for next time power drops
    ftpTestConfirmShown = false;
    // Resume ERG target
    if (ftpTestRecoveryTarget > 0) {
      sensors.setTargetPower(ftpTestRecoveryTarget);
    }
    showCoachingMessage('Test resumed — keep pushing!', false);
  };
}

// FTP Results modal button handlers
const ftpSaveBtn = document.getElementById('ftp-save-btn');
const ftpKeepBtn = document.getElementById('ftp-keep-btn');

if (ftpSaveBtn) {
  ftpSaveBtn.onclick = () => {
    const newFTP = parseInt(document.getElementById('ftp-new-value').textContent);
    FTP_W = newFTP;
    localStorage.setItem(FTP_KEY, String(FTP_W));
    document.getElementById('ftp').textContent = FTP_W;
    document.getElementById('ftp-results-modal').style.display = 'none';
    showCoachingMessage(`✓ FTP saved: ${FTP_W}W`, false);
    currentWorkout = null;
  };
}

if (ftpKeepBtn) {
  ftpKeepBtn.onclick = () => {
    document.getElementById('ftp-results-modal').style.display = 'none';
    showCoachingMessage('FTP unchanged - keeping current value', false);
    currentWorkout = null;
  };
}

// Stop test button handler
const stopTestBtn = document.getElementById('stop-test-btn');
if (stopTestBtn) {
  stopTestBtn.onclick = () => {
    if (currentWorkout && currentWorkout.isTest) {
      const estimatedFTP = calculateEstimatedFTP(powerHistory);
      const peak1MinPower = Math.round(Math.max(...powerHistory.slice(-60)));
      showFTPResults(estimatedFTP, peak1MinPower, 'Test stopped early');
    }
  };
}

tick();
