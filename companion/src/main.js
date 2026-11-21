import { createTrainer } from './trainer.js';
import { createPowerChart, zoneFor } from './chart.js';
import { createHrSensor, classifyBleError, mergeHrCandidates, formatHrDeviceLabel, openHrFixSettings, HR_SCAN_DURATION_MS } from './hr-sensor.js';
import { bleCardView, formatConnectedStatus } from './ble-card-view.js';
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

function applyBleCard(els, view) {
  els.scanBlock.hidden = view.scanHidden;
  els.bar.hidden = view.barHidden;
  if (view.statusLine) els.barLine.textContent = view.statusLine;
  if (view.scanHidden) {
    els.list.hidden = true;
    if (els.hint) { els.hint.hidden = true; els.hint.textContent = ''; }
    if (els.settings) els.settings.hidden = true;
  } else if (els.list && view.listHidden && els.list.childElementCount === 0) {
    els.list.hidden = true;
  }
}

const trainerEls = {
  scanBlock: $('ble-scan-block'),
  bar: $('ble-connected'),
  barLine: $('ble-connected-line'),
  list: $('ble-list'),
  hint: $('ble-hint'),
  settings: $('ble-settings-btn'),
  btn: $('ble-btn'),
  status: 'ble-status',
};
const hrEls = {
  scanBlock: $('hr-scan-block'),
  bar: $('hr-connected'),
  barLine: $('hr-connected-line'),
  list: $('hr-list'),
  hint: $('hr-hint'),
  settings: $('hr-settings-btn'),
  btn: $('hr-btn'),
  status: 'hr-status',
};

function escapeHtml(s) {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

function renderDeviceList(els, foundMap, onPick) {
  const items = mergeHrCandidates({
    connected: [...foundMap.values()].filter((d) => d.connected),
    bonded: [...foundMap.values()].filter((d) => d.bonded && !d.connected),
    scanned: [...foundMap.values()].filter((d) => !d.connected && !d.bonded),
  });
  els.list.hidden = items.length === 0;
  els.list.innerHTML = '';
  for (const d of items) {
    const b = document.createElement('button');
    b.type = 'button';
    const label = formatHrDeviceLabel(d);
    b.innerHTML = `${escapeHtml(label)}${d.deviceId ? `<small>${escapeHtml(d.deviceId)}</small>` : ''}`;
    b.onclick = () => onPick(d);
    els.list.appendChild(b);
  }
}

function rememberDevice(foundMap, dev) {
  const key = String(dev.deviceId || '').toLowerCase();
  if (!key) return;
  const prev = foundMap.get(key) || {};
  foundMap.set(key, {
    deviceId: dev.deviceId,
    name: (dev.name && String(dev.name).trim()) || prev.name || '',
    connected: !!(dev.connected || prev.connected),
    bonded: !!(dev.bonded || prev.bonded),
  });
}

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
  onDisconnect: () => { if (!ignoreTrainerDrop) showTrainerDisconnected(); },
});

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
  onDisconnect: () => { if (!ignoreHrDrop) showHrDisconnected(); },
});

// keepalive (trainer stops notifying at 0 W on some models) so the PC keeps "companion" as source
setInterval(() => { if (trainer.connected || hrSensor.connected) send({ type: 'companion', ...last, ts: Date.now() }); }, 1000);

const defaultHrHint = 'Wear the strap, turn Location on, allow Nearby devices, and disconnect the strap from any watch or other app first.';
let lastHrError = null, lastBleError = null;
let hrScanTimer = null, bleScanTimer = null;
let hrFound = new Map(), bleFound = new Map();
let hrScanning = false, bleScanning = false;
let ignoreTrainerDrop = false, ignoreHrDrop = false;

function showHint(els, text, isError = false) {
  if (!els.hint) return;
  els.hint.textContent = text || '';
  els.hint.className = isError ? 'hint error' : 'hint';
  els.hint.hidden = !text;
}

function showSettings(els, code, store) {
  store.code = code;
  const label = { permission: 'Open app settings', 'bluetooth-off': 'Turn Bluetooth on', 'location-off': 'Turn Location on' }[code];
  if (label) { els.settings.textContent = label; els.settings.hidden = false; }
  else { els.settings.hidden = true; }
}

function showTrainerConnected(name, control) {
  const label = `${name}${control ? ' (FTMS control)' : ' (power only)'}`;
  applyBleCard(trainerEls, bleCardView({ phase: 'connected', kind: 'Trainer', name: label, deviceCount: bleFound.size }));
  setStatus('ble-status', label, 'on');
}

