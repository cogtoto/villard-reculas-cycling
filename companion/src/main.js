import { createTrainer } from './trainer.js';
import { createPowerChart, zoneFor } from './chart.js';
import { createHrSensor } from './hr-sensor.js';
import { KeepAwake } from '@capacitor-community/keep-awake';

const $ = (id) => document.getElementById(id);
const log = (m) => { console.log(m); const l = $('log'); l.textContent = (new Date().toLocaleTimeString() + ' ' + m + '\n' + l.textContent).slice(0, 3000); };
const setStatus = (id, text, cls) => { const e = $(id); e.textContent = text; e.className = cls; };

// Load saved PC IP and port (persists across app restarts in WebView localStorage)
// Note: localStorage clears on uninstall, but survives app updates with same signing key
$('ip').value = localStorage.getItem('pcIp') || '';
$('port').value = localStorage.getItem('pcPort') || '8787';

// If IP is loaded, show hint to reconnect
if ($('ip').value) {
  setStatus('pc-status', 'tap "Connect PC" to reconnect', 'off');
}

// ---- WebSocket to PC (server/index.js of velo-virtuel) ----
let ws = null, wantPc = false, retry = null;
const send = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
function connectPc() {
  const ip = $('ip').value.trim(), port = $('port').value.trim() || '8787';
  if (!ip) { setStatus('pc-status', 'enter the PC IP', 'off'); return; }
  localStorage.setItem('pcIp', ip); localStorage.setItem('pcPort', port);
  wantPc = true; clearTimeout(retry);
  if (ws) { ws.onclose = null; ws.close(); }
  setStatus('pc-status', `connecting to ${ip}:${port}…`, 'wait');
  try { ws = new WebSocket(`ws://${ip}:${port}`); } catch (e) { setStatus('pc-status', e.message, 'off'); return; }
  ws.onopen = () => { setStatus('pc-status', `connected ${ip}:${port}`, 'on'); send({ type: 'hello', role: 'companion', device: navigator.userAgent.slice(0, 60) }); $('pc-btn').textContent = 'Reconnect PC'; };
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (Number(m.ftp) > 0) { ftp = Number(m.ftp); $('ftp').value = ftp; localStorage.setItem('vv.ftp', String(ftp)); }
    if (m.type === 'sim' || m.type === 'welcome') { 
      $('grade').textContent = (Number(m.gradePct) || 0).toFixed(1); 
      trainer.setSimulation(Number(m.gradePct) || 0); 
    }
    if (m.type === 'erg') {
      const targetWatts = Number(m.targetWatts) || 0;
      $('grade').textContent = `ERG ${targetWatts}W`;
      trainer.setTargetPower(targetWatts);
    }
  };
  ws.onerror = () => log('PC socket error');
  ws.onclose = () => { setStatus('pc-status', 'disconnected — retrying', 'off'); ws = null; if (wantPc) retry = setTimeout(connectPc, 2000); };
}
$('pc-btn').onclick = connectPc;

// ---- FTP + power chart ----
let ftp = Number(localStorage.getItem('vv.ftp')) || 160; // same key as velo-virtuel, default 160 W
$('ftp').value = ftp;
$('ftp').onchange = () => { const v = Math.round(Number($('ftp').value)); if (v >= 50 && v <= 600) { ftp = v; localStorage.setItem('vv.ftp', String(v)); chart.draw(); } else $('ftp').value = ftp; };
const chart = createPowerChart($('chart'), () => ftp);
const showZone = (w) => { const z = zoneFor(w, ftp), e = $('zone'); e.textContent = z.z; e.style.background = z.bg; e.style.color = z.fg; };

// ---- BLE trainer ----
let last = { watts: 0, cadence: 0, sensor: '', hr: null }; // Added hr field
const trainer = createTrainer({
  onData: (d) => { 
    last.watts = d.watts; 
    last.cadence = d.cadence; 
    last.sensor = d.sensor;
    chart.add(d.watts); 
    showZone(d.watts); 
    $('watts').textContent = Math.round(d.watts); 
    $('cadence').textContent = Math.round(d.cadence); 
    send({ type: 'companion', ...last, ts: Date.now() }); 
  },
  onLog: log,
  onDisconnect: () => { setStatus('ble-status', 'disconnected', 'off'); $('ble-btn').disabled = false; $('ble-btn').textContent = 'Connect HomeTrainer'; },
});
// keepalive (trainer stops notifying at 0 W on some models) so the PC keeps "companion" as source
setInterval(() => { if (trainer.connected || hrSensor.connected) send({ type: 'companion', ...last, ts: Date.now() }); }, 1000);

$('ble-btn').onclick = async () => {
  const b = $('ble-btn'); b.disabled = true; b.textContent = 'Connecting…'; setStatus('ble-status', 'scanning…', 'wait');
  try {
    const r = await trainer.connect();
    setStatus('ble-status', `${r.name}${r.control ? ' (FTMS control)' : ' (power only)'}`, 'on'); b.textContent = '✓ ' + r.name;
  } catch (e) { log('BLE: ' + (e.message || e)); setStatus('ble-status', String(e.message || e).slice(0, 60), 'off'); b.disabled = false; b.textContent = 'Connect HomeTrainer'; }
};

// ---- BLE Heart Rate sensor ----
let lastHrUpdate = 0;
const hrSensor = createHrSensor({
  onData: (d) => {
    lastHrUpdate = Date.now();
    last.hr = d.bpm;
    $('hr-bpm').textContent = d.bpm;
    send({ type: 'companion', ...last, ts: Date.now() });
  },
  onLog: log,
  onDisconnect: () => {
    setStatus('hr-status', 'disconnected', 'off');
    $('hr-btn').disabled = false;
    $('hr-btn').textContent = 'Connect HR Sensor';
    $('hr-bpm').textContent = '--';
    last.hr = null;
  },
});

$('hr-btn').onclick = async () => {
  const b = $('hr-btn');
  b.disabled = true;
  b.textContent = 'Connecting…';
  setStatus('hr-status', 'scanning…', 'wait');
  try {
    const r = await hrSensor.connect();
    setStatus('hr-status', r.name, 'on');
    b.textContent = '✓ ' + r.name;
    // Remember last HR device
    localStorage.setItem('vv.hrDevice', r.name);
  } catch (e) {
    log('HR: ' + (e.message || e));
    setStatus('hr-status', String(e.message || e).slice(0, 60), 'off');
    b.disabled = false;
    b.textContent = 'Connect HR Sensor';
  }
};

// Clear HR if no data for >5s
setInterval(() => {
  if (hrSensor.connected && last.hr && Date.now() - lastHrUpdate > 5000) {
    $('hr-bpm').textContent = '--';
    last.hr = null;
  }
}, 1000);

// ---- Gears ----
for (const [id, delta] of [['gear-up', 1], ['gear-down', -1]]) {
  $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); send({ type: 'shift', delta }); if (navigator.vibrate) navigator.vibrate(20); });
}

if ($('ip').value) connectPc();

// Keep screen awake at JavaScript level (redundant with FLAG_KEEP_SCREEN_ON, but belt-and-braces)
KeepAwake.keepAwake().catch(e => log('KeepAwake unavailable: ' + e.message));
