// Structured workouts with ERG mode control
// All workouts are <= 35 minutes, based on user's FTP

/**
 * Workout interval types:
 * - warmup: gradual increase
 * - work: main effort intervals
 * - recovery: active recovery between efforts
 * - cooldown: gradual decrease
 * - ramp: FTP test ramp (increases every minute)
 */

// FTP Ramp Test: 3 min warmup 60-100W, ramp +20W/min starting ~50% FTP until failure
export function createFTPRampTest(userFTP) {
  const startWatts = Math.max(100, Math.round(userFTP * 0.5));
  const intervals = [];
  
  // Warmup: 3 minutes gradual 60W to 100W
  intervals.push({
    type: 'warmup',
    duration: 180, // 3 min
    targetStart: 60,
    targetEnd: 100,
    name: 'Warm-up'
  });
  
  // Ramp: +20W every minute up to 30 minutes max (capped at 35 min total)
  const maxRampMinutes = 30;
  for (let i = 0; i < maxRampMinutes; i++) {
    const watts = startWatts + (i * 20);
    intervals.push({
      type: 'ramp',
      duration: 60,
      target: watts,
      name: `Ramp ${watts}W`
    });
  }
  
  return {
    id: 'ftp-ramp-test',
    name: 'FTP Ramp Test',
    description: 'Ramp test to estimate FTP. Ride until failure.',
    totalDuration: intervals.reduce((sum, i) => sum + i.duration, 0),
    intervals,
    isTest: true
  };
}

// Sweet Spot: 3x7 min at 88-93% FTP with 3 min recovery
export function createSweetSpotWorkout(userFTP) {
  const intervals = [];
  const sweetSpotLow = Math.round(userFTP * 0.88);
  const sweetSpotHigh = Math.round(userFTP * 0.93);
  const recovery = Math.round(userFTP * 0.55);
  
  // Warmup: 3 minutes 60W to 100W
  intervals.push({
    type: 'warmup',
    duration: 180,
    targetStart: 60,
    targetEnd: 100,
    name: 'Warm-up'
  });
  
  // 3 sweet spot intervals
  for (let i = 0; i < 3; i++) {
    intervals.push({
      type: 'work',
      duration: 420, // 7 min
      target: sweetSpotLow + Math.round((sweetSpotHigh - sweetSpotLow) / 2),
      targetRange: [sweetSpotLow, sweetSpotHigh],
      name: `Sweet Spot ${i + 1}/3`
    });
    
    if (i < 2) { // Recovery between intervals (not after last)
      intervals.push({
        type: 'recovery',
        duration: 180, // 3 min
        target: recovery,
        name: 'Recovery'
      });
    }
  }
  
  // Cooldown: 5 minutes
  intervals.push({
    type: 'cooldown',
    duration: 300,
    targetStart: recovery,
    targetEnd: recovery * 0.5,
    name: 'Cool-down'
  });
  
  return {
    id: 'sweet-spot',
    name: 'Sweet Spot',
    description: '3×7 min at 88-93% FTP with active recovery',
    totalDuration: intervals.reduce((sum, i) => sum + i.duration, 0),
    intervals,
    isTest: false
  };
}

// Explosiveness / Power: short bursts at 150-200% FTP
export function createExplosiveWorkout(userFTP) {
  const intervals = [];
  const burstLow = Math.round(userFTP * 1.5);
  const burstHigh = Math.round(userFTP * 2.0);
  const activeRecovery = Math.round(userFTP * 0.55);
  const vo2Power = Math.round(userFTP * 1.2);
  
  // Warmup: 3 minutes 60W to 100W
  intervals.push({
    type: 'warmup',
    duration: 180,
    targetStart: 60,
    targetEnd: 100,
    name: 'Warm-up'
  });
  
  // 10 explosive bursts: 20s sprint + 40s active recovery
  const numBursts = 10;
  for (let i = 0; i < numBursts; i++) {
    // Ramp-in for sprint (5s gradual increase to help ERG lag)
    intervals.push({
      type: 'work',
      duration: 5,
      targetStart: vo2Power,
      targetEnd: burstLow + Math.round((burstHigh - burstLow) / 2),
      name: `Sprint ${i + 1}/10 ramp`,
      rampIn: true
    });
    
    // Sprint
    intervals.push({
      type: 'work',
      duration: 15, // 15s at target (5s ramp + 15s = 20s total)
      target: burstLow + Math.round((burstHigh - burstLow) / 2),
      targetRange: [burstLow, burstHigh],
      name: `Sprint ${i + 1}/10`
    });
    
    // Active recovery at 120% for 30s
    intervals.push({
      type: 'recovery',
      duration: 30,
      target: vo2Power,
      name: 'Active recovery'
    });
  }
  
  // Cooldown: 7 minutes
  intervals.push({
    type: 'cooldown',
    duration: 420,
    targetStart: activeRecovery,
    targetEnd: activeRecovery * 0.5,
    name: 'Cool-down'
  });
  
  return {
    id: 'explosive-power',
    name: 'Explosiveness / Power',
    description: '10×20s sprints at 150-200% FTP with active recovery',
    totalDuration: intervals.reduce((sum, i) => sum + i.duration, 0),
    intervals,
    isTest: false
  };
}

