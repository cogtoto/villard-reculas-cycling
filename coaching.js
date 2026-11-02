// Coaching messages system for workouts
// Shows contextual guidance, encouragement, and countdowns

// Get coaching message based on current workout state
export function getCoachingMessage(workout, current, actualWatts, elapsedInInterval, nextIntervalIn) {
  if (!current) return null;
  
  const interval = current.interval;
  const target = current.currentTarget;
  const performance = actualWatts / target; // Ratio of actual vs target
  
  // Message categories
  const messages = {
    // Interval start messages (explain purpose)
    intervalStart: getIntervalStartMessage(interval, workout),
    
    // Performance feedback
    performance: getPerformanceMessage(performance, interval),
    
    // Motivation based on progress
    motivation: getMotivationMessage(current, workout, elapsedInInterval),
    
    // Countdown before efforts
    countdown: getCountdownMessage(nextIntervalIn, current.nextInterval),
    
    // Technical coaching
    technique: getTechniqueMessage(interval, performance)
  };
  
  return messages;
}

// Messages at interval start (explain purpose and goals)
function getIntervalStartMessage(interval, workout) {
  const type = interval.type;
  const name = interval.name;
  
  if (type === 'warmup') {
    return [
      'Easy warmup - prepare your body gradually',
      'Warm up those legs - smooth and controlled',
      'Start easy - let your heart rate rise gently',
      'Warming up - find your rhythm'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (type === 'work' && workout.id === 'sweet-spot') {
    return [
      'Sweet Spot - high but sustainable effort',
      'Focus on smooth power - you can hold this!',
      'Sweet Spot zone - build your endurance',
      'Steady effort - this is where gains happen'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (type === 'work' && workout.id === 'explosive-power') {
    if (interval.rampIn) {
      return 'Ramp up - building to sprint power';
    }
    return [
      'SPRINT! Give it everything!',
      'Maximum effort - dig deep!',
      'All out - explosive power!',
      'PUSH! This is your moment!'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (type === 'ramp' && workout.isTest) {
    return [
      'Ramp continues - every second counts',
      'Keep pushing - building your FTP estimate',
      'Stay strong - each minute raises the bar',
      'Maintain cadence - rhythm is key'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (type === 'recovery') {
    return [
      'Recovery - spin easy, breathe deeply',
      'Active recovery - flush out the lactate',
      'Easy spin - prepare for the next effort',
      'Recover well - you\'ve earned this break'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (type === 'cooldown') {
    return [
      'Cool down - great job today!',
      'Cooling down - your body needs this',
      'Easy spin - you crushed it!',
      'Well done - finish strong but easy'
    ][Math.floor(Math.random() * 4)];
  }
  
  return `${name} - let's do this!`;
}

// Performance-based feedback
function getPerformanceMessage(performance, interval) {
  const type = interval.type;
  
  // Only give performance feedback during work intervals
  if (type !== 'work' && type !== 'ramp') return null;
  
  if (performance >= 0.95 && performance <= 1.05) {
    // On target
    return [
      'Perfect! Right on target',
      'Nailed it - keep this up!',
      'Excellent power control',
      'Spot on - you\'ve got this!'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (performance > 1.05 && performance <= 1.15) {
    // Slightly above target
    return [
      'Good power - but save some energy',
      'Strong! Just ease back a touch',
      'You\'re crushing it - maybe 5% less',
      'Great effort - stay sustainable'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (performance > 1.15) {
    // Way above target
    return [
      'Too hot! Ease back to target',
      'Dial it back - pace yourself',
      'Lower the power - this needs to be sustainable',
      'Too hard - match the target watts'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (performance >= 0.85 && performance < 0.95) {
    // Slightly below target
    return [
      'Almost there - push 5% more',
      'Close! Dig a little deeper',
      'You\'re near - find that extra bit',
      'Nearly perfect - bit more power!'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (performance < 0.85) {
    // Well below target
    return [
      'Need more power - push harder!',
      'Dig deep - get those watts up!',
      'You can do this - increase effort!',
      'Come on! Hit that target!'
    ][Math.floor(Math.random() * 4)];
  }
  
  return null;
}

// Motivational messages based on progress
function getMotivationMessage(current, workout, elapsedInInterval) {
  const index = current.index;
  const totalIntervals = workout.intervals.length;
  const intervalProgress = elapsedInInterval / current.interval.duration;
  const workoutProgress = (workout.totalDuration - current.totalRemaining) / workout.totalDuration;
  
  // Halfway through interval
  if (intervalProgress >= 0.48 && intervalProgress <= 0.52) {
    return [
      'Halfway through - you\'re doing great!',
      '50% done with this interval!',
      'Half done - keep that rhythm!',
      'Midpoint - stay focused!'
    ][Math.floor(Math.random() * 4)];
  }
  
  // Final 20% of interval
  if (intervalProgress >= 0.8 && current.interval.type === 'work') {
    return [
      'Almost done - finish strong!',
      'Final push - you\'ve got this!',
      '20 seconds left - hold on!',
      'Nearly there - don\'t fade now!'
    ][Math.floor(Math.random() * 4)];
  }
  
  // Last interval
  if (index === totalIntervals - 2 && current.interval.type === 'work') {
    return [
      'Last effort - make it count!',
      'Final rep - leave it all out there!',
      'One more - you\'ve got this!',
      'Last one - finish like a champion!'
    ][Math.floor(Math.random() * 4)];
  }
  
  // Halfway through workout
  if (workoutProgress >= 0.48 && workoutProgress <= 0.52) {
    return [
      'Halfway done - you\'re crushing it!',
      'You\'re at the midpoint - great work!',
      'Half finished - keep going strong!',
      '50% complete - outstanding effort!'
    ][Math.floor(Math.random() * 4)];
  }
  
  // Near end of workout (80%+)
  if (workoutProgress >= 0.8) {
    return [
      'Final stretch - you\'ve got this!',
      'Almost home - finish strong!',
      'You\'re nearly there - great job!',
      'Final minutes - proud of you!'
    ][Math.floor(Math.random() * 4)];
  }
  
  return null;
}

// Countdown messages before hard efforts
function getCountdownMessage(nextIntervalIn, nextInterval) {
  if (!nextInterval) return null;
  
  // Countdown for upcoming sprints/hard efforts
  if (nextInterval.type === 'work' && nextIntervalIn <= 10 && nextIntervalIn > 5) {
    return `Sprint in ${Math.ceil(nextIntervalIn)} seconds - get ready!`;
  }
  
  if (nextInterval.type === 'work' && nextIntervalIn <= 5 && nextIntervalIn > 0) {
    return `Sprint in ${Math.ceil(nextIntervalIn)}... prepare to GO!`;
  }
  
  // Countdown for recovery
  if (nextInterval.type === 'recovery' && nextIntervalIn <= 5 && nextIntervalIn > 0) {
    return `Recovery in ${Math.ceil(nextIntervalIn)} - you've earned it!`;
  }
  
  return null;
}

// Technical coaching (breathing, cadence, form)
function getTechniqueMessage(interval, performance) {
  const type = interval.type;
  
  if (type === 'warmup') {
    return [
      'Breathe easy - in through nose, out through mouth',
      'Find your natural cadence - 80-90 rpm is good',
      'Stay relaxed - loosen those shoulders',
      'Smooth pedal strokes - round and even'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (type === 'work' && performance >= 0.9) {
    return [
      'Breathe rhythmically - don\'t hold your breath!',
      'Keep cadence steady - 85-95 rpm sweet spot',
      'Relax your upper body - power from the legs',
      'Smooth and steady - no surging',
      'Focus on the road - stay in the zone'
    ][Math.floor(Math.random() * 5)];
  }
  
  if (type === 'ramp') {
    return [
      'Maintain cadence - don\'t let it drop!',
      'Keep breathing - deep and controlled',
      'Stay seated - smooth power',
      'Focus on rhythm - every pedal stroke counts'
    ][Math.floor(Math.random() * 4)];
  }
  
  if (type === 'recovery') {
    return [
      'Spin easy - let your legs recover',
      'Deep breaths - oxygen is your friend',
      'Stay loose - shake out your shoulders',
      'Keep moving - active recovery works best'
    ][Math.floor(Math.random() * 4)];
  }
  
  return null;
}

// Get special messages for FTP ramp test
export function getRampTestMessage(elapsed, powerHistory) {
  // Motivational messages throughout the test
  const messages = [
    'Every second counts - keep pushing!',
    'You\'re building your FTP - stay strong!',
    'This is hard - that\'s the point!',
    'Breathe and push - you\'ve got more!',
    'Don\'t give up - find your limit!',
    'Each minute is a new challenge - accept it!',
    'Your legs might burn - your mind is stronger!',
    'Push through - champions are made here!',
    'Feel the effort - embrace the challenge!',
    'One more minute - then one more!'
  ];
  
  // Rotate through encouraging messages
  const index = Math.floor(elapsed / 45) % messages.length;
  return messages[index];
}

// Message timing logic
let lastMessageTime = 0;
let lastIntervalIndex = -1;

export function shouldShowMessage(currentTime, intervalIndex, intervalElapsed) {
  const timeSinceLastMessage = currentTime - lastMessageTime;
  
  // Always show message at interval start
  if (intervalIndex !== lastIntervalIndex) {
    lastIntervalIndex = intervalIndex;
    lastMessageTime = currentTime;
    return { show: true, reason: 'intervalStart' };
  }
  
  // Show countdown messages (check every frame, don't update lastMessageTime)
  if (intervalElapsed > 0) {
    // These are high priority, show without updating timer
    return { show: true, reason: 'countdown', noTimerUpdate: true };
  }
  
  // Random interval between 20-40 seconds for regular messages
  const nextMessageDelay = 20000 + Math.random() * 20000; // 20-40s in ms
  
  if (timeSinceLastMessage >= nextMessageDelay) {
    lastMessageTime = currentTime;
    return { show: true, reason: 'regular' };
  }
  
  return { show: false };
}

// Reset timing when workout starts
export function resetCoachingTimer() {
  lastMessageTime = performance.now();
  lastIntervalIndex = -1;
}
