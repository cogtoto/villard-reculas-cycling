// Unit tests for Zwift-style %FTP → power zone mapping (boundaries inclusive as specified)
import { getPowerZone, getPowerZoneFromWatts, getWorkoutLegendZones, getWorkoutProfile, createVariedThresholdWorkout, POWER_ZONES } from '../workouts.js';

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

function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual} ${message}`);
  }
}

let passed = 0, failed = 0;
function run(name, fn) {
  if (test(name, fn)) passed++; else failed++;
}

console.log('Testing power-zone mapping...\n');

// Specified colours
const COLORS = {
  Z1: '#7f7f7f',
  Z2: '#338cff',
  Z3: '#59bf59',
  Z4: '#ffcc3f',
  Z5: '#ff6639',
  Z6: '#ff330c'
};

run('POWER_ZONES has six Zwift-style zones with the specified colours', () => {
  assertEquals(POWER_ZONES.length, 6);
  for (const z of POWER_ZONES) {
    assertEquals(z.color, COLORS[z.z], z.z);
  }
  assertEquals(POWER_ZONES[0].name, 'Recovery');
  assertEquals(POWER_ZONES[1].name, 'Endurance');
  assertEquals(POWER_ZONES[2].name, 'Tempo');
  assertEquals(POWER_ZONES[3].name, 'Threshold');
  assertEquals(POWER_ZONES[4].name, 'VO2max');
  assertEquals(POWER_ZONES[5].name, 'Anaerobic');
});

// Boundary table: Z1 <60, Z2 60-75, Z3 76-89, Z4 90-104, Z5 105-118, Z6 >=119
const BOUNDARIES = [
  [0, 'Z1'],
  [59, 'Z1'],
  [59.999, 'Z1'],
  [60, 'Z2'],
  [75, 'Z2'],
  [75.999, 'Z2'],
  [76, 'Z3'],
  [89, 'Z3'],
  [89.999, 'Z3'],
  [90, 'Z4'],
  [104, 'Z4'],
  [104.999, 'Z4'],
  [105, 'Z5'],
  [118, 'Z5'],
  [118.999, 'Z5'],
  [119, 'Z6'],
  [150, 'Z6'],
  [200, 'Z6']
];

for (const [pct, zone] of BOUNDARIES) {
  run(`%FTP ${pct} → ${zone}`, () => {
    assertEquals(getPowerZone(pct).z, zone);
    assertEquals(getPowerZone(pct).color, COLORS[zone]);
  });
}

const FTP = 160;

run('Watts / FTP 160 W at the same boundaries', () => {
  // 59% of 160 = 94.4 W → still Z1; 60% = 96 W → Z2
  assertEquals(getPowerZoneFromWatts(95, FTP).z, 'Z1'); // 59.375%
  assertEquals(getPowerZoneFromWatts(96, FTP).z, 'Z2'); // 60%
  assertEquals(getPowerZoneFromWatts(120, FTP).z, 'Z2'); // 75%
  assertEquals(getPowerZoneFromWatts(121.6, FTP).z, 'Z3'); // 76%
  assertEquals(getPowerZoneFromWatts(144, FTP).z, 'Z4'); // 90%
  assertEquals(getPowerZoneFromWatts(158, FTP).z, 'Z4'); // 98.75%
  assertEquals(getPowerZoneFromWatts(166.4, FTP).z, 'Z4'); // 104%
  assertEquals(getPowerZoneFromWatts(168, FTP).z, 'Z5'); // 105%
  assertEquals(getPowerZoneFromWatts(175, FTP).z, 'Z5'); // 109.375%
  assertEquals(getPowerZoneFromWatts(188.8, FTP).z, 'Z5'); // 118%
  assertEquals(getPowerZoneFromWatts(190.4, FTP).z, 'Z6'); // 119%
});

run('Varied Threshold 35\' profile uses zone colours (FTP 160 W)', () => {
  const workout = createVariedThresholdWorkout(FTP);
  const profile = getWorkoutProfile(workout, FTP);
  const byTarget = Object.fromEntries(profile.filter(p => p.target).map(p => [p.target, p]));
  assertEquals(byTarget[95].zone, 'Z1');
  assertEquals(byTarget[95].color, COLORS.Z1);
  assertEquals(byTarget[120].zone, 'Z2');
  assertEquals(byTarget[120].color, COLORS.Z2);
  assertEquals(byTarget[158].zone, 'Z4');
  assertEquals(byTarget[158].color, COLORS.Z4);
  assertEquals(byTarget[175].zone, 'Z5');
  assertEquals(byTarget[175].color, COLORS.Z5);
  const cooldown = profile.find(p => p.type === 'cooldown');
  assertEquals(cooldown.startColor, COLORS.Z2); // 110 W
  assertEquals(cooldown.endColor, COLORS.Z1);   // 80 W
  // Average of 110–80 is 95 W → Z1
  assertEquals(cooldown.zone, 'Z1');
  assertEquals(cooldown.color, COLORS.Z1);
});

run('Varied Threshold legend lists only zones present, in order', () => {
  const workout = createVariedThresholdWorkout(FTP);
  const legend = getWorkoutLegendZones(workout, FTP);
  assertEquals(legend.map(z => z.z).join(','), 'Z1,Z2,Z4,Z5');
  assertEquals(legend.some(z => z.z === 'Z3'), false);
  assertEquals(legend.some(z => z.z === 'Z6'), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