function showTrainerDisconnected() {
  applyBleCard(trainerEls, bleCardView({ phase: bleFound.size ? 'pick' : 'idle', kind: 'Trainer', deviceCount: bleFound.size }));
  setStatus('ble-status', 'disconnected', 'off');
  trainerEls.btn.disabled = false;
  trainerEls.btn.textContent = bleFound.size ? 'Scan again' : 'Scan for HomeTrainer';
  renderDeviceList(trainerEls, bleFound, connectTrainerDevice);
  trainerEls.list.hidden = bleFound.size === 0;
}

function showHrConnected(name) {
  applyBleCard(hrEls, bleCardView({ phase: 'connected', kind: 'HR', name, deviceCount: hrFound.size }));
  setStatus('hr-status', name, 'on');
}

function showHrDisconnected() {
  $('hr-bpm').textContent = '--';
  last.hr = null;
  applyBleCard(hrEls, bleCardView({ phase: hrFound.size ? 'pick' : 'idle', kind: 'HR', deviceCount: hrFound.size }));
  setStatus('hr-status', 'disconnected', 'off');
  hrEls.btn.disabled = false;
  hrEls.btn.textContent = hrFound.size ? 'Scan again' : 'Scan for HR Sensor';
  if (!hrFound.size) showHint(hrEls, defaultHrHint);
  renderDeviceList(hrEls, hrFound, connectHrDevice);
  hrEls.list.hidden = hrFound.size === 0;
}

async function stopBleScanUi() {
  if (bleScanTimer) { clearTimeout(bleScanTimer); bleScanTimer = null; }
  bleScanning = false;
  try { await trainer.stopScan(); } catch { /* ignore */ }
}

async function stopHrScanUi() {
  if (hrScanTimer) { clearTimeout(hrScanTimer); hrScanTimer = null; }
  hrScanning = false;
  try { await hrSensor.stopScan(); } catch { /* ignore */ }
}

async function connectTrainerDevice(dev) {
  await stopBleScanUi();
  trainerEls.btn.disabled = true;
  trainerEls.btn.textContent = 'Connecting…';
  setStatus('ble-status', 'connecting…', 'wait');
  showHint(trainerEls, `Connecting to ${dev.name || dev.deviceId}…`);
  showSettings(trainerEls, null, { set code(v) { lastBleError = v; } });
  try {
    const r = await trainer.connectTo(dev.deviceId, dev.name);
    showTrainerConnected(r.name, r.control);
  } catch (e) {
    const info = classifyBleError(e);
    log('BLE: ' + info.message);
    showTrainerDisconnected();
    setStatus('ble-status', info.message.slice(0, 80), 'off');
    showHint(trainerEls, info.message, true);
    showSettings(trainerEls, info.code, { set code(v) { lastBleError = v; } });
  }
}

async function connectHrDevice(dev) {
  await stopHrScanUi();
  hrEls.btn.disabled = true;
  hrEls.btn.textContent = 'Connecting…';
  setStatus('hr-status', 'connecting…', 'wait');
  showHint(hrEls, `Connecting to ${dev.name || dev.deviceId}…`);
  showSettings(hrEls, null, { set code(v) { lastHrError = v; } });
  try {
    const r = await hrSensor.connectTo(dev.deviceId, dev.name);
    showHrConnected(r.name);
    localStorage.setItem('vv.hrDevice', r.name);
  } catch (e) {
    const info = classifyBleError(e);
    log('HR: ' + info.message);
    showHrDisconnected();
    setStatus('hr-status', info.message.slice(0, 80), 'off');
    showHint(hrEls, info.message, true);
    showSettings(hrEls, info.code, { set code(v) { lastHrError = v; } });
  }
}

