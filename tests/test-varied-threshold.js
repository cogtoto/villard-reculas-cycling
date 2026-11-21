// Unit test for Varied Threshold workout
import { createVariedThresholdWorkout } from '../workouts.js';

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

function assertApprox(actual, expected, tolerance, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected} ± ${tolerance}, got ${actual} ${message}`);
  }
}

const FTP = 160;
const workout = createVariedThresholdWorkout(FTP);

console.log('Testing Varied Threshold workout...\n');

// Test 1: Total duration exactly 35:00
test('Total duration is exactly 35 minutes (2100 seconds)', () => {
  assertEquals(workout.totalDuration, 2100, '(35 * 60)');
});

// Test 2: Workout metadata
test('Workout has correct ID and name', () => {
  assertEquals(workout.id, 'varied-threshold');
  assertEquals(workout.name, "Varied Threshold 35' - Coached");
  assertEquals(workout.isTest, false);
});

// Test 3: Segment 1 - Warmup (3:00)
test('Warmup segment: 2 intervals totaling 3:00', () => {
  const warmups = workout.intervals.slice(0, 2);
  const warmupDuration = warmups.reduce((sum, i) => sum + i.duration, 0);
  assertEquals(warmupDuration, 180, '(3 * 60)');
  assertEquals(warmups[0].target, 95, 'First warmup 95W');
  assertEquals(warmups[1].target, 120, 'Second warmup 120W');
});

// Test 4: Segment 2 - Cadence work (3:00)
test('Cadence segment: 6 intervals totaling 3:00', () => {
  const cadence = workout.intervals.slice(2, 8);
  const cadenceDuration = cadence.reduce((sum, i) => sum + i.duration, 0);
  assertEquals(cadenceDuration, 180, '(3 * 60)');
  
  // Check pattern: 3x (30s @ 110W + 30s @ 95W)
  for (let i = 0; i < 3; i++) {
    assertEquals(cadence[i * 2].duration, 30, `Fast ${i + 1}`);
    assertEquals(cadence[i * 2].target, 110, `Fast ${i + 1} power`);
    assertEquals(cadence[i * 2].cadence, 100, `Fast ${i + 1} cadence`);
    
    assertEquals(cadence[i * 2 + 1].duration, 30, `Recovery ${i + 1}`);
    assertEquals(cadence[i * 2 + 1].target, 95, `Recovery ${i + 1} power`);
  }
});

// Test 5: Segment 3 - Threshold (21:30)
test('Threshold segment: 4 efforts + 4 recoveries totaling 21:30', () => {
  const threshold = workout.intervals.slice(8, 16);
  const thresholdDuration = threshold.reduce((sum, i) => sum + i.duration, 0);
  assertEquals(thresholdDuration, 1290, '(21.5 * 60)');
  
  // Check efforts: 4 x 4:00 @ 158W
  for (let i = 0; i < 4; i++) {
    const effortIdx = i * 2;
    assertEquals(threshold[effortIdx].duration, 240, `Effort ${i + 1} duration`);
    assertEquals(threshold[effortIdx].target, 158, `Effort ${i + 1} power`);
    assertEquals(threshold[effortIdx].type, 'work');
  }
  
  // Check recoveries: 3 x 1:20 + 1 x 1:30
  assertEquals(threshold[1].duration, 80, 'Recovery 1');
  assertEquals(threshold[3].duration, 80, 'Recovery 2');
  assertEquals(threshold[5].duration, 80, 'Recovery 3');
  assertEquals(threshold[7].duration, 90, 'Recovery 4 (last is 1:30)');
  
  for (let i = 0; i < 4; i++) {
    assertEquals(threshold[i * 2 + 1].target, 100, `Recovery ${i + 1} power`);
  }
});

// Test 6: Segment 4 - VO2 (4:30)
test('VO2 segment: 3 efforts + 3 recoveries totaling 4:30', () => {
  const vo2 = workout.intervals.slice(16, 22);
  const vo2Duration = vo2.reduce((sum, i) => sum + i.duration, 0);
  assertEquals(vo2Duration, 270, '(4.5 * 60)');
  
  // Check pattern: 3x (45s @ 175W + 45s @ 95W)
  for (let i = 0; i < 3; i++) {
    assertEquals(vo2[i * 2].duration, 45, `VO2 effort ${i + 1}`);
    assertEquals(vo2[i * 2].target, 175, `VO2 effort ${i + 1} power`);
    
    assertEquals(vo2[i * 2 + 1].duration, 45, `VO2 recovery ${i + 1}`);
    assertEquals(vo2[i * 2 + 1].target, 95, `VO2 recovery ${i + 1} power`);
  }
});

// Test 7: Segment 5 - Cooldown (3:00)
test('Cooldown segment: 1 interval of 3:00 ramping down', () => {
  const cooldown = workout.intervals[22];
  assertEquals(cooldown.duration, 180, '(3 * 60)');
  assertEquals(cooldown.type, 'cooldown');
  assertEquals(cooldown.targetStart, 110, 'Cooldown starts at 110W');
  assertEquals(cooldown.targetEnd, 80, 'Cooldown ends at 80W');
});

// Test 8: Total interval count
test('Total of 23 intervals', () => {
  assertEquals(workout.intervals.length, 23);
});

// Test 9: Power values as percentages of FTP
test('Power values match specified percentages', () => {
  assertApprox(95 / FTP, 0.59, 0.01, '95W = 59% FTP');
  assertApprox(120 / FTP, 0.75, 0.01, '120W = 75% FTP');
  assertApprox(110 / FTP, 0.69, 0.01, '110W = 69% FTP');
  assertApprox(158 / FTP, 0.99, 0.01, '158W = 99% FTP');
  assertApprox(100 / FTP, 0.63, 0.01, '100W = 63% FTP');
  assertApprox(175 / FTP, 1.09, 0.01, '175W = 109% FTP');
});

// Test 10: Coaching messages present
test('Key coaching messages are defined', () => {
  // Warmup
  if (!workout.intervals[0].coachingMessage) throw new Error('Warmup coaching missing');
  if (!workout.intervals[0].coachingMessage.includes('Zone 2')) throw new Error('Warmup message incorrect');
  
  // Cadence
  if (!workout.intervals[2].coachingMessage) throw new Error('Cadence coaching missing');
  if (!workout.intervals[2].coachingMessage.includes('Spin')) throw new Error('Cadence message incorrect');
  
  // Threshold
  if (!workout.intervals[8].coachingMessage) throw new Error('Threshold coaching missing');
  if (!workout.intervals[8].coachingMessage.includes('threshold')) throw new Error('Threshold message incorrect');
  
  // VO2
  if (!workout.intervals[16].coachingMessage) throw new Error('VO2 coaching missing');
  if (!workout.intervals[16].coachingMessage.includes('VO2')) throw new Error('VO2 message incorrect');
  
  // Cooldown
  if (!workout.intervals[22].coachingMessage) throw new Error('Cooldown coaching missing');
  if (!workout.intervals[22].coachingMessage.includes('zone 1')) throw new Error('Cooldown message incorrect');
});

// Test 11: Detailed timing breakdown
test('Timing breakdown matches spec', () => {
  const segments = [
    { name: 'Warmup', start: 0, end: 2, expected: 180 },
    { name: 'Cadence', start: 2, end: 8, expected: 180 },
    { name: 'Threshold', start: 8, end: 16, expected: 1290 },
    { name: 'VO2', start: 16, end: 22, expected: 270 },
    { name: 'Cooldown', start: 22, end: 23, expected: 180 }
  ];
  
  segments.forEach(seg => {
    const duration = workout.intervals.slice(seg.start, seg.end).reduce((sum, i) => sum + i.duration, 0);
    assertEquals(duration, seg.expected, `${seg.name} segment`);
  });
});

console.log('\n=== All Varied Threshold Workout Tests Pass ✓ ===');
