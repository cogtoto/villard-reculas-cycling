import { createTrainer } from './trainer.js';
import { createPowerChart, zoneFor } from './chart.js';
import { createHrSensor, classifyBleError, mergeHrCandidates, formatHrDeviceLabel, openHrFixSettings, HR_SCAN_DURATION_MS } from './hr-sensor.js';
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
  try { await hrSensor.stopScan(); } catch { /* ignore */ }
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
    $('hr-btn').textContent = 'Scan for HR Sensor';
    $('hr-bpm').textContent = '--';
    last.hr = null;
  },
});

const hrHint = $('hr-hint');
const hrList = $('hr-list');
const hrSettings = $('hr-settings-btn');
const defaultHrHint = 'Wear the strap, turn Location on, allow Nearby devices, and disconnect the strap from any watch or other app first.';
let hrScanTimer = null;
let hrFound = new Map();
let lastHrError = null;
let hrScanning = false;

function showHrHint(text, isError = false) {
  hrHint.textContent = text || defaultHrHint;
  hrHint.className = isError ? 'hint error' : 'hint';
}

function showHrSettings(code) {
  lastHrError = code;
  const label = { 'permission': 'Open app settings', 'bluetooth-off': 'Turn Bluetooth on', 'location-off': 'Turn Location on' }[code];
  if (label) { hrSettings.textContent = label; hrSettings.hidden = false; }
  else { hrSettings.hidden = true; }
}

function renderHrList() {
  const items = mergeHrCandidates({
    connected: [...hrFound.values()].filter((d) => d.connected),
    bonded: [...hrFound.values()].filter((d) => d.bonded && !d.connected),
    scanned: [...hrFound.values()].filter((d) => !d.connected && !d.bonded),
  });
  hrList.hidden = items.length === 0;
  hrList.innerHTML = '';
  for (const d of items) {
    const b = document.createElement('button');
    b.type = 'button';
    const label = formatHrDeviceLabel(d);
    b.innerHTML = `${label.replace(/[<>&]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}${d.deviceId ? `<small>${d.deviceId}</small>` : ''}`;
    b.onclick = () => connectHrDevice(d);
    hrList.appendChild(b);
  }
}

function rememberHrDevice(dev) {
  const key = String(dev.deviceId || '').toLowerCase();
  if (!key) return;
  const prev = hrFound.get(key) || {};
  hrFound.set(key, {
    deviceId: dev.deviceId,
    name: (dev.name && String(dev.name).trim()) || prev.name || '',
    connected: !!(dev.connected || prev.connected),
    bonded: !!(dev.bonded || prev.bonded),
  });
  renderHrList();
}

async function stopHrScanUi() {
  if (hrScanTimer) { clearTimeout(hrScanTimer); hrScanTimer = null; }
  hrScanning = false;
  try { await hrSensor.stopScan(); } catch { /* ignore */ }
}

async function connectHrDevice(dev) {
  await stopHrScanUi();
  const b = $('hr-btn');
  b.disabled = true;
  b.textContent = 'Connecting…';
  setStatus('hr-status', 'connecting…', 'wait');
  showHrHint(`Connecting to ${dev.name || dev.deviceId}…`);
  showHrSettings(null);
  try {
    const r = await hrSensor.connectTo(dev.deviceId, dev.name);
    setStatus('hr-status', r.name, 'on');
    b.textContent = '✓ ' + r.name;
    b.disabled = true;
    hrList.hidden = true;
    showHrHint('');
    localStorage.setItem('vv.hrDevice', r.name);
  } catch (e) {
    const info = classifyBleError(e);
    log('HR: ' + info.message);
    setStatus('hr-status', info.message.slice(0, 80), 'off');
    showHrHint(info.message, true);
    showHrSettings(info.code);
    b.disabled = false;
    b.textContent = 'Scan for HR Sensor';
  }
}

$('hr-btn').onclick = async () => {
  const b = $('hr-btn');
  if (hrScanning) {
    await stopHrScanUi();
    b.disabled = false;
    b.textContent = 'Scan again';
    if (hrFound.size === 0) {
      const info = classifyBleError(new Error('No heart-rate sensor found'));
      setStatus('hr-status', 'none found', 'off');
      showHrHint(info.message, true);
    } else {
      setStatus('hr-status', 'pick a sensor', 'wait');
      showHrHint('Select your heart-rate strap from the list. If it is missing, disconnect it from any watch and scan again.');
    }
    return;
  }
  await stopHrScanUi();
  hrFound = new Map();
  hrList.innerHTML = '';
  hrList.hidden = true;
  b.disabled = true;
  b.textContent = 'Scanning…';
  setStatus('hr-status', 'scanning…', 'wait');
  showHrHint('Scanning for nearby sensors and listing paired / already-connected devices…');
  showHrSettings(null);
  try {
    const known = await hrSensor.listKnownDevices();
    known.forEach(rememberHrDevice);
    await hrSensor.startScan((dev) => rememberHrDevice(dev));
    hrScanning = true;
    hrScanTimer = setTimeout(async () => {
      await stopHrScanUi();
      b.disabled = false;
      b.textContent = 'Scan again';
      if (hrFound.size === 0) {
        const info = classifyBleError(new Error('No heart-rate sensor found'));
        setStatus('hr-status', 'none found', 'off');
        showHrHint(info.message, true);
      } else {
        setStatus('hr-status', 'pick a sensor', 'wait');
        showHrHint('Select your heart-rate strap from the list. If it is missing, disconnect it from any watch and scan again.');
      }
    }, HR_SCAN_DURATION_MS);
    b.disabled = false;
    b.textContent = 'Stop scan';
  } catch (e) {
    const info = classifyBleError(e);
    log('HR: ' + info.message);
    setStatus('hr-status', info.message.slice(0, 80), 'off');
    showHrHint(info.message, true);
    showHrSettings(info.code);
    b.disabled = false;
    b.textContent = 'Scan for HR Sensor';
  }
};

hrSettings.onclick = async () => {
  try { await openHrFixSettings(lastHrError); }
  catch (e) { log('HR settings: ' + (e.message || e)); }
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
