// BLE Heart Rate sensor — standard HR Service 0x180D
import { BleClient, ScanMode } from '@capacitor-community/bluetooth-le';

export const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
export const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

// Many straps do not put 0x180D in the advertisement, so the scan must not
// filter on that service UUID. optionalServices is for the Web Bluetooth picker.
export const HR_SCAN_OPTIONS = {
  optionalServices: [HR_SERVICE],
  allowDuplicates: false,
  scanMode: ScanMode.SCAN_MODE_LOW_LATENCY,
};

export const HR_SCAN_DURATION_MS = 20000;

/**
 * Normalize a notification payload to a DataView that respects byteOffset.
 * Capacitor may pass a DataView or TypedArray that is a slice of a larger buffer.
 */
export function toHrDataView(value) {
  if (!value) return null;
  if (value instanceof DataView) return value;
  if (value.buffer instanceof ArrayBuffer) {
    const offset = Number.isInteger(value.byteOffset) ? value.byteOffset : 0;
    const length = Number.isInteger(value.byteLength) ? value.byteLength : (value.buffer.byteLength - offset);
    return new DataView(value.buffer, offset, length);
  }
  return null;
}

/**
 * Parse Heart Rate Measurement characteristic (0x2A37)
 * Spec: https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/
 *
 * Byte 0: Flags
 *   bit 0: 0=uint8 HR, 1=uint16 HR
 *   bit 1-2: Sensor Contact Status
 *   bit 3: Energy Expended Status
 *   bit 4: RR-Interval
 *
 * Returns: { bpm: number, contactDetected: boolean } or null if invalid
 */
export function parseHrMeasurement(dataView) {
  const dv = (dataView instanceof DataView) ? dataView : toHrDataView(dataView);
  if (!dv || dv.byteLength < 2) return null;

  const flags = dv.getUint8(0);
  const hrValueFormat = flags & 0x01; // 0 = UINT8, 1 = UINT16

  let bpm;
  if (hrValueFormat === 0) {
    bpm = dv.getUint8(1);
  } else {
    if (dv.byteLength < 3) return null;
    bpm = dv.getUint16(1, true); // little-endian
  }

  const contactStatus = (flags >> 1) & 0x03;
  const contactDetected = contactStatus === 0x03; // 11 = contact detected

  if (bpm < 30 || bpm > 250) return null;

  return { bpm, contactDetected };
}

export function classifyBleError(err) {
  const raw = String(err?.message || err || '').trim() || 'Unknown Bluetooth error';
  const s = raw.toLowerCase();
  if (err?.code === 'permission' || /permission denied|permission/.test(s)) {
    return {
      code: 'permission',
      message: 'Permission denied. In Android settings, allow Nearby devices and Location for Velo Companion (Settings → Apps → Velo Companion → Permissions), then try again.',
      settingsLabel: 'Open app settings',
    };
  }
  if (err?.code === 'bluetooth-off' || /bluetooth is off|ble is not available|requestenable failed|enable failed|bt-off|not enabled/.test(s)) {
    return {
      code: 'bluetooth-off',
      message: 'Bluetooth is off. Turn Bluetooth on and try again.',
      settingsLabel: 'Turn Bluetooth on',
    };
  }
  if (err?.code === 'location-off' || /location is off|location must be|location services/.test(s)) {
    return {
      code: 'location-off',
      message: 'Location is off. On Xiaomi / MIUI (Android 12), Location must be turned on to find Bluetooth heart-rate sensors, even if the app does not use GPS. Turn Location on and try again.',
      settingsLabel: 'Turn Location on',
    };
  }
  if (/hr service not found|no heart rate service/.test(s)) {
    return {
      code: 'not-hr',
      message: 'This device has no Heart Rate service. Pick a heart-rate strap, and disconnect it from any watch or other app first.',
      settingsLabel: null,
    };
  }
  if (/no device found|no heart-rate sensor found|no sensors found/.test(s)) {
    return {
      code: 'none-found',
      message: 'No heart-rate sensor found. Check that Nearby devices and Location are allowed, Location is turned on (required on Xiaomi / MIUI), the strap is on and close, and it is not already connected to a watch or another app.',
      settingsLabel: null,
    };
  }
  return { code: 'other', message: raw, settingsLabel: null };
}

export function deviceKey(dev) {
  return String(dev?.deviceId || '').toLowerCase();
}

export function displayName(dev) {
  return (dev?.name && String(dev.name).trim()) || '';
}

export function isNamedDevice(dev) {
  return displayName(dev).length > 0;
}

/**
 * Merge already-connected, bonded/paired, and scan results.
 * Connected and bonded devices are always listed (even without a name).
 * Scan hits are listed only when they advertise a name.
 */
export function mergeHrCandidates({ connected = [], bonded = [], scanned = [] } = {}) {
  const map = new Map();
  const add = (dev, source) => {
    if (!dev || !deviceKey(dev)) return;
    const key = deviceKey(dev);
    const prev = map.get(key);
    const sources = new Set(prev?.sources || []);
    sources.add(source);
    map.set(key, {
      deviceId: dev.deviceId,
      name: displayName(dev) || prev?.name || '',
      sources: [...sources],
      connected: sources.has('connected') || !!prev?.connected,
      bonded: sources.has('bonded') || !!prev?.bonded,
    });
  };
  connected.forEach((d) => add(d, 'connected'));
  bonded.forEach((d) => add(d, 'bonded'));
  scanned.filter(isNamedDevice).forEach((d) => add(d, 'scanned'));
  const rank = (d) => (d.connected ? 0 : d.bonded ? 1 : 2);
  return [...map.values()].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    return (displayName(a) || deviceKey(a)).localeCompare(displayName(b) || deviceKey(b));
  });
}

