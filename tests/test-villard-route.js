// Unit tests for the Villard-Reculas dam-to-chalet route and interval zone labels
import { readFileSync } from 'fs';
import { parseGpx } from '../gpx.js';
import {
  createFTPRampTest, createSweetSpotWorkout, createExplosiveWorkout,
  createVariedThresholdWorkout, getPowerZoneFromWatts
} from '../workouts.js';

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); return true; }
  catch (e) { console.error(`✗ ${name}: ${e.message}`); return false; }
}
function assertEquals(a, e, msg = '') {
  if (a !== e) throw new Error(`Expected ${e}, got ${a} ${msg}`);
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function hav(a, b) {
  const R = 6371000;
  const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
  const dp = p2 - p1, dl = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let passed = 0, failed = 0;
function run(name, fn) { if (test(name, fn)) passed++; else failed++; }

const START = { lat: 45.1308725, lon: 6.0408887 }; // D526, Barrage du Verney
const BAN = { lat: 45.092266, lon: 6.034288 };     // 7 Rue Nouvelle (BAN)

const gpx = parseGpx(readFileSync(new URL('../public/villard-reculas.gpx', import.meta.url), 'utf8'));
assert(gpx.length > 100, 'GPX has points');

const dist = [0];
let gain = 0, loss = 0;
for (let i = 1; i < gpx.length; i++) {
  dist.push(dist[i - 1] + hav(gpx[i - 1], gpx[i]));
  const d = gpx[i].ele - gpx[i - 1].ele;
  if (d > 0) gain += d; else loss += -d;
}
const eles = gpx.map(p => p.ele);

console.log('Testing Villard-Reculas route and interval labels...\n');

run('Route starts at the top of Barrage du Verney (D 526)', () => {
  const d = hav(gpx[0], START);
  assert(d < 5, `start is ${d.toFixed(1)} m from the D526 guidepost`);
});

run('Route finishes at 7 rue Nouvelle (within 15 m of the BAN address)', () => {
  const d = hav(gpx[gpx.length - 1], BAN);
  assert(d < 15, `finish is ${d.toFixed(1)} m from 7 rue Nouvelle`);
});

run('Distance is about 10.9 km with ~721 m of climbing', () => {
  assert(Math.abs(dist[dist.length - 1] / 1000 - 10.878) < 0.05, `km=${dist[dist.length - 1]/1000}`);
  assert(gain > 700 && gain < 750, `gain=${gain}`);
  assert(eles[0] > 770 && eles[0] < 790, `start ele=${eles[0]}`);
  assert(eles[eles.length - 1] > 1485 && eles[eles.length - 1] < 1510, `end ele=${eles[eles.length - 1]}`);
});

run('No interval label hardcodes a Z1–Z6 that contradicts the computed zone', () => {
  const ftp = 160;
  const zoneRe = /\bZ([1-6])\b/;
  const workouts = [
    createFTPRampTest(ftp),
    createSweetSpotWorkout(ftp),
    createExplosiveWorkout(ftp),
    createVariedThresholdWorkout(ftp)
  ];
  for (const w of workouts) {
    for (const interval of w.intervals) {
      const m = zoneRe.exec(interval.name || '');
      if (!m) continue;
      const watts = interval.target !== undefined
        ? interval.target
        : (interval.targetStart + interval.targetEnd) / 2;
      const zone = getPowerZoneFromWatts(watts, ftp);
      assertEquals(m[1], zone.z.slice(1), `${w.id} interval "${interval.name}" at ${watts} W is ${zone.z}`);
    }
    assert(!zoneRe.test('Warm-up'), 'sanity');
    assert(!/Warm-up Z2/.test(w.intervals.map(i => i.name).join('|')), `${w.id} still has Warm-up Z2`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
