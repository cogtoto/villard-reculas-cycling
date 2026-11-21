// Unit tests for Heart Rate Measurement parser, BLE error messages, and scan helpers
import {
  parseHrMeasurement,
  toHrDataView,
  classifyBleError,
  mergeHrCandidates,
  isNamedDevice,
  formatHrDeviceLabel,
  HR_SCAN_OPTIONS,
  HR_SERVICE,
} from './hr-sensor.js';

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
    return true;
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    failed++;
    return false;
  }
}

function assertEquals(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)} ${message}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message || 'assertion failed');
}

// Test UINT8 format (flags bit 0 = 0)
test('parseHrMeasurement: UINT8 format with valid HR', () => {
  const buffer = new Uint8Array([0x00, 142]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 142);
  assertEquals(result.contactDetected, false);
});

test('parseHrMeasurement: UINT8 format with contact detected', () => {
  const buffer = new Uint8Array([0x06, 85]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 85);
  assertEquals(result.contactDetected, true);
});

test('parseHrMeasurement: UINT16 format with valid HR', () => {
  const buffer = new Uint8Array([0x01, 0xB2, 0x00]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 178);
  assertEquals(result.contactDetected, false);
});

test('parseHrMeasurement: UINT16 format with contact detected', () => {
  const buffer = new Uint8Array([0x07, 0x8E, 0x00]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 142);
  assertEquals(result.contactDetected, true);
});

test('parseHrMeasurement: rejects too-low HR', () => {
  const buffer = new Uint8Array([0x00, 29]);
  const dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv), null);
});

test('parseHrMeasurement: rejects too-high HR', () => {
  const buffer = new Uint8Array([0x00, 251]);
  const dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv), null);
});

test('parseHrMeasurement: accepts boundary HR values', () => {
  let buffer = new Uint8Array([0x00, 30]);
  let dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv).bpm, 30);
  buffer = new Uint8Array([0x00, 250]);
  dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv).bpm, 250);
});

test('parseHrMeasurement: rejects null/undefined', () => {
  assertEquals(parseHrMeasurement(null), null);
  assertEquals(parseHrMeasurement(undefined), null);
});

test('parseHrMeasurement: rejects buffer too short for UINT8', () => {
  const buffer = new Uint8Array([0x00]);
  const dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv), null);
});

test('parseHrMeasurement: rejects buffer too short for UINT16', () => {
  const buffer = new Uint8Array([0x01, 0x8E]);
  const dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv), null);
});

test('parseHrMeasurement: UINT8 with trailing data', () => {
  const buffer = new Uint8Array([0x10, 145, 0x12, 0x34]);
  const dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv).bpm, 145);
});

test('toHrDataView / parseHrMeasurement: UINT8 in a sliced buffer (byteOffset)', () => {
  const raw = new Uint8Array([0xFF, 0xFF, 0x00, 142, 0xEE]);
  const slice = raw.subarray(2, 4); // [0x00, 142] at offset 2
  const dv = toHrDataView(slice);
  assertEquals(dv.byteOffset, 2);
  assertEquals(dv.byteLength, 2);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 142);
});

test('toHrDataView / parseHrMeasurement: UINT16 in a sliced buffer (byteOffset)', () => {
  const raw = new Uint8Array([0xAA, 0x01, 0xB2, 0x00, 0xBB]);
  const slice = raw.subarray(1, 4);
  const result = parseHrMeasurement(toHrDataView(slice));
  assertEquals(result.bpm, 178);
});

test('classifyBleError: permission denied', () => {
  const r = classifyBleError(new Error('Permission denied.'));
  assertEquals(r.code, 'permission');
  assert(/Nearby devices/.test(r.message) && /Location/.test(r.message), r.message);
});

test('classifyBleError: Bluetooth off', () => {
  const r = classifyBleError({ code: 'bluetooth-off', message: 'Bluetooth is off' });
  assertEquals(r.code, 'bluetooth-off');
  assert(/Bluetooth is off/.test(r.message), r.message);
});

test('classifyBleError: Location off (MIUI)', () => {
  const r = classifyBleError({ code: 'location-off', message: 'Location is off' });
  assertEquals(r.code, 'location-off');
  assert(/Location is off/.test(r.message) && /Xiaomi|MIUI/.test(r.message), r.message);
});

test('classifyBleError: empty scan / no device found', () => {
  const r = classifyBleError(new Error('No device found.'));
  assertEquals(r.code, 'none-found');
  assert(/watch/.test(r.message) && /Location/.test(r.message), r.message);
});

test('HR_SCAN_OPTIONS: no strict 0x180D service filter', () => {
  assert(!('services' in HR_SCAN_OPTIONS) || !HR_SCAN_OPTIONS.services || HR_SCAN_OPTIONS.services.length === 0,
    'services filter must be absent/empty so straps that omit 0x180D from ads are visible');
  assertEquals(HR_SCAN_OPTIONS.optionalServices, [HR_SERVICE]);
  assertEquals(HR_SCAN_OPTIONS.allowDuplicates, false);
});

test('isNamedDevice: requires a trimmed name', () => {
  assertEquals(isNamedDevice({ deviceId: 'AA', name: 'TICKR' }), true);
  assertEquals(isNamedDevice({ deviceId: 'AA', name: '  ' }), false);
  assertEquals(isNamedDevice({ deviceId: 'AA', name: '' }), false);
  assertEquals(isNamedDevice({ deviceId: 'AA' }), false);
});

test('mergeHrCandidates: includes connected/bonded even without names; scan only if named', () => {
  const list = mergeHrCandidates({
    connected: [{ deviceId: '11:11', name: '' }],
    bonded: [{ deviceId: '22:22', name: 'Polar H10' }, { deviceId: '11:11', name: 'MyStrap' }],
    scanned: [{ deviceId: '33:33', name: 'TICKR FIT' }, { deviceId: '44:44', name: '' }, { deviceId: '22:22', name: 'Polar H10' }],
  });
  const ids = list.map((d) => d.deviceId);
  assertEquals(ids.includes('11:11'), true);
  assertEquals(ids.includes('22:22'), true);
  assertEquals(ids.includes('33:33'), true);
  assertEquals(ids.includes('44:44'), false); // unnamed scan hit dropped
  const a = list.find((d) => d.deviceId === '11:11');
  assertEquals(a.connected, true);
  assertEquals(a.bonded, true);
  assertEquals(a.name, 'MyStrap');
  assertEquals(list[0].deviceId, '11:11'); // connected first
  assertEquals(formatHrDeviceLabel(a), 'MyStrap (already connected)');
  assertEquals(formatHrDeviceLabel(list.find((d) => d.deviceId === '22:22')), 'Polar H10 (paired)');
  assertEquals(formatHrDeviceLabel(list.find((d) => d.deviceId === '33:33')), 'TICKR FIT');
});

console.log(`\n=== HR tests: ${passed} passed, ${failed} failed ===`);
if (failed) process.exit(1);