async function startDeviceScan({ kind, sensor, els, foundRef, setFound, scanningRef, setScanning, timerRef, setTimer, onPick, emptyError, scanningHint, pickHint }) {
  if (scanningRef()) {
    await (kind === 'HR' ? stopHrScanUi() : stopBleScanUi());
    els.btn.disabled = false;
    els.btn.textContent = 'Scan again';
    if (foundRef().size === 0) {
      const info = classifyBleError(new Error(emptyError));
      setStatus(els.status, 'none found', 'off');
      showHint(els, info.message, true);
    } else {
      setStatus(els.status, 'pick a device', 'wait');
      showHint(els, pickHint);
      renderDeviceList(els, foundRef(), onPick);
    }
    return;
  }
  await (kind === 'HR' ? stopHrScanUi() : stopBleScanUi());
  setFound(new Map());
  els.list.innerHTML = '';
  els.list.hidden = true;
  els.btn.disabled = true;
  els.btn.textContent = 'Scanning…';
  setStatus(els.status, 'scanning…', 'wait');
  showHint(els, scanningHint);
  showSettings(els, null, { set code(v) {} });
  applyBleCard(els, bleCardView({ phase: 'scanning', kind, deviceCount: 0 }));
  try {
    const known = await sensor.listKnownDevices();
    const map = new Map();
    known.forEach((d) => rememberDevice(map, d));
    setFound(map);
    renderDeviceList(els, map, onPick);
    await sensor.startScan((dev) => {
      rememberDevice(map, dev);
      setFound(map);
      renderDeviceList(els, map, onPick);
    });
    setScanning(true);
    setTimer(setTimeout(async () => {
      await (kind === 'HR' ? stopHrScanUi() : stopBleScanUi());
      els.btn.disabled = false;
      els.btn.textContent = 'Scan again';
      if (foundRef().size === 0) {
        const info = classifyBleError(new Error(emptyError));
        setStatus(els.status, 'none found', 'off');
        showHint(els, info.message, true);
      } else {
        setStatus(els.status, 'pick a device', 'wait');
        showHint(els, pickHint);
      }
    }, HR_SCAN_DURATION_MS));
    els.btn.disabled = false;
    els.btn.textContent = 'Stop scan';
  } catch (e) {
    const info = classifyBleError(e);
    log(`${kind}: ` + info.message);
    setStatus(els.status, info.message.slice(0, 80), 'off');
    showHint(els, info.message, true);
    showSettings(els, info.code, { set code(v) { if (kind === 'HR') lastHrError = v; else lastBleError = v; } });
    els.btn.disabled = false;
    els.btn.textContent = kind === 'HR' ? 'Scan for HR Sensor' : 'Scan for HomeTrainer';
  }
}

$('ble-btn').onclick = () => startDeviceScan({
  kind: 'Trainer',
  sensor: trainer,
  els: trainerEls,
  foundRef: () => bleFound,
  setFound: (m) => { bleFound = m; },
  scanningRef: () => bleScanning,
  setScanning: (v) => { bleScanning = v; },
  timerRef: () => bleScanTimer,
  setTimer: (v) => { bleScanTimer = v; },
  onPick: connectTrainerDevice,
  emptyError: 'No device found.',
  scanningHint: 'Scanning for home trainers…',
  pickHint: 'Select your home trainer from the list.',
});

$('hr-btn').onclick = () => startDeviceScan({
  kind: 'HR',
  sensor: hrSensor,
  els: hrEls,
  foundRef: () => hrFound,
  setFound: (m) => { hrFound = m; },
  scanningRef: () => hrScanning,
  setScanning: (v) => { hrScanning = v; },
  timerRef: () => hrScanTimer,
  setTimer: (v) => { hrScanTimer = v; },
  onPick: connectHrDevice,
  emptyError: 'No heart-rate sensor found',
  scanningHint: 'Scanning for nearby sensors and listing paired / already-connected devices…',
  pickHint: 'Select your heart-rate strap from the list. If it is missing, disconnect it from any watch and scan again.',
});

$('ble-change').onclick = async () => {
  ignoreTrainerDrop = true;
  try { await trainer.disconnect(); } catch { /* reopen list even if already dropped */ }
  ignoreTrainerDrop = false;
  showTrainerDisconnected();
  if (!bleScanning) $('ble-btn').click();
};
$('ble-disconnect').onclick = async () => {
  ignoreTrainerDrop = true;
  try { await trainer.disconnect(); } catch { /* ignore */ }
  ignoreTrainerDrop = false;
  showTrainerDisconnected();
};
$('hr-change').onclick = async () => {
  ignoreHrDrop = true;
  try { await hrSensor.disconnect(); } catch { /* reopen list even if already dropped */ }
  ignoreHrDrop = false;
  showHrDisconnected();
  if (!hrScanning) $('hr-btn').click();
};
$('hr-disconnect').onclick = async () => {
  ignoreHrDrop = true;
  try { await hrSensor.disconnect(); } catch { /* ignore */ }
  ignoreHrDrop = false;
  showHrDisconnected();
};

$('ble-settings-btn').onclick = async () => {
  try { await openHrFixSettings(lastBleError); }
  catch (e) { log('Trainer settings: ' + (e.message || e)); }
};
$('hr-settings-btn').onclick = async () => {
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