export function formatHrDeviceLabel(dev) {
  const name = displayName(dev) || 'Unknown device';
  const tags = [];
  if (dev.connected) tags.push('already connected');
  else if (dev.bonded) tags.push('paired');
  return tags.length ? `${name} (${tags.join(', ')})` : name;
}

export async function openHrFixSettings(code) {
  if (code === 'permission') {
    await BleClient.openAppSettings();
    return;
  }
  if (code === 'bluetooth-off') {
    try {
      await BleClient.requestEnable();
    } catch {
      await BleClient.openBluetoothSettings();
    }
    return;
  }
  if (code === 'location-off') {
    await BleClient.openLocationSettings();
  }
}

async function initBle() {
  // Request Nearby devices (BLUETOOTH_SCAN/CONNECT) and Location on Android 12+.
  // androidNeverForLocation: false is required so Location can be requested;
  // Xiaomi/MIUI often needs that permission plus the system Location toggle.
  await BleClient.initialize({ androidNeverForLocation: false });
}

export async function checkHrPrerequisites() {
  try {
    await initBle();
  } catch (e) {
    const classified = classifyBleError(e);
    const err = new Error(classified.message);
    err.code = classified.code;
    throw err;
  }
  const btOn = await BleClient.isEnabled().catch(() => false);
  if (!btOn) {
    const classified = classifyBleError({ code: 'bluetooth-off', message: 'Bluetooth is off' });
    const err = new Error(classified.message);
    err.code = classified.code;
    throw err;
  }
  // isLocationEnabled is Android-only; if the plugin rejects, do not block web/desktop.
  let locOn = true;
  try {
    locOn = await BleClient.isLocationEnabled();
  } catch {
    locOn = true;
  }
  if (locOn === false) {
    const classified = classifyBleError({ code: 'location-off', message: 'Location is off' });
    const err = new Error(classified.message);
    err.code = classified.code;
    throw err;
  }
}

export function createHrSensor({ onData, onLog = () => {}, onDisconnect = () => {} }) {
  let deviceId = null;
  let lastBpm = 0;
  let deviceName = '';
  let scanning = false;

  async function listKnownDevices() {
    await checkHrPrerequisites();
    let connected = [];
    let bonded = [];
    try {
      connected = await BleClient.getConnectedDevices([HR_SERVICE]) || [];
    } catch (e) {
      onLog(`[HR] getConnectedDevices: ${e.message || e}`);
    }
    try {
      bonded = await BleClient.getBondedDevices() || [];
    } catch (e) {
      onLog(`[HR] getBondedDevices: ${e.message || e}`);
    }
    return mergeHrCandidates({ connected, bonded });
  }

  async function startScan(onDevice) {
    await checkHrPrerequisites();
    try { await BleClient.stopLEScan(); } catch { /* no active scan */ }
    scanning = true;
    onLog('[HR] Scanning for nearby devices (no service filter)…');
    await BleClient.requestLEScan(HR_SCAN_OPTIONS, (result) => {
      const dev = result?.device;
      if (isNamedDevice(dev)) onDevice?.(dev);
    });
  }

  async function stopScan() {
    scanning = false;
    try { await BleClient.stopLEScan(); } catch { /* already stopped */ }
  }

  async function connectTo(id, name) {
    await stopScan();
    const t0 = Date.now();
    await checkHrPrerequisites();
    deviceName = name || id;
    onLog(`[HR] Connecting to ${deviceName}…`);
    await BleClient.connect(id, () => {
      deviceId = null;
      onDisconnect();
    });
    onLog(`[HR] Connected in ${Date.now() - t0}ms. Discovering services…`);

    let svcs = [];
    let attempt = 0;
    const maxAttempts = 20;
    const delayMs = 500;

    while (attempt < maxAttempts) {
      try {
        const services = await BleClient.getServices(id);
        svcs = services.map((s) => String(s.uuid).toLowerCase());
        if (svcs.includes(HR_SERVICE)) {
          onLog(`[HR] Discovery complete (attempt ${attempt + 1})`);
          break;
        }
      } catch (e) {
        onLog(`[HR] getServices attempt ${attempt + 1} error: ${e.message}`);
      }
      attempt++;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    if (!svcs.includes(HR_SERVICE)) {
      try { await BleClient.disconnect(id); } catch { /* ignore */ }
      throw new Error('HR service not found after 10s');
    }

    deviceId = id;
    onLog('[HR] Starting notifications…');
    await BleClient.startNotifications(
      deviceId,
      HR_SERVICE,
      HR_MEASUREMENT,
      (value) => {
        const hr = parseHrMeasurement(toHrDataView(value));
        if (hr) {
          lastBpm = hr.bpm;
          onData({ bpm: hr.bpm, contactDetected: hr.contactDetected });
        }
      }
    );

    onLog(`[HR] ${deviceName} ready`);
    return { name: deviceName };
  }

  async function disconnect() {
    await stopScan();
    if (deviceId) {
      try {
        await BleClient.disconnect(deviceId);
      } catch (e) {
        onLog(`[HR] Disconnect error: ${e.message}`);
      }
      deviceId = null;
    }
  }

  return {
    listKnownDevices,
    startScan,
    stopScan,
    connectTo,
    disconnect,
    get connected() { return deviceId !== null; },
    get lastBpm() { return lastBpm; },
    get deviceName() { return deviceName; },
  };
}