// Get current interval and target power at a given elapsed time
export function getCurrentInterval(workout, elapsedSeconds) {
  let accumulated = 0;
  for (let i = 0; i < workout.intervals.length; i++) {
    const interval = workout.intervals[i];
    if (elapsedSeconds < accumulated + interval.duration) {
      const intervalElapsed = elapsedSeconds - accumulated;
      const intervalRemaining = interval.duration - intervalElapsed;
      
      // Calculate current target (handle ramps)
      let currentTarget;
      if (interval.targetStart !== undefined && interval.targetEnd !== undefined) {
        // Ramping interval
        const progress = intervalElapsed / interval.duration;
        currentTarget = interval.targetStart + (interval.targetEnd - interval.targetStart) * progress;
      } else {
        currentTarget = interval.target;
      }
      
      // Next interval preview
      const nextInterval = i < workout.intervals.length - 1 ? workout.intervals[i + 1] : null;
      
      return {
        index: i,
        interval,
        intervalElapsed,
        intervalRemaining,
        currentTarget: Math.round(currentTarget),
        nextInterval,
        totalRemaining: workout.totalDuration - elapsedSeconds
      };
    }
    accumulated += interval.duration;
  }
  
  // Workout complete
  return null;
}

// Detect potential failure for FTP ramp test (low power)
// Returns { shouldPrompt: boolean, reason: string }
// Does NOT auto-stop - only suggests user confirmation
export function detectRampTestFailure(workout, recentPowerSamples, recentCadenceSamples, elapsedSeconds) {
  if (!workout.isTest) return { shouldPrompt: false };
  
  const current = getCurrentInterval(workout, elapsedSeconds);
  if (!current || current.interval.type !== 'ramp') {
    return { shouldPrompt: false }; // Only check during ramp intervals
  }
  
  // Check for very low power (< 20W) sustained for 5+ seconds
  // This indicates the rider has likely stopped pedaling or given up
  if (recentPowerSamples.length >= 5) {
    const last5 = recentPowerSamples.slice(-5);
    const avgPower = last5.reduce((sum, p) => sum + p, 0) / last5.length;
    if (avgPower < 20) {
      return { shouldPrompt: true, reason: 'Power dropped near zero' };
    }
  }
  
  return { shouldPrompt: false };
}

// Calculate estimated FTP from best 1-minute power (75% of best)
export function calculateEstimatedFTP(powerHistory) {
  if (powerHistory.length < 60) return null;
  
  let bestMinute = 0;
  for (let i = 0; i <= powerHistory.length - 60; i++) {
    const minuteAvg = powerHistory.slice(i, i + 60).reduce((sum, p) => sum + p, 0) / 60;
    bestMinute = Math.max(bestMinute, minuteAvg);
  }
  
  return Math.round(bestMinute * 0.75);
}

