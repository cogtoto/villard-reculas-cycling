// Unit tests for Le Commentateur trigger / cooldown / overlap logic
import {
  LINES, VILLARD_LANDMARKS, COOLDOWN_MS, COMMENTATOR_KEY, PERSONA,
  formatLine, pickLine, averagePower, classifyInterval, pickFrenchVoice,
  isCommentatorEnabled, setCommentatorEnabled, createCommentatorEngine
} from '../commentator.js';

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    return false;
  }
}

function assert(cond, message = 'assertion failed') {
  if (!cond) throw new Error(message);
}

function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)} ${message}`);
  }
}

let passed = 0, failed = 0;
function run(name, fn) {
  if (test(name, fn)) passed++; else failed++;
}

function memStorage(init = {}) {
  const data = { ...init };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    _data: data
  };
}

const TRACK = 10878;
function base(over = {}) {
  return {
    t: 0,
    watts: 160,
    cadence: 85,
    gradePct: 4,
    distanceM: 50,
    trackLength: TRACK,
    zone: 'Z3',
    hr: null,
    intervalIndex: -1,
    interval: null,
    ftp: 160,
    routeId: 'villard',
    rideStarted: true,
    arrivedFinish: false,
    ...over
  };
}

function engine(opts = {}) {
  return createCommentatorEngine({ random: () => 0, ...opts });
}

console.log('Testing commentator trigger / cooldown logic...\n');

run('persona is Le Commentateur and never names a real commentator', () => {
  assertEquals(PERSONA, 'Le Commentateur');
  const blob = JSON.stringify(LINES);
  assert(!/jacky|durand/i.test(blob), 'line pools must not mention Jacky Durand');
  assert(!/jacky|durand/i.test(PERSONA));
});

run('every line pool has at least 10 lines and refers to Vincent often', () => {
  const names = Object.keys(LINES);
  assert(names.length >= 10, 'expected many pools');
  for (const name of names) {
    assert(LINES[name].length >= 10, `${name} has only ${LINES[name].length} lines`);
    const hits = LINES[name].filter((l) => /Vincent/i.test(l)).length;
    assert(hits >= 8, `${name} should mention Vincent in most lines (${hits})`);
  }
});

run('cooldown is at least 20 seconds', () => {
  assert(COOLDOWN_MS >= 20000, `cooldown ${COOLDOWN_MS}`);
  assert(COOLDOWN_MS <= 30000, `cooldown ${COOLDOWN_MS} should stay in the 20–30 s range`);
});

run('default commentator setting is ON when storage is empty', () => {
  assertEquals(isCommentatorEnabled(memStorage()), true);
});

run('off is persisted and read back', () => {
  const s = memStorage();
  setCommentatorEnabled(false, s);
  assertEquals(s.getItem(COMMENTATOR_KEY), 'off');
  assertEquals(isCommentatorEnabled(s), false);
  setCommentatorEnabled(true, s);
  assertEquals(isCommentatorEnabled(s), true);
});

run('Villard ride start speaks immediately with a barrage / Allemond line', () => {
  const ev = engine().update(base({ t: 0, distanceM: 0 }));
  assert(ev, 'expected start line');
  assertEquals(ev.category, 'startVillard');
  assert(/Vincent/.test(ev.line));
  assert(/barrage|Verney|Allemond|Eau d'Olle|Oisans/i.test(ev.line), ev.line);
});

run('generic and Normandy starts use their own pools', () => {
  const a = engine().update(base({ routeId: 'other' }));
  const b = engine().update(base({ routeId: 'normandy' }));
  assertEquals(a.category, 'start');
  assertEquals(b.category, 'startNormandy');
  assert(/Normandie|bocage|Grand-Camp|campagne/i.test(b.line), b.line);
});

run('start is spoken only once', () => {
  const c = engine();
  const first = c.update(base({ t: 0 }));
  c.onSpeechEnd();
  const second = c.update(base({ t: COOLDOWN_MS + 1000 }));
  assert(first);
  assertEquals(second, null);
});

run('cooldown blocks a later trigger, then allows it after 25 s', () => {
  const c = engine();
  assert(c.update(base({ t: 0 }))); // start
  c.onSpeechEnd();
  const mid = c.update(base({ t: 10000, distanceM: 1000, zone: 'Z3' }));
  assertEquals(mid, null, 'still in cooldown');
  const later = c.update(base({ t: COOLDOWN_MS + 1000, distanceM: 1000, zone: 'Z3' }));
  assert(later, 'km 1 should fire after cooldown');
  assertEquals(later.category, 'km'); // 10 km remain, remaining pool is only for the last 5 km
  assert(/Vincent/.test(later.line));
});

run('no overlap: a new line is blocked while speaking, even after cooldown time', () => {
  const c = engine();
  assert(c.update(base({ t: 0 })));
  // speaking still true; jump past cooldown; km should be blocked
  const blocked = c.update(base({ t: COOLDOWN_MS + 5000, distanceM: 2000 }));
  assertEquals(blocked, null);
  c.onSpeechEnd();
  const ok = c.update(base({ t: COOLDOWN_MS + 5001, distanceM: 2000 }));
  assert(ok, 'unblocked once speech ended');
  assert(ok.category === 'km' || ok.category === 'kmRemaining', ok.category);
});

run('finish at the Villard chalet interrupts cooldown and mentions 7 rue Nouvelle', () => {
  const c = engine();
  assert(c.update(base({ t: 0 })));
  const fin = c.update(base({ t: 3000, arrivedFinish: true, distanceM: TRACK }));
  assert(fin, 'finish must interrupt');
  assertEquals(fin.category, 'finishVillard');
  assert(/7 rue Nouvelle|chalet|Villard-Reculas/i.test(fin.line), fin.line);
  assert(fin.important);
  c.onSpeechEnd();
  const again = c.update(base({ t: 40000, arrivedFinish: true, distanceM: TRACK }));
  assertEquals(again, null, 'finish spoken only once');
});

run('generic route finish uses the general finish pool', () => {
  const c = engine();
  c.update(base({ t: 0, routeId: 'normandy' }));
  const fin = c.update(base({ t: 2000, routeId: 'normandy', arrivedFinish: true }));
  assertEquals(fin.category, 'finish');
});

run('last 500 m fires once, with a Villard chalet line on that route', () => {
  const c = engine();
  c.update(base({ t: 0 }));
  c.onSpeechEnd();
  const ev = c.update(base({ t: COOLDOWN_MS + 1000, distanceM: TRACK - 400 }));
  assert(ev, 'expected last 500 m');
  assertEquals(ev.category, 'last500Villard');
  assert(/cinq cents|chalet|rue Nouvelle|Villard/i.test(ev.line), ev.line);
  c.onSpeechEnd();
  const again = c.update(base({ t: COOLDOWN_MS * 2 + 2000, distanceM: TRACK - 200 }));
  assertEquals(again, null);
});

run('power surge vs 30 s average triggers an attack line', () => {
  const c = engine();
  c.update(base({ t: 0, watts: 150 }));
  c.onSpeechEnd();
  for (let i = 1; i <= 20; i++) {
    const ev = c.update(base({ t: 20000 + i * 500, watts: 150, distanceM: 800, zone: 'Z4' }));
    assertEquals(ev, null, `warmup sample ${i} should be quiet`);
  }
  const ev = c.update(base({ t: 20000 + 21 * 500, watts: 230, distanceM: 820, zone: 'Z4' }));
  assert(ev, 'expected attack');
  assertEquals(ev.category, 'attack');
  assert(/plaque|relance|attaque|braquet|accélération|décolle|paquet/i.test(ev.line), ev.line);
});

run('entering Z5 from a lower zone fires once; staying in Z5 does not', () => {
  const c = engine();
  c.update(base({ t: 0, zone: 'Z3' }));
  c.onSpeechEnd();
  const ev = c.update(base({ t: COOLDOWN_MS + 1000, zone: 'Z5', watts: 180, distanceM: 800 }));
  assert(ev, 'Z5 entry');
  assertEquals(ev.category, 'zoneRed');
  c.onSpeechEnd();
  const stay = c.update(base({ t: COOLDOWN_MS * 2 + 2000, zone: 'Z5', watts: 180, distanceM: 900 }));
  assertEquals(stay, null);
});

run('gradient steepening above 8% triggers, then low cadence on the steep fires struggle', () => {
  const c = engine();
  c.update(base({ t: 0, gradePct: 3 }));
  c.onSpeechEnd();
  const steep = c.update(base({ t: COOLDOWN_MS + 1000, gradePct: 11, cadence: 85, distanceM: 800 }));
  assert(steep, 'expected steepening');
  assertEquals(steep.category, 'steep');
  c.onSpeechEnd();
  const struggle = c.update(base({ t: COOLDOWN_MS * 2 + 2000, gradePct: 11, cadence: 55, distanceM: 820 }));
  assert(struggle, 'expected struggle');
  assertEquals(struggle.category, 'struggle');
  assert(/dans le dur|jambes|cadence|souffle|mal/i.test(struggle.line), struggle.line);
});

run('workout interval start distinguishes hard and recovery', () => {
  const c = engine();
  c.update(base({ t: 0 }));
  c.onSpeechEnd();
  const hard = c.update(base({
    t: COOLDOWN_MS + 1000,
    intervalIndex: 2,
    interval: { type: 'work', target: 200, name: 'VO2' },
    distanceM: 800
  }));
  assert(hard, 'hard interval');
  assertEquals(hard.category, 'intervalHard');
  c.onSpeechEnd();
  const rec = c.update(base({
    t: COOLDOWN_MS * 2 + 2000,
    intervalIndex: 3,
    interval: { type: 'recovery', target: 80, name: 'Recovery' },
    distanceM: 900
  }));
  assert(rec, 'recovery interval');
  assertEquals(rec.category, 'intervalRecovery');
});

run('classifyInterval maps types and %FTP targets', () => {
  assertEquals(classifyInterval({ type: 'work', target: 200 }, 160), 'hard');
  assertEquals(classifyInterval({ type: 'recovery', target: 90 }, 160), 'recovery');
  assertEquals(classifyInterval({ type: 'cooldown', target: 70 }, 160), 'recovery');
  assertEquals(classifyInterval({ type: 'ramp', target: 220 }, 160), 'hard');
  assertEquals(classifyInterval({ type: 'warmup', target: 90 }, 160), 'recovery'); // 90 < 0.7*160=112
  assertEquals(classifyInterval({ type: 'warmup', target: 150 }, 160), 'hard'); // 150 >= 0.88*160
});

run('high heart rate fires once until HR drops (hysteresis)', () => {
  const c = engine();
  c.update(base({ t: 0 }));
  c.onSpeechEnd();
  const ev = c.update(base({ t: COOLDOWN_MS + 1000, hr: 172, distanceM: 800 }));
  assert(ev, 'HR high');
  assertEquals(ev.category, 'hrHigh');
  c.onSpeechEnd();
  const stay = c.update(base({ t: COOLDOWN_MS * 2 + 2000, hr: 170, distanceM: 850 }));
  assertEquals(stay, null);
  // drop, then rise again
  c.update(base({ t: COOLDOWN_MS * 2 + 3000, hr: 140, distanceM: 860 }));
  const again = c.update(base({ t: COOLDOWN_MS * 2 + 4000 + COOLDOWN_MS, hr: 168, distanceM: 900 }));
  assert(again, 're-trigger after drop');
  assertEquals(again.category, 'hrHigh');
});

run('Villard place names fire once when entering a landmark', () => {
  const c = engine();
  c.update(base({ t: 0, distanceM: 0 }));
  c.onSpeechEnd();
  const verney = c.update(base({ t: COOLDOWN_MS + 1000, distanceM: 200 }));
  assert(verney, 'Verney');
  assertEquals(verney.category, 'verney');
  assert(/Verney|Allemond|lac/i.test(verney.line), verney.line);
  c.onSpeechEnd();
  const lacets = c.update(base({ t: COOLDOWN_MS * 2 + 2000, distanceM: 4500 }));
  assert(lacets, 'lacets');
  assertEquals(lacets.category, 'lacets');
  c.onSpeechEnd();
  // mid-lacets, same landmark, no repeat
  const again = c.update(base({ t: COOLDOWN_MS * 3 + 3000, distanceM: 5000 }));
  assert(again == null || again.category !== 'lacets', 'lacets should not repeat');
  // skip last 500 by staying well before 10378; village starts at 10400 which overlaps last 500
  // so villardVillage is tested via the landmark table itself plus a mid-route check
  assert(VILLARD_LANDMARKS.some((l) => l.pool === 'villardVillage'));
});

run('muted engine does not speak, and unmuting mid-ride does not replay the start', () => {
  const c = engine();
  c.setEnabled(false);
  assertEquals(c.update(base({ t: 0 })), null);
  c.setEnabled(true);
  const ev = c.update(base({ t: 5000, distanceM: 400 }));
  assert(ev == null || ev.category !== 'startVillard', 'should not shout start mid-ride');
});

run('formatLine substitutes km / remain and pickLine avoids the last line', () => {
  assertEquals(formatLine('Kilomètre {km}, plus que {remain}', { km: 3, remain: 7 }), 'Kilomètre 3, plus que 7');
  const pool = ['a', 'b', 'c'];
  const a = pickLine(pool, () => 0, null);
  assertEquals(a, 'a');
  const b = pickLine(pool, () => 0, 'a');
  assertEquals(b, 'b'); // filtered pool starts at b
});

run('averagePower uses only the last 30 s window', () => {
  const samples = [
    { t: 0, watts: 400 },
    { t: 25000, watts: 100 },
    { t: 30000, watts: 100 },
    { t: 40000, watts: 100 }
  ];
  const avg = averagePower(samples, 40000, 30000);
  assertEquals(avg, 100);
});

run('pickFrenchVoice prefers a fr-FR voice and ignores English', () => {
  const voice = pickFrenchVoice([
    { lang: 'en-US', name: 'Google US English', localService: true, default: true },
    { lang: 'fr-CA', name: 'Amélie', localService: true, default: false },
    { lang: 'fr-FR', name: 'Google français', localService: true, default: false }
  ]);
  assert(voice, 'expected a French voice');
  assertEquals(voice.lang, 'fr-FR');
  assertEquals(pickFrenchVoice([{ lang: 'en-GB', name: 'Daniel' }]), null);
});

run('km milestones fire once per kilometre', () => {
  const c = engine();
  c.update(base({ t: 0, routeId: 'normandy', trackLength: 21000 }));
  c.onSpeechEnd();
  const k1 = c.update(base({ t: COOLDOWN_MS + 1000, routeId: 'normandy', trackLength: 21000, distanceM: 1000 }));
  assert(k1, 'km 1');
  assertEquals(k1.category, 'km');
  assert(/1/.test(k1.line), k1.line);
  c.onSpeechEnd();
  const k1b = c.update(base({ t: COOLDOWN_MS * 2 + 2000, routeId: 'normandy', trackLength: 21000, distanceM: 1400 }));
  assertEquals(k1b, null);
  const k2 = c.update(base({ t: COOLDOWN_MS * 2 + 2000, routeId: 'normandy', trackLength: 21000, distanceM: 2000 }));
  assert(k2, 'km 2');
  assertEquals(k2.category, 'km');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
