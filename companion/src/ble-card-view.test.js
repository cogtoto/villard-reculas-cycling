import { bleCardView, formatConnectedStatus } from './ble-card-view.js';
import { looksLikeTrainer, TRAINER_SCAN_OPTIONS, FTMS, CPS } from './trainer.js';

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; }
  catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}
function assertEquals(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)} ${message}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message || 'assertion failed');
}

test('formatConnectedStatus: compact English status line', () => {
  assertEquals(formatConnectedStatus('Trainer', 'ELITE Direto'), 'Trainer: ELITE Direto — Connected');
  assertEquals(formatConnectedStatus('HR', 'Polar H10'), 'HR: Polar H10 — Connected');
  assertEquals(formatConnectedStatus('Trainer', '  '), 'Trainer: device — Connected');
});

test('bleCardView: connected hides the device list and scan controls', () => {
  const v = bleCardView({ phase: 'connected', kind: 'Trainer', name: 'ELITE Direto', deviceCount: 8, hasError: true });
  assertEquals(v.listHidden, true);
  assertEquals(v.scanHidden, true);
  assertEquals(v.hintHidden, true);
  assertEquals(v.settingsHidden, true);
  assertEquals(v.barHidden, false);
  assertEquals(v.statusLine, 'Trainer: ELITE Direto — Connected');
});

test('bleCardView: HR connected likewise hides the HR list', () => {
  const v = bleCardView({ phase: 'connected', kind: 'HR', name: 'TICKR FIT', deviceCount: 12 });
  assert(v.listHidden && v.scanHidden && v.barHidden === false, JSON.stringify(v));
  assertEquals(v.statusLine, 'HR: TICKR FIT — Connected');
});

test('bleCardView: pick phase shows the list again (e.g. after disconnect or Change)', () => {
  const v = bleCardView({ phase: 'pick', kind: 'Trainer', deviceCount: 3 });
  assertEquals(v.listHidden, false);
  assertEquals(v.scanHidden, false);
  assertEquals(v.barHidden, true);
  assertEquals(v.statusLine, null);
});

test('bleCardView: idle with no devices keeps the list hidden', () => {
  const v = bleCardView({ phase: 'idle', kind: 'Trainer', deviceCount: 0 });
  assertEquals(v.listHidden, true);
  assertEquals(v.scanHidden, false);
  assertEquals(v.barHidden, true);
});

test('bleCardView: scanning with hits shows the list, not the connected bar', () => {
  const v = bleCardView({ phase: 'scanning', kind: 'Trainer', deviceCount: 2 });
  assertEquals(v.listHidden, false);
  assertEquals(v.barHidden, true);
  assertEquals(v.scanHidden, false);
});

test('looksLikeTrainer: elite / kickr / direto match; phones and headsets do not', () => {
  assertEquals(looksLikeTrainer({ name: 'ELITE Direto XR' }), true);
  assertEquals(looksLikeTrainer({ name: 'KICKR CORE' }), true);
  assertEquals(looksLikeTrainer({ name: 'Tacx Neo 2T' }), true);
  assertEquals(looksLikeTrainer({ name: 'Xiaomi 12' }), false);
  assertEquals(looksLikeTrainer({ name: 'Galaxy Buds' }), false);
  assertEquals(looksLikeTrainer({ name: '' }), false);
});

test('TRAINER_SCAN_OPTIONS filters to FTMS/CPS so the trainer list stays short', () => {
  assertEquals(TRAINER_SCAN_OPTIONS.services, [FTMS, CPS]);
});

console.log(`\n=== BLE card view tests: ${passed} passed, ${failed} failed ===`);
if (failed) process.exit(1);