// Generate workout profile for visualization (bar chart)
// Returns array of { duration, target, type, zone }
export function getWorkoutProfile(workout, userFTP) {
  const zones = [
    { max: 0.55, name: 'Z1', color: '#4ade80' },
    { max: 0.75, name: 'Z2', color: '#fbbf24' },
    { max: 0.90, name: 'Z3', color: '#fb923c' },
    { max: 1.05, name: 'Z4', color: '#ef4444' },
    { max: 1.20, name: 'Z5', color: '#dc2626' },
    { max: Infinity, name: 'Z6+', color: '#991b1b' }
  ];
  
  const getZone = (watts) => {
    const pct = watts / userFTP;
    return zones.find(z => pct <= z.max) || zones[zones.length - 1];
  };
  
  return workout.intervals.map(interval => {
    const avgTarget = interval.target || (interval.targetStart + interval.targetEnd) / 2;
    const zone = getZone(avgTarget);
    return {
      duration: interval.duration,
      target: Math.round(avgTarget),
      type: interval.type,
      name: interval.name,
      zone: zone.name,
      color: zone.color
    };
  });
}

// Varied Threshold: Coached 35-minute session with threshold, cadence work, and VO2
export function createVariedThresholdWorkout(userFTP) {
  const intervals = [];
  
  // Segment 1: Warm-up (3:00 total)
  intervals.push({
    type: 'warmup',
    duration: 90, // 1:30
    target: 95,
    cadence: 85,
    name: 'Warm-up Z2',
    coachingMessage: "Wake up the legs. Zone 2 = endurance: you can talk easily, this is where your aerobic engine is built."
  });
  intervals.push({
    type: 'warmup',
    duration: 90, // 1:30
    target: 120,
    cadence: 85,
    name: 'Warm-up',
    coachingMessage: null // No message for 2nd warmup
  });
  
  // Segment 2: Cadence work (3:00 total)
  for (let i = 0; i < 3; i++) {
    intervals.push({
      type: 'work',
      duration: 30,
      target: 110,
      cadence: 100,
      name: `Cadence ${i + 1}/3 - fast`,
      coachingMessage: i === 0 ? "Spin the legs fast without forcing: it will help you hold 75-80 rpm on Villard-Reculas." : null
    });
    intervals.push({
      type: 'work',
      duration: 30,
      target: 95,
      cadence: 85,
      name: `Cadence ${i + 1}/3 - recovery`,
      coachingMessage: null
    });
  }
  
  // Segment 3: Threshold intervals (21:30 total)
  for (let i = 0; i < 4; i++) {
    intervals.push({
      type: 'work',
      duration: 240, // 4:00
      target: 158,
      cadence: 82,
      name: `Threshold ${i + 1}/4`,
      coachingMessage: i < 3 
        ? "You're at threshold, zone 4: the power you could hold about an hour all-out. Only a few words now, that's normal. Stay steady. Every rep raises your FTP."
        : "Last one! Your 162 W for 20 min on Villard-Reculas proves you're improving."
    });
    
    // Recovery after each threshold
    const isLastRecovery = (i === 3);
    intervals.push({
      type: 'recovery',
      duration: isLastRecovery ? 90 : 80, // Last recovery is 1:30, others 1:20
      target: 100,
      cadence: 85,
      name: 'Recovery',
      coachingMessage: "Well done! Breathe, relax your shoulders."
    });
  }
  
  // Segment 4: VO2 max intervals (4:30 total)
  for (let i = 0; i < 3; i++) {
    intervals.push({
      type: 'work',
      duration: 45,
      target: 175,
      cadence: 85,
      name: `VO2 ${i + 1}/3`,
      coachingMessage: i === 0 ? "Zone 5, VO2 max: breathing hard, but short. This is what helps you surge on climbs. Stay seated, your hamstring will thank you." : null
    });
    intervals.push({
      type: 'recovery',
      duration: 45,
      target: 95,
      cadence: 85,
      name: 'VO2 recovery',
      coachingMessage: null
    });
  }
  
  // Segment 5: Cool-down (3:00 total)
  intervals.push({
    type: 'cooldown',
    duration: 180, // 3:00
    targetStart: 110,
    targetEnd: 80,
    name: 'Cool-down',
    coachingMessage: "Back to zone 1, your heart rate comes down. Great session, 16 minutes at threshold!"
  });
  
  return {
    id: 'varied-threshold',
    name: 'Varied Threshold 35\' - Coached',
    description: 'Threshold, cadence work, and VO2 with coaching',
    totalDuration: intervals.reduce((sum, i) => sum + i.duration, 0),
    intervals,
    isTest: false
  };
}

// Format time as MM:SS
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
