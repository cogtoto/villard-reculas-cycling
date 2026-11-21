// v0.5.38: TCX heart-rate export + companion → PC state.hr relay
import { buildTcx } from '../export.js';
import { recentHeartRate, telemetryFromCompanion, applyTelemetryToGameState, HR_MAX_AGE_MS } from '../hr-telemetry.js';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = dirname(fileURLToPath(new URL('.', import.meta.url)));
const XSD = join(ROOT, 'TrainingCenterDatabasev2.xsd');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; }
  catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEquals(a, b, msg = '') {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)} ${msg}`);
}

function sample(over = {}) {
  return { t: Date.UTC(2026, 10, 21, 9, 14, 40), lat: 45.130873, lon: 6.040889, alt: 777.3, dist: 0, w: 160, cad: 84, v: 6.2, ...over };
}
function samplesWith(hrs) {
  return hrs.map((hr, i) => sample({ t: Date.UTC(2026, 10, 21, 9, 14, 40) + i * 1000, dist: i * 10, cad: 84, hr }));
}

function elementOrder(xml, tags) {
  let last = -1;
  for (const tag of tags) {
    const i = xml.indexOf(`<${tag}`);
    assert(i !== -1, `missing <${tag}> in:\n${xml.slice(0, 400)}`);
    assert(i > last, `out of order: <${tag}> at ${i} after ${last}`);
    last = i;
  }
}

function xmllint(tcx, label) {
  mkdirSync('/tmp/tcx-hr', { recursive: true });
  const f = `/tmp/tcx-hr/${label}.tcx`;
  writeFileSync(f, tcx);
  try {
    execSync(`xmllint --noout --schema ${XSD} ${f}`, { stdio: 'pipe' });
  } catch (e) {
    const out = (e.stderr && e.stderr.toString()) || (e.stdout && e.stdout.toString()) || String(e);
    throw new Error(`xmllint failed for ${label}: ${out}`);
  }
}

test('recentHeartRate: accepts fresh positive BPM, rejects stale / zero / missing', () => {
  const now = 10_000;
  assertEquals(recentHeartRate(142, now - 1000, now), 142);
  assertEquals(recentHeartRate(142.6, now - 4999, now), 143);
  assertEquals(recentHeartRate(142, now - HR_MAX_AGE_MS, now), null); // 5 s old is stale
  assertEquals(recentHeartRate(142, now - 6000, now), null);
  assertEquals(recentHeartRate(0, now, now), null);
  assertEquals(recentHeartRate(null, now, now), null);
  assertEquals(recentHeartRate(142, 0, now), null);
  assertEquals(recentHeartRate(-1, now, now), null);
});

test('telemetryFromCompanion: PC relay includes hr when the strap sent a value', () => {
  const live = telemetryFromCompanion(
    { type: 'companion', watts: 180, cadence: 84, sensor: 'ftms', hr: 142 },
    { gradePct: 4.2, speedKmh: 22, ts: 1 }
  );
  assertEquals(live.type, 'telemetry');
  assertEquals(live.source, 'companion ftms');
  assertEquals(live.watts, 180);
  assertEquals(live.cadence, 84);
  assertEquals(live.hr, 142);
});

test('telemetryFromCompanion: omits hr when missing or null (power-only frame)', () => {
  assertEquals('hr' in telemetryFromCompanion({ watts: 100, cadence: 80 }), false);
  assertEquals('hr' in telemetryFromCompanion({ watts: 100, cadence: 80, hr: null }), false);
  assertEquals('hr' in telemetryFromCompanion({ watts: 100, cadence: 80, hr: 0 }), false);
});

test('companion → sensors push → game state.hr on PC mode', () => {
  // sensors.js: onData({ ...telemetry, source })
  const live = telemetryFromCompanion({ watts: 160, cadence: 84, hr: 138, sensor: 'ftms' }, { ts: 50 });
  const pushed = { ...live, source: live.source || 'ws' }; // push(m, m.source)
  let state = { watts: 0, cadence: 0 };
  const first = applyTelemetryToGameState(state, pushed, 1000);
  assertEquals(first.state.hr, 138);
  assertEquals(first.lastHrUpdate, 1000);
  assertEquals(recentHeartRate(first.state.hr, first.lastHrUpdate, 2000), 138);
  // a later power-only telemetry frame must not keep a stale sample after 5 s
  const noHr = telemetryFromCompanion({ watts: 150, cadence: 80 }, { ts: 7000 });
  const second = applyTelemetryToGameState({ ...first.state, lastHrUpdate: first.lastHrUpdate }, { ...noHr, source: noHr.source }, 7000);
  // state.hr may still be 138 (spread does not clear it), but recentHeartRate must drop it
  assertEquals(recentHeartRate(second.state.hr, second.lastHrUpdate, 7000), null);
});

test('buildTcx without HR: no HeartRate elements, schema order, xmllint', () => {
  const tcx = buildTcx(samplesWith([undefined, undefined]), { name: 'No HR Ride', version: '0.5.38' });
  assert(!tcx.includes('HeartRate'), tcx.slice(0, 500));
  const lap = tcx.match(/<Lap[\s\S]*?<\/Lap>/)[0];
  elementOrder(lap, ['TotalTimeSeconds', 'DistanceMeters', 'MaximumSpeed', 'Calories', 'Intensity', 'Cadence', 'TriggerMethod', 'Track']);
  const tp = tcx.match(/<Trackpoint>[\s\S]*?<\/Trackpoint>/)[0];
  elementOrder(tp, ['Time', 'Position', 'AltitudeMeters', 'DistanceMeters', 'Cadence', 'Extensions']);
  assert(!tp.includes('HeartRateBpm'));
  xmllint(tcx, 'no-hr');
});

test('buildTcx with HR: trackpoint HeartRateBpm, lap avg/max, schema order, xmllint', () => {
  const tcx = buildTcx(samplesWith([140, 142, 150]), { name: 'HR Ride', version: '0.5.38' });
  const tps = tcx.match(/<Trackpoint>[\s\S]*?<\/Trackpoint>/g);
  assertEquals(tps.length, 3);
  assert(tps[0].includes('<HeartRateBpm><Value>140</Value></HeartRateBpm>'), tps[0]);
  assert(tps[1].includes('<HeartRateBpm><Value>142</Value></HeartRateBpm>'), tps[1]);
  assert(tps[2].includes('<HeartRateBpm><Value>150</Value></HeartRateBpm>'), tps[2]);
  for (const tp of tps) {
    elementOrder(tp, ['Time', 'Position', 'AltitudeMeters', 'DistanceMeters', 'HeartRateBpm', 'Cadence', 'Extensions']);
    // HeartRateBpm must sit before Cadence
    assert(tp.indexOf('HeartRateBpm') < tp.indexOf('<Cadence>'), tp);
  }
  const lap = tcx.match(/<Lap[\s\S]*?<\/Lap>/)[0];
  assert(lap.includes('<AverageHeartRateBpm><Value>144</Value></AverageHeartRateBpm>'), lap); // (140+142+150)/3 = 144
  assert(lap.includes('<MaximumHeartRateBpm><Value>150</Value></MaximumHeartRateBpm>'), lap);
  elementOrder(lap, ['TotalTimeSeconds', 'DistanceMeters', 'MaximumSpeed', 'Calories', 'AverageHeartRateBpm', 'MaximumHeartRateBpm', 'Intensity', 'Cadence', 'TriggerMethod', 'Track']);
  xmllint(tcx, 'with-hr');
  console.log('\nSample trackpoint with HR:\n' + tps[1] + '\n');
});

test('buildTcx mixed samples: HR only on points that have it; lap stats from those points', () => {
  const mixed = [
    sample({ t: 1_000, dist: 0, cad: 80, hr: 130 }),
    sample({ t: 2_000, dist: 10, cad: 80 }), // no hr
    sample({ t: 3_000, dist: 20, cad: 80, hr: 170 }),
  ];
  const tcx = buildTcx(mixed, { name: 'Mixed HR', version: '0.5.38' });
  const tps = tcx.match(/<Trackpoint>[\s\S]*?<\/Trackpoint>/g);
  assert(tps[0].includes('<HeartRateBpm><Value>130</Value></HeartRateBpm>'));
  assert(!tps[1].includes('HeartRateBpm'), tps[1]);
  assert(tps[2].includes('<HeartRateBpm><Value>170</Value></HeartRateBpm>'));
  assert(tcx.includes('<AverageHeartRateBpm><Value>150</Value></AverageHeartRateBpm>'));
  assert(tcx.includes('<MaximumHeartRateBpm><Value>170</Value></MaximumHeartRateBpm>'));
  xmllint(tcx, 'mixed-hr');
});

console.log(`\n=== TCX HR tests: ${passed} passed, ${failed} failed ===`);
if (failed) process.exit(1);
