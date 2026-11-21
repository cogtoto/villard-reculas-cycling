// Heart-rate helpers shared by the companion → PC telemetry path and TCX export.
// Keep the mapping here in sync with server/index.js (companion frames) and
// sensors.js (WS push of type=telemetry to the PC game).

export const HR_MAX_AGE_MS = 5000;

/** Return a rounded BPM when the reading is positive and fresh, else null. */
export function recentHeartRate(hr, lastUpdateMs, nowMs = Date.now(), maxAgeMs = HR_MAX_AGE_MS) {
  const n = Number(hr);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!lastUpdateMs || (nowMs - lastUpdateMs) >= maxAgeMs) return null;
  const bpm = Math.round(n);
  if (bpm < 1 || bpm > 255) return null;
  return bpm;
}

/**
 * Map a companion WebSocket frame to the telemetry object the 8787 server
 * broadcasts to the PC browser (type: 'telemetry', source starting with
 * 'companion'). Includes hr only when the strap sent a positive value.
 */
export function telemetryFromCompanion(m, { gradePct = 0, speedKmh = 0, ts = Date.now() } = {}) {
  const watts = Number(m.watts) || 0;
  const live = {
    type: 'telemetry',
    watts,
    cadence: Number(m.cadence) || 0,
    gradePct,
    speedKmh,
    source: 'companion' + (m.sensor ? ' ' + m.sensor : ''),
    ts,
  };
  if (m.hr !== null && m.hr !== undefined && Number(m.hr) > 0) {
    live.hr = Number(m.hr);
  }
  return live;
}

/**
 * PC-mode sensors.js forwards the telemetry message with spread, then main.js
 * does `state = { ...state, ...msg }`. Positive HR also stamps lastHrUpdate.
 */
export function applyTelemetryToGameState(state, msg, nowMs = Date.now()) {
  const next = { ...state, ...msg };
  let lastHrUpdate = state.lastHrUpdate || 0;
  if (msg.hr !== undefined && msg.hr !== null && Number(msg.hr) > 0) {
    next.hr = Number(msg.hr);
    lastHrUpdate = nowMs;
  }
  return { state: next, lastHrUpdate };
}
